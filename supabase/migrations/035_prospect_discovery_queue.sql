create table if not exists public.prospect_discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  normalized_company_name text not null,
  buyer_name text,
  job_title text,
  email text,
  normalized_email text,
  linkedin_url text,
  website text,
  city text,
  state text,
  category text,
  source_type text not null check (source_type in ('linkedin','company_website')),
  source_url text not null,
  source_note text not null,
  confidence text not null check (confidence in ('medium','high')),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  discovered_by uuid references auth.users(id) on delete set null,
  discovered_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  accepted_contact_id uuid references public.contacts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_url ~* '^https?://'),
  check (length(btrim(source_note)) >= 8)
);

create index if not exists prospect_discovery_status_idx
  on public.prospect_discovery_candidates(status, discovered_at desc);
create index if not exists prospect_discovery_email_idx
  on public.prospect_discovery_candidates(normalized_email)
  where normalized_email is not null;
create unique index if not exists prospect_discovery_identity_source_uidx
  on public.prospect_discovery_candidates(
    normalized_company_name,
    coalesce(normalized_email,''),
    coalesce(lower(buyer_name),''),
    source_url
  );

alter table public.prospect_discovery_candidates enable row level security;

create or replace function public.queue_prospect_discovery_candidate(
  p_actor_id uuid,
  p_candidate jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_company text := nullif(btrim(p_candidate->>'company_name'),'');
  v_email text := nullif(btrim(p_candidate->>'email'),'');
  v_source_type text := nullif(btrim(p_candidate->>'source_type'),'');
  v_source_url text := nullif(btrim(p_candidate->>'source_url'),'');
  v_source_note text := nullif(btrim(p_candidate->>'source_note'),'');
  v_confidence text := nullif(btrim(p_candidate->>'confidence'),'');
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;
  if v_company is null then raise exception 'Company name is required'; end if;
  if v_source_type not in ('linkedin','company_website') then raise exception 'Unsupported discovery source type'; end if;
  if v_source_url is null or v_source_url !~* '^https?://' then raise exception 'A reviewable HTTP(S) source is required'; end if;
  if v_source_note is null or length(v_source_note) < 8 then raise exception 'Source note must be at least 8 characters'; end if;
  if v_confidence not in ('medium','high') then raise exception 'Unsupported discovery confidence'; end if;

  insert into public.prospect_discovery_candidates(
    company_name, normalized_company_name, buyer_name, job_title, email, normalized_email,
    linkedin_url, website, city, state, category, source_type, source_url, source_note,
    confidence, discovered_by
  ) values (
    v_company,
    lower(regexp_replace(v_company,'\s+',' ','g')),
    nullif(btrim(p_candidate->>'buyer_name'),''),
    nullif(btrim(p_candidate->>'job_title'),''),
    v_email,
    case when v_email is null then null else lower(v_email) end,
    nullif(btrim(p_candidate->>'linkedin_url'),''),
    nullif(btrim(p_candidate->>'website'),''),
    nullif(btrim(p_candidate->>'city'),''),
    nullif(btrim(p_candidate->>'state'),''),
    nullif(btrim(p_candidate->>'category'),''),
    v_source_type,
    v_source_url,
    v_source_note,
    v_confidence,
    p_actor_id
  ) returning id into v_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    'prospect_discovery_queued',
    'prospect_discovery_candidate',
    v_id::text,
    p_actor_id,
    jsonb_build_object('company_name',v_company,'source_type',v_source_type,'confidence',v_confidence)
  );

  return v_id;
end;
$$;

create or replace function public.review_prospect_discovery_candidate(
  p_candidate_id uuid,
  p_actor_id uuid,
  p_decision text,
  p_review_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate public.prospect_discovery_candidates%rowtype;
  v_company_id uuid;
  v_contact_id uuid;
  v_created boolean := false;
  v_completeness text;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;
  if p_decision not in ('accept','reject') then raise exception 'Decision must be accept or reject'; end if;
  if p_review_note is null or length(btrim(p_review_note)) < 8 then raise exception 'Review note must be at least 8 characters'; end if;

  select * into v_candidate
  from public.prospect_discovery_candidates
  where id = p_candidate_id
  for update;

  if not found then raise exception 'Discovery candidate not found'; end if;
  if v_candidate.status <> 'pending' then raise exception 'Discovery candidate has already been reviewed'; end if;
  if v_candidate.source_url is null or v_candidate.source_url !~* '^https?://' then
    raise exception 'A reviewable source is required before acceptance';
  end if;

  if p_decision = 'reject' then
    update public.prospect_discovery_candidates set
      status='rejected', reviewed_by=p_actor_id, reviewed_at=now(), review_note=btrim(p_review_note), updated_at=now()
    where id=p_candidate_id;

    insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
    values('prospect_discovery_rejected','prospect_discovery_candidate',p_candidate_id::text,p_actor_id,
      jsonb_build_object('review_note',btrim(p_review_note)));

    return jsonb_build_object('candidate_id',p_candidate_id,'status','rejected');
  end if;

  if v_candidate.normalized_email is not null then
    select id into v_contact_id from public.contacts where normalized_email=v_candidate.normalized_email limit 1;
  end if;

  if v_contact_id is null then
    select id into v_company_id from public.companies where normalized_name=v_candidate.normalized_company_name limit 1;
    if v_company_id is null then
      insert into public.companies(name,normalized_name,website,city,state)
      values(v_candidate.company_name,v_candidate.normalized_company_name,v_candidate.website,v_candidate.city,v_candidate.state)
      returning id into v_company_id;
    end if;

    if v_candidate.buyer_name is not null then
      select id into v_contact_id
      from public.contacts
      where company_id=v_company_id and lower(coalesce(buyer_name,''))=lower(v_candidate.buyer_name)
      order by created_at asc
      limit 1;
    end if;
  end if;

  if v_contact_id is null then
    if v_company_id is null then
      select id into v_company_id from public.companies where normalized_name=v_candidate.normalized_company_name limit 1;
      if v_company_id is null then
        insert into public.companies(name,normalized_name,website,city,state)
        values(v_candidate.company_name,v_candidate.normalized_company_name,v_candidate.website,v_candidate.city,v_candidate.state)
        returning id into v_company_id;
      end if;
    end if;

    v_completeness := case
      when v_candidate.buyer_name is not null and v_candidate.email is not null and v_candidate.job_title is not null then 'complete'
      when v_candidate.buyer_name is not null and (v_candidate.email is not null or v_candidate.linkedin_url is not null) then 'usable'
      when v_candidate.buyer_name is not null or v_candidate.website is not null then 'needs_information'
      else 'minimal'
    end;

    insert into public.contacts(
      company_id,buyer_name,job_title,email,normalized_email,linkedin_url,website,city,state,category,notes,completeness
    ) values (
      v_company_id,v_candidate.buyer_name,v_candidate.job_title,v_candidate.email,v_candidate.normalized_email,
      v_candidate.linkedin_url,v_candidate.website,v_candidate.city,v_candidate.state,v_candidate.category,
      'Accepted from prospect discovery queue. ' || btrim(p_review_note),v_completeness
    ) returning id into v_contact_id;
    v_created := true;
  else
    update public.contacts set
      buyer_name=coalesce(buyer_name,v_candidate.buyer_name),
      job_title=coalesce(job_title,v_candidate.job_title),
      phone=phone,
      linkedin_url=coalesce(linkedin_url,v_candidate.linkedin_url),
      website=coalesce(website,v_candidate.website),
      city=coalesce(city,v_candidate.city),
      state=coalesce(state,v_candidate.state),
      category=coalesce(category,v_candidate.category),
      updated_at=now()
    where id=v_contact_id;
  end if;

  insert into public.contact_research_evidence(
    contact_id,source_type,source_url,confidence,research_note,researched_by
  ) values (
    v_contact_id,v_candidate.source_type,v_candidate.source_url,v_candidate.confidence,v_candidate.source_note,p_actor_id
  );

  update public.prospect_discovery_candidates set
    status='accepted', reviewed_by=p_actor_id, reviewed_at=now(), review_note=btrim(p_review_note),
    accepted_contact_id=v_contact_id, updated_at=now()
  where id=p_candidate_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    'prospect_discovery_accepted',
    'prospect_discovery_candidate',
    p_candidate_id::text,
    p_actor_id,
    jsonb_build_object('contact_id',v_contact_id,'created_contact',v_created,'source_url',v_candidate.source_url)
  );

  return jsonb_build_object(
    'candidate_id',p_candidate_id,
    'status','accepted',
    'contact_id',v_contact_id,
    'created_contact',v_created
  );
end;
$$;

revoke all on function public.queue_prospect_discovery_candidate(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.queue_prospect_discovery_candidate(uuid,jsonb) to service_role;
revoke all on function public.review_prospect_discovery_candidate(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.review_prospect_discovery_candidate(uuid,uuid,text,text) to service_role;
