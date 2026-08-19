create table if not exists public.sales_operating_targets (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period in ('week','month')),
  metric text not null check (metric in ('revenue','orders','outreachDelivered','buyerReplies','tasksCompleted','prospectsAccepted','samplesDelivered','commandCardsCompleted')),
  target_value numeric not null check (target_value >= 0),
  effective_from date not null,
  effective_to date,
  note text not null check (char_length(trim(note)) >= 4),
  set_by uuid not null references auth.users(id),
  set_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);
create unique index if not exists sales_operating_targets_one_active_idx on public.sales_operating_targets(period,metric) where effective_to is null;
create index if not exists sales_operating_targets_history_idx on public.sales_operating_targets(period,metric,effective_from desc,set_at desc);
revoke all on public.sales_operating_targets from anon,authenticated;
grant select on public.sales_operating_targets to service_role;

create or replace function public.set_sales_operating_target(p_actor_id uuid,p_period text,p_metric text,p_target_value numeric,p_effective_from date,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_hawaii_today date:=(now() at time zone 'Pacific/Honolulu')::date;
begin
 if p_period not in ('week','month') then raise exception 'Invalid target period'; end if;
 if p_metric not in ('revenue','orders','outreachDelivered','buyerReplies','tasksCompleted','prospectsAccepted','samplesDelivered','commandCardsCompleted') then raise exception 'Invalid target metric'; end if;
 if p_target_value < 0 then raise exception 'Target must be nonnegative'; end if;
 if p_effective_from<>v_hawaii_today then raise exception 'Operating targets may only be changed for the current Hawaii operating date'; end if;
 if char_length(trim(coalesce(p_note,''))) < 4 then raise exception 'Target note is required'; end if;
 if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator access is required'; end if;
 perform pg_advisory_xact_lock(hashtext('sales_operating_target:'||p_period||':'||p_metric));
 update public.sales_operating_targets set effective_to=p_effective_from where period=p_period and metric=p_metric and effective_to is null;
 insert into public.sales_operating_targets(period,metric,target_value,effective_from,note,set_by) values(p_period,p_metric,p_target_value,p_effective_from,trim(p_note),p_actor_id) returning id into v_id;
 insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata) values('sales_operating_target_set','sales_operating_target',v_id::text,p_actor_id,jsonb_build_object('period',p_period,'metric',p_metric,'target_value',p_target_value,'effective_from',p_effective_from,'note',trim(p_note)));
 return v_id;
end$$;
revoke all on function public.set_sales_operating_target(uuid,text,text,numeric,date,text) from public,anon,authenticated;
grant execute on function public.set_sales_operating_target(uuid,text,text,numeric,date,text) to service_role;
