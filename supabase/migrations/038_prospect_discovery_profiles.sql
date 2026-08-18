create table if not exists public.prospect_discovery_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  criteria text not null,
  default_limit integer not null default 5 check (default_limit between 1 and 10),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(name)) between 2 and 120),
  check (length(btrim(criteria)) between 8 and 1000)
);

create unique index if not exists prospect_discovery_profiles_name_uidx
  on public.prospect_discovery_profiles(lower(name));

alter table public.prospect_discovery_profiles enable row level security;

create or replace function public.save_prospect_discovery_profile(
  p_actor_id uuid,
  p_name text,
  p_criteria text,
  p_default_limit integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then
    raise exception 'Sales access is required';
  end if;
  if p_name is null or length(btrim(p_name)) < 2 or length(btrim(p_name)) > 120 then raise exception 'Profile name must be 2-120 characters'; end if;
  if p_criteria is null or length(btrim(p_criteria)) < 8 or length(btrim(p_criteria)) > 1000 then raise exception 'Criteria must be 8-1000 characters'; end if;
  if p_default_limit < 1 or p_default_limit > 10 then raise exception 'Default limit must be between 1 and 10'; end if;

  insert into public.prospect_discovery_profiles(name,criteria,default_limit,created_by)
  values(btrim(p_name),btrim(p_criteria),p_default_limit,p_actor_id)
  on conflict ((lower(name))) do update set
    criteria=excluded.criteria,
    default_limit=excluded.default_limit,
    updated_at=now()
  returning id into v_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('prospect_discovery_profile_saved','prospect_discovery_profile',v_id::text,p_actor_id,
    jsonb_build_object('name',btrim(p_name),'default_limit',p_default_limit));
  return v_id;
end;
$$;

create or replace function public.delete_prospect_discovery_profile(
  p_actor_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then
    raise exception 'Sales access is required';
  end if;
  delete from public.prospect_discovery_profiles where id=p_profile_id returning name into v_name;
  if v_name is null then raise exception 'Prospect discovery profile not found'; end if;
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('prospect_discovery_profile_deleted','prospect_discovery_profile',p_profile_id::text,p_actor_id,jsonb_build_object('name',v_name));
end;
$$;

revoke all on function public.save_prospect_discovery_profile(uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.save_prospect_discovery_profile(uuid,text,text,integer) to service_role;
revoke all on function public.delete_prospect_discovery_profile(uuid,uuid) from public, anon, authenticated;
grant execute on function public.delete_prospect_discovery_profile(uuid,uuid) to service_role;
