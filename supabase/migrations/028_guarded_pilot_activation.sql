create or replace function public.update_pilot_account_status(
  p_actor_id uuid,
  p_id uuid,
  p_status text,
  p_feedback_notes text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_smoke_status text;
  v_verification_count integer;
  v_account public.pilot_accounts%rowtype;
begin
  if p_status not in ('selected','invited','active','completed','paused') then
    raise exception 'Invalid pilot status.';
  end if;
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role='admin') then
    raise exception 'Administrator access is required.';
  end if;

  if p_status in ('invited','active') then
    select status into v_smoke_status from public.launch_smoke_runs order by checked_at desc limit 1;
    if v_smoke_status is distinct from 'ready' then
      raise exception 'A recorded production smoke test with zero blockers is required before pilot activation.';
    end if;
    select count(distinct verification_key) into v_verification_count
      from public.launch_verifications
      where verification_key in ('invitation','approval_flow','backup_restore');
    if v_verification_count <> 3 then
      raise exception 'Invitation, approval-flow, and backup/restore launch verification are required before pilot activation.';
    end if;
  end if;

  update public.pilot_accounts set
    status=p_status,
    feedback_notes=nullif(btrim(coalesce(p_feedback_notes,'')),''),
    updated_by=p_actor_id,
    updated_at=now()
  where id=p_id
  returning * into v_account;
  if not found then raise exception 'Pilot account not found.'; end if;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('pilot_account_status_updated','pilot_account',p_id::text,p_actor_id,
    jsonb_build_object('status',p_status,'contact_id',v_account.contact_id,'feedback_notes',v_account.feedback_notes));

  return to_jsonb(v_account);
end; $$;

revoke all on function public.update_pilot_account_status(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.update_pilot_account_status(uuid,uuid,text,text) to service_role;
