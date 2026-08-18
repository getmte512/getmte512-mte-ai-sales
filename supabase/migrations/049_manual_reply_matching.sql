alter table public.outreach_replies
  drop constraint if exists outreach_replies_matched_by_check;
alter table public.outreach_replies
  add constraint outreach_replies_matched_by_check check (matched_by in ('in_reply_to','references','manual_review','unmatched'));
alter table public.outreach_replies
  add column if not exists manually_matched_by uuid references auth.users(id) on delete set null,
  add column if not exists manually_matched_at timestamptz,
  add column if not exists manual_match_note text;

create or replace function public.manually_match_outreach_reply(
  p_reply_id uuid,
  p_intent_id uuid,
  p_actor_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_reply public.outreach_replies%rowtype;
  v_intent public.outreach_delivery_intents%rowtype;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then
    raise exception 'Sales access is required';
  end if;
  if p_note is null or length(btrim(p_note)) < 8 then raise exception 'Manual match note must be at least 8 characters'; end if;

  select * into v_reply from public.outreach_replies where id=p_reply_id for update;
  if not found then raise exception 'Inbound reply not found'; end if;
  if v_reply.matched_by <> 'unmatched' or v_reply.intent_id is not null then raise exception 'Only unmatched inbound email can be manually matched'; end if;
  if v_reply.review_status <> 'unreviewed' then raise exception 'Reviewed inbound email cannot be rematched'; end if;

  select * into v_intent from public.outreach_delivery_intents where id=p_intent_id for update;
  if not found then raise exception 'Delivery intent not found'; end if;
  if v_intent.status <> 'delivered' or v_intent.channel <> 'email' then raise exception 'Manual matching requires a delivered email intent'; end if;

  update public.outreach_replies
  set intent_id=v_intent.id,
      contact_id=v_intent.contact_id,
      matched_by='manual_review',
      manually_matched_by=p_actor_id,
      manually_matched_at=now(),
      manual_match_note=btrim(p_note),
      updated_at=now()
  where id=v_reply.id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('outreach_reply_manually_matched','outreach_reply',v_reply.id::text,p_actor_id,
    jsonb_build_object('intent_id',v_intent.id,'contact_id',v_intent.contact_id,'from_email',v_reply.from_email,'note',btrim(p_note)));

  return jsonb_build_object('reply_id',v_reply.id,'intent_id',v_intent.id,'contact_id',v_intent.contact_id,'matched_by','manual_review');
end;
$$;

revoke all on function public.manually_match_outreach_reply(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.manually_match_outreach_reply(uuid,uuid,uuid,text) to service_role;
