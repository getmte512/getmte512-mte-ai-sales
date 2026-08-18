alter table public.outreach_delivery_attempts
  drop constraint if exists outreach_delivery_attempts_idempotency_key_key;

create index if not exists outreach_delivery_attempts_idempotency_idx
  on public.outreach_delivery_attempts(idempotency_key);

update public.outreach_delivery_attempts
set idempotency_key='mte-outreach-' || replace(intent_id::text,'-','');

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

  v_idempotency_key := 'mte-outreach-' || replace(p_intent_id::text,'-','');

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
