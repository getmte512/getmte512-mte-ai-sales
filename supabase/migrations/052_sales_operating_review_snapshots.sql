create table if not exists public.sales_operating_review_snapshots (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period in ('week','month')),
  as_of_date date not null,
  current_start date not null,
  current_end date not null,
  previous_start date not null,
  previous_end date not null,
  review_payload jsonb not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique(period,as_of_date),
  check (current_start<=current_end and previous_start<=previous_end and previous_end<current_start)
);

create index if not exists sales_operating_review_snapshots_recorded_idx on public.sales_operating_review_snapshots(recorded_at desc);
alter table public.sales_operating_review_snapshots enable row level security;
revoke all on public.sales_operating_review_snapshots from public,anon,authenticated;

create or replace function public.record_sales_operating_review_snapshot(
  p_actor_id uuid,
  p_period text,
  p_as_of_date date,
  p_current_start date,
  p_current_end date,
  p_previous_start date,
  p_previous_end date,
  p_review_payload jsonb,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_existing public.sales_operating_review_snapshots%rowtype;
  v_row public.sales_operating_review_snapshots%rowtype;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then raise exception 'Sales access is required'; end if;
  if p_period not in ('week','month') then raise exception 'Unsupported operating review period'; end if;
  if p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then raise exception 'A SHA-256 snapshot hash is required'; end if;
  if p_review_payload is null or jsonb_typeof(p_review_payload)<>'object' then raise exception 'Operating review payload is required'; end if;
  if p_current_end<>p_as_of_date then raise exception 'Current review window must end on the snapshot as-of date'; end if;
  if p_current_start>p_current_end or p_previous_start>p_previous_end or p_previous_end>=p_current_start then raise exception 'Operating review windows are invalid'; end if;

  select * into v_existing from public.sales_operating_review_snapshots where period=p_period and as_of_date=p_as_of_date;
  if found then
    if v_existing.payload_hash<>p_payload_hash then raise exception 'Historical operating review snapshot is immutable and does not match current evidence'; end if;
    return jsonb_build_object('id',v_existing.id,'already_recorded',true,'payload_hash',v_existing.payload_hash,'recorded_at',v_existing.recorded_at);
  end if;

  insert into public.sales_operating_review_snapshots(period,as_of_date,current_start,current_end,previous_start,previous_end,review_payload,payload_hash,recorded_by)
  values(p_period,p_as_of_date,p_current_start,p_current_end,p_previous_start,p_previous_end,p_review_payload,p_payload_hash,p_actor_id)
  returning * into v_row;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('sales_operating_review_snapshot_recorded','sales_operating_review_snapshot',v_row.id::text,p_actor_id,jsonb_build_object('period',v_row.period,'as_of_date',v_row.as_of_date,'payload_hash',v_row.payload_hash));

  return jsonb_build_object('id',v_row.id,'already_recorded',false,'payload_hash',v_row.payload_hash,'recorded_at',v_row.recorded_at);
end;
$$;

revoke all on function public.record_sales_operating_review_snapshot(uuid,text,date,date,date,date,date,jsonb,text) from public,anon,authenticated;
grant execute on function public.record_sales_operating_review_snapshot(uuid,text,date,date,date,date,date,jsonb,text) to service_role;
