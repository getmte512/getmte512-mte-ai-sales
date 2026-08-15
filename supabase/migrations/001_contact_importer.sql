create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  website text,
  domain text,
  city text,
  state text,
  distributor text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists companies_normalized_name_uidx on public.companies(normalized_name);

create table if not exists public.store_banners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  unique(company_id, normalized_name)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  store_banner_id uuid references public.store_banners(id) on delete set null,
  buyer_name text,
  job_title text,
  email text,
  normalized_email text,
  phone text,
  linkedin_url text,
  website text,
  city text,
  state text,
  category text,
  distributor text,
  notes text,
  completeness text not null check (completeness in ('complete','usable','needs_information','minimal')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists contacts_normalized_email_uidx on public.contacts(normalized_email) where normalized_email is not null;
create index if not exists contacts_company_idx on public.contacts(company_id);
create index if not exists contacts_buyer_name_idx on public.contacts(lower(buyer_name));

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'completed',
  total_rows integer not null,
  imported_rows integer not null,
  skipped_rows integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete restrict,
  source_row integer not null,
  contact_id uuid references public.contacts(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now(),
  unique(import_id, source_row)
);

create table if not exists public.contact_email_history (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete restrict,
  import_id uuid not null references public.imports(id) on delete restrict,
  delivery_status text,
  opened boolean not null default false,
  clicked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.suppressions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete restrict,
  channel text not null default 'email',
  reason text not null,
  source_import_id uuid references public.imports(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(contact_id, channel)
);

alter table public.companies enable row level security;
alter table public.store_banners enable row level security;
alter table public.contacts enable row level security;
alter table public.imports enable row level security;
alter table public.import_rows enable row level security;
alter table public.contact_email_history enable row level security;
alter table public.suppressions enable row level security;

create or replace view public.contact_crm with (security_invoker = true) as
select c.id, c.buyer_name, c.job_title, c.email, c.phone, c.linkedin_url, c.website,
       c.city, c.state, c.category, c.distributor, c.notes, c.completeness,
       co.name as company_name, sb.name as store_banner_name, c.created_at,
       case when s.id is not null then 'suppressed'
            when lower(coalesce(h.delivery_status,'')) = 'soft bounced' then 'delivery_risk'
            when lower(coalesce(h.delivery_status,'')) = 'delivered' then 'historically_delivered'
            else 'unverified' end as email_health
from public.contacts c
join public.companies co on co.id = c.company_id
left join public.store_banners sb on sb.id = c.store_banner_id
left join lateral (select * from public.contact_email_history h2 where h2.contact_id = c.id order by h2.created_at desc limit 1) h on true
left join public.suppressions s on s.contact_id = c.id and s.channel = 'email'
where c.archived_at is null;

create or replace function public.commit_contact_import(p_filename text, p_uploaded_by uuid, p_contacts jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_import_id uuid;
  v_item jsonb;
  v_company_id uuid;
  v_banner_id uuid;
  v_contact_id uuid;
  v_existing_id uuid;
  v_imported integer := 0;
  v_updated integer := 0;
begin
  if jsonb_array_length(p_contacts) > 50000 then raise exception 'Import exceeds row limit'; end if;
  if not exists(select 1 from auth.users where id=p_uploaded_by) then raise exception 'Invalid uploader'; end if;
  insert into imports(filename,uploaded_by,total_rows,imported_rows) values (left(p_filename,255),p_uploaded_by,jsonb_array_length(p_contacts),0) returning id into v_import_id;
  for v_item in select * from jsonb_array_elements(p_contacts) loop
    insert into companies(name,normalized_name,website,city,state,distributor)
    values (coalesce(nullif(v_item->>'company',''),nullif(v_item->>'store_banner','')),lower(regexp_replace(coalesce(nullif(v_item->>'company',''),nullif(v_item->>'store_banner','')),'\s+',' ','g')),nullif(v_item->>'website',''),nullif(v_item->>'city',''),nullif(v_item->>'state',''),nullif(v_item->>'distributor',''))
    on conflict(normalized_name) do update set updated_at=now()
    returning id into v_company_id;

    v_banner_id := null;
    if coalesce(v_item->>'store_banner','') <> '' then
      insert into store_banners(company_id,name,normalized_name)
      values(v_company_id,v_item->>'store_banner',lower(regexp_replace(v_item->>'store_banner','\s+',' ','g')))
      on conflict(company_id,normalized_name) do update set name=excluded.name
      returning id into v_banner_id;
    end if;

    v_existing_id := null;
    if coalesce(v_item->>'email','') <> '' then select id into v_existing_id from contacts where normalized_email=lower(v_item->>'email'); end if;
    if v_existing_id is null then
      insert into contacts(company_id,store_banner_id,buyer_name,job_title,email,normalized_email,phone,linkedin_url,website,city,state,category,distributor,notes,completeness)
      values(v_company_id,v_banner_id,nullif(v_item->>'buyer_name',''),nullif(v_item->>'job_title',''),nullif(v_item->>'email',''),nullif(lower(v_item->>'email'),''),nullif(v_item->>'phone',''),nullif(v_item->>'linkedin_url',''),nullif(v_item->>'website',''),nullif(v_item->>'city',''),nullif(v_item->>'state',''),nullif(v_item->>'category',''),nullif(v_item->>'distributor',''),nullif(v_item->>'notes',''),v_item->>'completeness') returning id into v_contact_id;
      v_imported := v_imported + 1;
    else
      v_contact_id := v_existing_id;
      update contacts set
        buyer_name=coalesce(buyer_name,nullif(v_item->>'buyer_name','')),
        job_title=coalesce(job_title,nullif(v_item->>'job_title','')),
        phone=coalesce(phone,nullif(v_item->>'phone','')),
        linkedin_url=coalesce(linkedin_url,nullif(v_item->>'linkedin_url','')),
        website=coalesce(website,nullif(v_item->>'website','')),
        city=coalesce(city,nullif(v_item->>'city','')),
        state=coalesce(state,nullif(v_item->>'state','')),
        category=coalesce(category,nullif(v_item->>'category','')),
        distributor=coalesce(distributor,nullif(v_item->>'distributor','')),
        notes=case when contacts.notes is null then nullif(v_item->>'notes','') else contacts.notes end,
        updated_at=now() where id=v_contact_id;
      v_updated := v_updated + 1;
    end if;
    insert into import_rows(import_id,source_row,contact_id,action) values(v_import_id,(v_item->>'source_row')::integer,v_contact_id,case when v_existing_id is null then 'created' else 'updated_missing_fields' end);
    insert into contact_email_history(contact_id,import_id,delivery_status,opened,clicked) values(v_contact_id,v_import_id,nullif(v_item->>'email_status',''),coalesce((v_item->>'opened')::boolean,false),coalesce((v_item->>'clicked')::boolean,false));
    if v_item->>'suppression_reason' is not null and v_item->>'suppression_reason' <> '' then
      insert into suppressions(contact_id,reason,source_import_id) values(v_contact_id,v_item->>'suppression_reason',v_import_id)
      on conflict(contact_id,channel) do nothing;
    end if;
  end loop;
  update imports set imported_rows=v_imported, skipped_rows=v_updated where id=v_import_id;
  return jsonb_build_object('import_id',v_import_id,'imported',v_imported,'updated',v_updated);
exception when others then raise;
end $$;

revoke all on function public.commit_contact_import(text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.commit_contact_import(text,uuid,jsonb) to service_role;
