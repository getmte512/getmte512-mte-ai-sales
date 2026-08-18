create or replace function public.start_prospect_discovery_search_budgeted(
  p_actor_id uuid,
  p_criteria text,
  p_requested_limit integer,
  p_model text,
  p_max_searches_per_day integer,
  p_max_candidates_per_day integer,
  p_cooldown_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_searches_today integer;
  v_candidates_today integer;
  v_last_search_at timestamptz;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then raise exception 'Sales access is required'; end if;
  if p_criteria is null or length(btrim(p_criteria)) < 8 or length(btrim(p_criteria)) > 1000 then raise exception 'Search criteria must be 8-1000 characters'; end if;
  if p_requested_limit < 1 or p_requested_limit > 10 then raise exception 'Requested limit must be between 1 and 10'; end if;
  if p_model is null or btrim(p_model)='' then raise exception 'Search model is required'; end if;
  if p_max_searches_per_day < 1 or p_max_candidates_per_day < 1 or p_cooldown_seconds < 1 then raise exception 'Prospect discovery budget configuration is invalid'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text,0));

  select count(*),coalesce(sum(requested_limit),0),max(created_at)
  into v_searches_today,v_candidates_today,v_last_search_at
  from public.prospect_discovery_search_runs
  where requested_by=p_actor_id and created_at>=date_trunc('day',now());

  if v_searches_today >= p_max_searches_per_day then raise exception 'PROSPECT_DISCOVERY_BUDGET: daily search limit reached'; end if;
  if v_candidates_today + p_requested_limit > p_max_candidates_per_day then raise exception 'PROSPECT_DISCOVERY_BUDGET: daily candidate budget would be exceeded'; end if;
  if v_last_search_at is not null and v_last_search_at > now() - make_interval(secs=>p_cooldown_seconds) then raise exception 'PROSPECT_DISCOVERY_BUDGET: search cooldown is active'; end if;

  insert into public.prospect_discovery_search_runs(criteria,requested_limit,model,requested_by)
  values(btrim(p_criteria),p_requested_limit,btrim(p_model),p_actor_id)
  returning id into v_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('prospect_discovery_search_started','prospect_discovery_search_run',v_id::text,p_actor_id,
    jsonb_build_object('requested_limit',p_requested_limit,'model',btrim(p_model),'budgeted',true));
  return v_id;
end;
$$;

create or replace function public.start_prospect_discovery_search_for_profile_budgeted(
  p_actor_id uuid,
  p_profile_id uuid,
  p_model text,
  p_max_searches_per_day integer,
  p_max_candidates_per_day integer,
  p_cooldown_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.prospect_discovery_profiles%rowtype;
  v_id uuid;
  v_searches_today integer;
  v_candidates_today integer;
  v_last_search_at timestamptz;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then raise exception 'Sales access is required'; end if;
  if p_model is null or btrim(p_model)='' then raise exception 'Search model is required'; end if;
  if p_max_searches_per_day < 1 or p_max_candidates_per_day < 1 or p_cooldown_seconds < 1 then raise exception 'Prospect discovery budget configuration is invalid'; end if;
  select * into v_profile from public.prospect_discovery_profiles where id=p_profile_id;
  if not found then raise exception 'Prospect discovery profile not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text,0));
  select count(*),coalesce(sum(requested_limit),0),max(created_at)
  into v_searches_today,v_candidates_today,v_last_search_at
  from public.prospect_discovery_search_runs
  where requested_by=p_actor_id and created_at>=date_trunc('day',now());

  if v_searches_today >= p_max_searches_per_day then raise exception 'PROSPECT_DISCOVERY_BUDGET: daily search limit reached'; end if;
  if v_candidates_today + v_profile.default_limit > p_max_candidates_per_day then raise exception 'PROSPECT_DISCOVERY_BUDGET: daily candidate budget would be exceeded'; end if;
  if v_last_search_at is not null and v_last_search_at > now() - make_interval(secs=>p_cooldown_seconds) then raise exception 'PROSPECT_DISCOVERY_BUDGET: search cooldown is active'; end if;

  insert into public.prospect_discovery_search_runs(criteria,requested_limit,model,requested_by,profile_id)
  values(v_profile.criteria,v_profile.default_limit,btrim(p_model),p_actor_id,v_profile.id)
  returning id into v_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('prospect_discovery_search_started','prospect_discovery_search_run',v_id::text,p_actor_id,
    jsonb_build_object('requested_limit',v_profile.default_limit,'model',btrim(p_model),'profile_id',v_profile.id,'profile_name',v_profile.name,'budgeted',true));
  return v_id;
end;
$$;

revoke all on function public.start_prospect_discovery_search_budgeted(uuid,text,integer,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.start_prospect_discovery_search_budgeted(uuid,text,integer,text,integer,integer,integer) to service_role;
revoke all on function public.start_prospect_discovery_search_for_profile_budgeted(uuid,uuid,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.start_prospect_discovery_search_for_profile_budgeted(uuid,uuid,text,integer,integer,integer) to service_role;
