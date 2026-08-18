alter table public.outreach_drafts
  add column if not exists thread_key text not null default 'default';

alter table public.outreach_drafts
  drop constraint if exists outreach_drafts_purpose_check;
alter table public.outreach_drafts
  add constraint outreach_drafts_purpose_check check (purpose in ('initial_outreach','reorder_follow_up','conversation_reply'));

drop index if exists public.outreach_drafts_contact_channel_purpose_idx;
create unique index if not exists outreach_drafts_contact_channel_purpose_thread_idx
  on public.outreach_drafts(contact_id,channel,purpose,thread_key);

alter table public.conversation_recommendations
  add column if not exists response_outreach_draft_id uuid references public.outreach_drafts(id) on delete set null,
  add column if not exists response_draft_created_at timestamptz;

create or replace function public.create_conversation_response_outreach_draft(
  p_recommendation_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_rec public.conversation_recommendations%rowtype;
  v_contact public.contacts%rowtype;
  v_draft public.outreach_drafts%rowtype;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then
    raise exception 'Sales access is required';
  end if;

  select * into v_rec from public.conversation_recommendations where id=p_recommendation_id for update;
  if not found then raise exception 'Recommendation not found'; end if;
  if v_rec.status <> 'accepted' then raise exception 'Recommendation must be accepted before creating a response draft'; end if;
  if v_rec.contact_id is null then raise exception 'Recommendation has no CRM contact'; end if;
  if v_rec.response_body is null or length(btrim(v_rec.response_body)) = 0 then raise exception 'Recommendation has no response draft'; end if;
  if v_rec.response_outreach_draft_id is not null then
    return jsonb_build_object('draft_id',v_rec.response_outreach_draft_id,'already_created',true);
  end if;

  select * into v_contact from public.contacts where id=v_rec.contact_id for update;
  if not found then raise exception 'Contact not found'; end if;
  if v_contact.email is null or length(btrim(v_contact.email)) = 0 then raise exception 'Contact has no email address'; end if;
  if exists(select 1 from public.suppressions where contact_id=v_rec.contact_id and channel='email') then
    raise exception 'Contact is suppressed for email outreach';
  end if;

  insert into public.outreach_drafts(contact_id,channel,purpose,thread_key,subject,body,status,created_by,updated_at)
  values(
    v_rec.contact_id,
    'email',
    'conversation_reply',
    v_rec.id::text,
    coalesce(nullif(btrim(v_rec.response_subject),''),'Re: Buyer reply'),
    btrim(v_rec.response_body),
    'draft',
    p_actor_id,
    now()
  )
  on conflict(contact_id,channel,purpose,thread_key) do update
    set updated_at=public.outreach_drafts.updated_at
  returning * into v_draft;

  update public.conversation_recommendations
  set response_outreach_draft_id=v_draft.id,response_draft_created_at=coalesce(response_draft_created_at,now()),updated_at=now()
  where id=v_rec.id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('conversation_response_draft_created','conversation_recommendation',v_rec.id::text,p_actor_id,
    jsonb_build_object('draft_id',v_draft.id,'contact_id',v_rec.contact_id,'reply_id',v_rec.reply_id,'draft_status','draft','purpose','conversation_reply'));

  return jsonb_build_object('draft_id',v_draft.id,'already_created',false,'status','draft');
end;
$$;

revoke all on function public.create_conversation_response_outreach_draft(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_conversation_response_outreach_draft(uuid,uuid) to service_role;
