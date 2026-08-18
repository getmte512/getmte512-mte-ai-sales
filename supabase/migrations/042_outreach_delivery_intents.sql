create table if not exists public.outreach_delivery_intents (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.outreach_drafts(id) on delete restrict,
  contact_id uuid not null references public.contacts(id) on delete restrict,
  channel text not null check (channel in ('email')),
  recipient text not null,
  subject text not null,
  body text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'prepared' check (status in ('prepared','delivered','cancelled')),
  prepared_by uuid not null references auth.users(id) on delete restrict,
  prepared_at timestamptz not null default now(),
  delivered_by uuid references auth.users(id) on delete restrict,
  delivered_at timestamptz,
  delivery_method text check (delivery_method in ('manual','provider')),
  provider_message_id text,
  confirmation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status <> 'delivered') or (delivered_by is not null and delivered_at is not null and delivery_method is not null))
);

create index if not exists outreach_delivery_intents_status_idx
  on public.outreach_delivery_intents(status, prepared_at desc);
create unique index if not exists outreach_delivery_provider_message_uidx
  on public.outreach_delivery_intents(provider_message_id)
  where provider_message_id is not null;

alter table public.outreach_delivery_intents enable row level security;

create or replace function public.prepare_outreach_delivery_intent(
  p_draft_id uuid,
  p_actor_id uuid,
  p_content_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.outreach_drafts%rowtype;
  v_recipient text;
  v_intent public.outreach_delivery_intents%rowtype;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;

  if p_content_hash is null or p_content_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'A SHA-256 content hash is required';
  end if;

  select * into v_draft
  from public.outreach_drafts
  where id = p_draft_id
  for update;

  if not found then raise exception 'Outreach draft not found'; end if;
  if v_draft.status <> 'approved' then raise exception 'Only approved outreach can be prepared for delivery'; end if;
  if v_draft.channel <> 'email' then raise exception 'Only email delivery is supported in this milestone slice'; end if;

  select email into v_recipient from public.contacts where id = v_draft.contact_id;
  if v_recipient is null or length(btrim(v_recipient)) = 0 then raise exception 'Contact email is required for delivery'; end if;

  if exists(
    select 1 from public.suppressions
    where contact_id = v_draft.contact_id and channel = 'email'
  ) then
    raise exception 'Contact is suppressed for email outreach';
  end if;

  select * into v_intent
  from public.outreach_delivery_intents
  where draft_id = p_draft_id;

  if found then
    if v_intent.content_hash <> p_content_hash then
      raise exception 'Prepared delivery content does not match the approved draft';
    end if;
    return jsonb_build_object(
      'intent_id',v_intent.id,
      'status',v_intent.status,
      'recipient',v_intent.recipient,
      'content_hash',v_intent.content_hash,
      'already_prepared',true
    );
  end if;

  insert into public.outreach_delivery_intents(
    draft_id,contact_id,channel,recipient,subject,body,content_hash,prepared_by
  ) values (
    v_draft.id,v_draft.contact_id,v_draft.channel,lower(btrim(v_recipient)),v_draft.subject,v_draft.body,p_content_hash,p_actor_id
  ) returning * into v_intent;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    'outreach_delivery_prepared','outreach_delivery_intent',v_intent.id::text,p_actor_id,
    jsonb_build_object('draft_id',v_draft.id,'contact_id',v_draft.contact_id,'channel',v_draft.channel,'recipient',lower(btrim(v_recipient)),'content_hash',p_content_hash)
  );

  return jsonb_build_object(
    'intent_id',v_intent.id,
    'status',v_intent.status,
    'recipient',v_intent.recipient,
    'content_hash',v_intent.content_hash,
    'already_prepared',false
  );
end;
$$;

create or replace function public.confirm_outreach_delivery_intent(
  p_intent_id uuid,
  p_actor_id uuid,
  p_delivery_method text,
  p_provider_message_id text default null,
  p_confirmation_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.outreach_delivery_intents%rowtype;
  v_updated_id uuid;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;

  if p_delivery_method not in ('manual','provider') then raise exception 'Unsupported delivery method'; end if;
  if p_delivery_method = 'provider' and (p_provider_message_id is null or length(btrim(p_provider_message_id)) = 0) then
    raise exception 'Provider message id is required for provider delivery';
  end if;
  if p_confirmation_note is not null and length(btrim(p_confirmation_note)) < 8 then
    raise exception 'Confirmation note must be at least 8 characters when provided';
  end if;

  select * into v_intent
  from public.outreach_delivery_intents
  where id = p_intent_id
  for update;

  if not found then raise exception 'Delivery intent not found'; end if;

  if v_intent.status = 'delivered' then
    return jsonb_build_object(
      'intent_id',v_intent.id,
      'draft_id',v_intent.draft_id,
      'status','delivered',
      'already_delivered',true,
      'delivered_at',v_intent.delivered_at
    );
  end if;
  if v_intent.status <> 'prepared' then raise exception 'Delivery intent is not deliverable'; end if;

  update public.outreach_drafts
  set status='sent',updated_at=now()
  where id=v_intent.draft_id and status='approved'
  returning id into v_updated_id;

  if v_updated_id is null then raise exception 'Approved draft is no longer eligible for delivery'; end if;

  update public.outreach_delivery_intents
  set status='delivered',delivered_by=p_actor_id,delivered_at=now(),delivery_method=p_delivery_method,
      provider_message_id=nullif(btrim(p_provider_message_id),''),confirmation_note=nullif(btrim(p_confirmation_note),''),updated_at=now()
  where id=p_intent_id
  returning * into v_intent;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    'outreach_delivery_confirmed','outreach_delivery_intent',v_intent.id::text,p_actor_id,
    jsonb_build_object('draft_id',v_intent.draft_id,'contact_id',v_intent.contact_id,'channel',v_intent.channel,'delivery_method',p_delivery_method,'provider_message_id',v_intent.provider_message_id,'content_hash',v_intent.content_hash)
  );

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    'draft_sent','outreach_draft',v_intent.draft_id::text,p_actor_id,
    jsonb_build_object('delivery_intent_id',v_intent.id,'contact_id',v_intent.contact_id,'channel',v_intent.channel,'delivery_method',p_delivery_method,'content_hash',v_intent.content_hash)
  );

  return jsonb_build_object(
    'intent_id',v_intent.id,
    'draft_id',v_intent.draft_id,
    'status',v_intent.status,
    'already_delivered',false,
    'delivered_at',v_intent.delivered_at
  );
end;
$$;

revoke all on function public.prepare_outreach_delivery_intent(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.prepare_outreach_delivery_intent(uuid,uuid,text) to service_role;
revoke all on function public.confirm_outreach_delivery_intent(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.confirm_outreach_delivery_intent(uuid,uuid,text,text,text) to service_role;
