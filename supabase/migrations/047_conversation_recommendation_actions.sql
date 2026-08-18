alter table public.conversation_recommendations
  add column if not exists task_id uuid references public.sales_tasks(id) on delete set null,
  add column if not exists task_applied_at timestamptz,
  add column if not exists pipeline_applied_at timestamptz;

create or replace function public.apply_conversation_recommendation_task(p_recommendation_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_rec public.conversation_recommendations%rowtype; v_task_id uuid;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then raise exception 'Sales access is required'; end if;
  select * into v_rec from public.conversation_recommendations where id=p_recommendation_id for update;
  if not found then raise exception 'Recommendation not found'; end if;
  if v_rec.status <> 'accepted' then raise exception 'Recommendation must be accepted before applying an action'; end if;
  if v_rec.contact_id is null then raise exception 'Recommendation has no CRM contact'; end if;
  if v_rec.task_id is not null then return jsonb_build_object('task_id',v_rec.task_id,'already_applied',true); end if;
  insert into public.sales_tasks(contact_id,title,due_at,created_by) values(v_rec.contact_id,left('Buyer reply: '||v_rec.suggested_next_action,500),(now()+interval '1 day'),p_actor_id) returning id into v_task_id;
  update public.conversation_recommendations set task_id=v_task_id,task_applied_at=now(),updated_at=now() where id=v_rec.id;
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata) values('conversation_recommendation_task_created','conversation_recommendation',v_rec.id::text,p_actor_id,jsonb_build_object('task_id',v_task_id,'contact_id',v_rec.contact_id,'reply_id',v_rec.reply_id));
  return jsonb_build_object('task_id',v_task_id,'already_applied',false);
end;$$;

create or replace function public.apply_conversation_recommendation_pipeline(p_recommendation_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_rec public.conversation_recommendations%rowtype; v_pipeline_id uuid;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then raise exception 'Sales access is required'; end if;
  select * into v_rec from public.conversation_recommendations where id=p_recommendation_id for update;
  if not found then raise exception 'Recommendation not found'; end if;
  if v_rec.status <> 'accepted' then raise exception 'Recommendation must be accepted before applying an action'; end if;
  if v_rec.contact_id is null then raise exception 'Recommendation has no CRM contact'; end if;
  if v_rec.suggested_pipeline_stage is null then raise exception 'Recommendation has no pipeline-stage suggestion'; end if;
  if v_rec.pipeline_applied_at is not null then select id into v_pipeline_id from public.sales_pipeline where contact_id=v_rec.contact_id; return jsonb_build_object('pipeline_id',v_pipeline_id,'stage',v_rec.suggested_pipeline_stage,'already_applied',true); end if;
  insert into public.sales_pipeline(contact_id,stage,updated_by) values(v_rec.contact_id,v_rec.suggested_pipeline_stage,p_actor_id) on conflict(contact_id) do update set stage=excluded.stage,updated_by=excluded.updated_by,updated_at=now() returning id into v_pipeline_id;
  update public.conversation_recommendations set pipeline_applied_at=now(),updated_at=now() where id=v_rec.id;
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata) values('conversation_recommendation_pipeline_applied','conversation_recommendation',v_rec.id::text,p_actor_id,jsonb_build_object('pipeline_id',v_pipeline_id,'contact_id',v_rec.contact_id,'reply_id',v_rec.reply_id,'stage',v_rec.suggested_pipeline_stage));
  return jsonb_build_object('pipeline_id',v_pipeline_id,'stage',v_rec.suggested_pipeline_stage,'already_applied',false);
end;$$;

revoke all on function public.apply_conversation_recommendation_task(uuid,uuid) from public,anon,authenticated;
revoke all on function public.apply_conversation_recommendation_pipeline(uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_conversation_recommendation_task(uuid,uuid) to service_role;
grant execute on function public.apply_conversation_recommendation_pipeline(uuid,uuid) to service_role;
