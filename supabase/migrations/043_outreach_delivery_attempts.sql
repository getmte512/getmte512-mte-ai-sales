create table if not exists public.outreach_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.outreach_delivery_intents(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  provider text not null,
  idempotency_key text not null unique,
  status text not null default 'claimed' check (status in ('claimed','succeeded','failed')),
  claimed_by uuid not null references auth.users(id) on delete restrict,
  claimed_at timestamptz not null default now(),
  finished_at timestamptz,
  provider_message_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(intent_id, attempt_number),
  check ((status = 'claimed' and finished_at is null) or (status <> 'claimed' and finished_at is not null)),
  check ((status <> 'succeeded') or provider_message_id is not null)
);

create index if not exists outreach_delivery_attempts_intent_idx
  on public.outreach_delivery_attempts(intent_id, attempt_number desc);
create index if not exists outreach_delivery_attempts_status_idx
  on public.outreach_delivery_attempts(status, claimed_at desc);
create unique index if not exists outreach_delivery_attempts_provider_message_uidx
  on public.outreach_delivery_attempts(provider_message_id)
  where provider_message_id is not null;

alter table public.outreach_delivery_attempts enable row level security;

create or replace function public.claim_outreach_delivery_attempt(
  p_intent_id uuid,
  p_actor_id uuid,
  p_provider text,
  p_claim_ttl_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.outreach_delivery_intents%rowtype;
  v_active public.outreach_delivery_attempts%rowtype;
  v_attempt public.outreach_delivery_attempts%rowtype;
  v_attempt_number integer;
  v_idempotency_key text;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;
  if p_provider is null or length(btrim(p_provider)) < 2 then raise exception 'Delivery provider is required'; end if;
  if p_claim_ttl_seconds < 30 or p_claim_ttl_seconds > 1800 then raise exception 'Delivery claim TTL must be between 30 and 1800 seconds'; end if;

  select * into v_intent from public.outreach_delivery_intents where id=p_intent_id for update;
  if not found then raise exception 'Delivery intent not found'; end if;
  if v_intent.status = 'delivered' then
    return jsonb_build_object('intent_id',v_intent.id,'status','delivered','already_delivered',true);
  end if;
  if v_intent.status <> 'prepared' then raise exception 'Delivery intent is not ready for provider delivery'; end if;
  if v_intent.channel <> 'email' then raise exception 'Provider delivery is enabled only for email'; end if;

  select * into v_active
  from public.outreach_delivery_attempts
  where intent_id=p_intent_id and status='claimed'
  order by attempt_number desc
  limit 1
  for update;

  if found and v_active.claimed_at >= now() - make_interval(secs => p_claim_ttl_seconds) then
    return jsonb_build_object(
      'intent_id',p_intent_id,
      'attempt_id',v_active.id,
      'attempt_number',v_active.attempt_number,
      'idempotency_key',v_active.idempotency_key,
      'status','claimed',
      'already_claimed',true
    );
  end if;

  if found then
    update public.outreach_delivery_attempts
    set status='failed',finished_at=now(),error_code='claim_expired',error_message='Provider delivery claim expired before completion.',updated_at=now()
    where id=v_active.id and status='claimed';
  end if;

  select coalesce(max(attempt_number),0)+1 into v_attempt_number
  from public.outreach_delivery_attempts
  where intent_id=p_intent_id;

  v_idempotency_key := 'mte-outreach-' || replace(p_intent_id::text,'-','') || '-' || v_attempt_number::text;

  insert into public.outreach_delivery_attempts(intent_id,attempt_number,provider,idempotency_key,claimed_by)
  values(p_intent_id,v_attempt_number,btrim(p_provider),v_idempotency_key,p_actor_id)
  returning * into v_attempt;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('outreach_delivery_attempt_claimed','outreach_delivery_attempt',v_attempt.id::text,p_actor_id,
    jsonb_build_object('intent_id',p_intent_id,'attempt_number',v_attempt_number,'provider',btrim(p_provider),'idempotency_key',v_idempotency_key));

  return jsonb_build_object(
    'intent_id',p_intent_id,
    'attempt_id',v_attempt.id,
    'attempt_number',v_attempt.attempt_number,
    'idempotency_key',v_attempt.idempotency_key,
    'status',v_attempt.status,
    'already_claimed',false
  );
end;
$$;

create or replace function public.finish_outreach_delivery_attempt(
  p_attempt_id uuid,
  p_actor_id uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_error_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.outreach_delivery_attempts%rowtype;
  v_confirm jsonb;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;
  if p_status not in ('succeeded','failed') then raise exception 'Attempt status must be succeeded or failed'; end if;
  if p_status='succeeded' and (p_provider_message_id is null or length(btrim(p_provider_message_id))=0) then
    raise exception 'Provider message id is required for a successful delivery attempt';
  end if;

  select * into v_attempt from public.outreach_delivery_attempts where id=p_attempt_id for update;
  if not found then raise exception 'Delivery attempt not found'; end if;

  if v_attempt.status <> 'claimed' then
    return jsonb_build_object(
      'attempt_id',v_attempt.id,
      'intent_id',v_attempt.intent_id,
      'status',v_attempt.status,
      'already_finished',true,
      'provider_message_id',v_attempt.provider_message_id
    );
  end if;

  if p_status='failed' then
    update public.outreach_delivery_attempts
    set status='failed',finished_at=now(),error_code=nullif(btrim(p_error_code),''),error_message=nullif(btrim(p_error_message),''),updated_at=now()
    where id=p_attempt_id
    returning * into v_attempt;

    insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
    values('outreach_delivery_attempt_failed','outreach_delivery_attempt',v_attempt.id::text,p_actor_id,
      jsonb_build_object('intent_id',v_attempt.intent_id,'attempt_number',v_attempt.attempt_number,'provider',v_attempt.provider,'error_code',v_attempt.error_code));

    return jsonb_build_object('attempt_id',v_attempt.id,'intent_id',v_attempt.intent_id,'status','failed','already_finished',false);
  end if;

  v_confirm := public.confirm_outreach_delivery_intent(v_attempt.intent_id,p_actor_id,'provider',btrim(p_provider_message_id),'Provider delivery confirmed from a completed delivery attempt.');

  update public.outreach_delivery_attempts
  set status='succeeded',finished_at=now(),provider_message_id=btrim(p_provider_message_id),error_code=null,error_message=null,updated_at=now()
  where id=p_attempt_id
  returning * into v_attempt;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('outreach_delivery_attempt_succeeded','outreach_delivery_attempt',v_attempt.id::text,p_actor_id,
    jsonb_build_object('intent_id',v_attempt.intent_id,'attempt_number',v_attempt.attempt_number,'provider',v_attempt.provider,'provider_message_id',v_attempt.provider_message_id));

  return jsonb_build_object(
    'attempt_id',v_attempt.id,
    'intent_id',v_attempt.intent_id,
    'status','succeeded',
    'already_finished',false,
    'provider_message_id',v_attempt.provider_message_id,
    'delivery',v_confirm
  );
end;
$$;

revoke all on function public.claim_outreach_delivery_attempt(uuid,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.claim_outreach_delivery_attempt(uuid,uuid,text,integer) to service_role;
revoke all on function public.finish_outreach_delivery_attempt(uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.finish_outreach_delivery_attempt(uuid,uuid,text,text,text,text) to service_role;
