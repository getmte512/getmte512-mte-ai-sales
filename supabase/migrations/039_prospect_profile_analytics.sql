alter table public.prospect_discovery_search_runs
  add column if not exists profile_id uuid references public.prospect_discovery_profiles(id) on delete set null;

create index if not exists prospect_discovery_search_profile_idx
  on public.prospect_discovery_search_runs(profile_id, created_at desc)
  where profile_id is not null;

create or replace function public.start_prospect_discovery_search_for_profile(
  p_actor_id uuid,
  p_profile_id uuid,
  p_model text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.prospect_discovery_profiles%rowtype;
  v_id uuid;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id=p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;
  if p_model is null or btrim(p_model)='' then raise exception 'Search model is required'; end if;

  select * into v_profile from public.prospect_discovery_profiles where id=p_profile_id;
  if not found then raise exception 'Prospect discovery profile not found'; end if;

  insert into public.prospect_discovery_search_runs(criteria,requested_limit,model,requested_by,profile_id)
  values(v_profile.criteria,v_profile.default_limit,btrim(p_model),p_actor_id,v_profile.id)
  returning id into v_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('prospect_discovery_search_started','prospect_discovery_search_run',v_id::text,p_actor_id,
    jsonb_build_object('requested_limit',v_profile.default_limit,'model',btrim(p_model),'profile_id',v_profile.id,'profile_name',v_profile.name));

  return v_id;
end;
$$;

revoke all on function public.start_prospect_discovery_search_for_profile(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.start_prospect_discovery_search_for_profile(uuid,uuid,text) to service_role;
