alter table public.conversation_recommendations
  add column if not exists pipeline_applied_by uuid references auth.users(id) on delete set null,
  add column if not exists pipeline_applied_at timestamptz;

create or replace function public.apply_conversation_recommendation_to_pipeline(
  p_recommendation_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec public.conversation_recommendations%rowtype;
  v_pipeline public.sales_pipeline%rowtype;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;

  select * into v_rec
  from public.conversation_recommendations
  where id = p_recommendation_id
  for update;

  if not found then raise exception 'Conversation recommendation not found'; end if;
  if v_rec.status <> 'accepted' then raise exception 'Only accepted recommendations can be applied'; end if;
  if v_rec.suggested_pipeline_stage is null then raise exception 'This recommendation does not suggest a pipeline stage'; end if;
  if v_rec.contact_id is null then raise exception 'A matched CRM contact is required'; end if;

  if v_rec.pipeline_applied_at is not null then
    select * into v_pipeline from public.sales_pipeline where contact_id = v_rec.contact_id;
    return jsonb_build_object(
      'recommendation_id',v_rec.id,
      'contact_id',v_rec.contact_id,
      'stage',v_pipeline.stage,
      'already_applied',true,
      'applied_at',v_rec.pipeline_applied_at
    );
  end if;

  insert into public.sales_pipeline(contact_id,stage,next_action,updated_by,updated_at)
  values(v_rec.contact_id,v_rec.suggested_pipeline_stage,v_rec.suggested_next_action,p_actor_id,now())
  on conflict(contact_id) do update set
    stage=excluded.stage,
    next_action=excluded.next_action,
    updated_by=excluded.updated_by,
    updated_at=excluded.updated_at
  returning * into v_pipeline;

  update public.conversation_recommendations
  set pipeline_applied_by=p_actor_id,pipeline_applied_at=now(),updated_at=now()
  where id=v_rec.id
  returning * into v_rec;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    'conversation_recommendation_pipeline_applied','conversation_recommendation',v_rec.id::text,p_actor_id,
    jsonb_build_object('reply_id',v_rec.reply_id,'contact_id',v_rec.contact_id,'stage',v_pipeline.stage,'next_action',v_rec.suggested_next_action)
  );

  return jsonb_build_object(
    'recommendation_id',v_rec.id,
    'contact_id',v_rec.contact_id,
    'stage',v_pipeline.stage,
    'already_applied',false,
    'applied_at',v_rec.pipeline_applied_at
  );
end;
$$;

revoke all on function public.apply_conversation_recommendation_to_pipeline(uuid,uuid) from public, anon, authenticated;
grant execute on function public.apply_conversation_recommendation_to_pipeline(uuid,uuid) to service_role;
