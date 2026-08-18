create table if not exists public.sales_command_decisions (
  id uuid primary key default gen_random_uuid(),
  item_fingerprint text not null unique,
  item_id text not null,
  item_kind text not null check (item_kind in ('buyer_reply','task','prospect_review','account_action')),
  contact_id uuid,
  item_title text not null,
  item_action text not null,
  item_reason text not null,
  outcome text not null check (outcome in ('completed','dismissed','deferred')),
  note text,
  defer_until date,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_command_decisions_defer_check check (
    (outcome='deferred' and defer_until is not null) or
    (outcome<>'deferred' and defer_until is null)
  )
);

create index if not exists sales_command_decisions_contact_idx on public.sales_command_decisions(contact_id,decided_at desc);
create index if not exists sales_command_decisions_outcome_idx on public.sales_command_decisions(outcome,defer_until);

alter table public.sales_command_decisions enable row level security;
revoke all on public.sales_command_decisions from public,anon,authenticated;

create or replace function public.record_sales_command_decision(
  p_actor_id uuid,
  p_item jsonb,
  p_outcome text,
  p_note text default null,
  p_defer_until date default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_fingerprint text;
  v_item_id text;
  v_item_kind text;
  v_title text;
  v_action text;
  v_reason text;
  v_contact_id uuid;
  v_row public.sales_command_decisions%rowtype;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then
    raise exception 'Sales access is required';
  end if;
  if p_outcome not in ('completed','dismissed','deferred') then raise exception 'Unsupported command decision'; end if;
  if p_outcome='deferred' and (p_defer_until is null or p_defer_until<=current_date) then raise exception 'Deferred command items require a future date'; end if;
  if p_outcome<>'deferred' and p_defer_until is not null then raise exception 'Only deferred command items may include a defer date'; end if;
  if p_outcome in ('dismissed','deferred') and (p_note is null or length(btrim(p_note))<3) then raise exception 'Dismissed or deferred command items require a short note'; end if;

  v_fingerprint=btrim(coalesce(p_item->>'fingerprint',''));
  v_item_id=btrim(coalesce(p_item->>'id',''));
  v_item_kind=btrim(coalesce(p_item->>'kind',''));
  v_title=btrim(coalesce(p_item->>'title',''));
  v_action=btrim(coalesce(p_item->>'action',''));
  v_reason=btrim(coalesce(p_item->>'reason',''));
  if v_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'Invalid command item fingerprint'; end if;
  if v_item_id='' or v_title='' or v_action='' or v_reason='' then raise exception 'Command item snapshot is incomplete'; end if;
  if v_item_kind not in ('buyer_reply','task','prospect_review','account_action') then raise exception 'Invalid command item kind'; end if;
  begin v_contact_id=nullif(p_item->>'contact_id','')::uuid; exception when invalid_text_representation then raise exception 'Invalid command contact id'; end;

  insert into public.sales_command_decisions(item_fingerprint,item_id,item_kind,contact_id,item_title,item_action,item_reason,outcome,note,defer_until,decided_by,decided_at,updated_at)
  values(v_fingerprint,v_item_id,v_item_kind,v_contact_id,v_title,v_action,v_reason,p_outcome,nullif(btrim(coalesce(p_note,'')),''),p_defer_until,p_actor_id,now(),now())
  on conflict(item_fingerprint) do update set
    item_id=excluded.item_id,item_kind=excluded.item_kind,contact_id=excluded.contact_id,item_title=excluded.item_title,item_action=excluded.item_action,item_reason=excluded.item_reason,
    outcome=excluded.outcome,note=excluded.note,defer_until=excluded.defer_until,decided_by=excluded.decided_by,decided_at=now(),updated_at=now()
  returning * into v_row;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('sales_command_decision_recorded','sales_command_item',v_row.item_fingerprint,p_actor_id,
    jsonb_build_object('item_id',v_row.item_id,'item_kind',v_row.item_kind,'contact_id',v_row.contact_id,'outcome',v_row.outcome,'defer_until',v_row.defer_until,'note',v_row.note));

  return jsonb_build_object('id',v_row.id,'item_fingerprint',v_row.item_fingerprint,'outcome',v_row.outcome,'defer_until',v_row.defer_until,'decided_at',v_row.decided_at);
end;
$$;

revoke all on function public.record_sales_command_decision(uuid,jsonb,text,text,date) from public,anon,authenticated;
grant execute on function public.record_sales_command_decision(uuid,jsonb,text,text,date) to service_role;
