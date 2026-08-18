alter table public.backup_recovery_drills drop constraint if exists backup_recovery_drills_pass_integrity_check;
alter table public.backup_recovery_drills add constraint backup_recovery_drills_pass_integrity_check check (
  status <> 'passed' or (
    integrity_verified is true
    and error_count = 0
    and backup_version = 2
    and length(btrim(coalesce(digest,''))) = 64
  )
) not valid;

create or replace function public.record_backup_recovery_drill(
  p_actor_id uuid,
  p_status text,
  p_integrity_verified boolean,
  p_backup_version integer,
  p_exported_at timestamptz,
  p_digest text,
  p_table_count integer,
  p_record_count integer,
  p_error_count integer
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_status not in ('passed','failed') then raise exception 'Invalid recovery drill status.'; end if;
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator access is required.'; end if;
  if p_status='passed' and (
    p_integrity_verified is not true
    or coalesce(p_error_count,0) <> 0
    or p_backup_version is distinct from 2
    or length(btrim(coalesce(p_digest,''))) <> 64
  ) then
    raise exception 'Passed recovery drill must have verified integrity, backup format v2, a SHA-256 digest, and zero validation errors.';
  end if;

  insert into public.backup_recovery_drills(status,integrity_verified,backup_version,exported_at,digest,table_count,record_count,error_count,checked_by)
  values(p_status,p_integrity_verified,p_backup_version,p_exported_at,nullif(btrim(coalesce(p_digest,'')),''),greatest(coalesce(p_table_count,0),0),greatest(coalesce(p_record_count,0),0),greatest(coalesce(p_error_count,0),0),p_actor_id)
  returning id into v_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('backup_recovery_drill_recorded','backup_recovery_drill',v_id::text,p_actor_id,jsonb_build_object(
    'status',p_status,
    'integrity_verified',p_integrity_verified,
    'backup_version',p_backup_version,
    'exported_at',p_exported_at,
    'digest',nullif(btrim(coalesce(p_digest,'')),''),
    'table_count',greatest(coalesce(p_table_count,0),0),
    'record_count',greatest(coalesce(p_record_count,0),0),
    'error_count',greatest(coalesce(p_error_count,0),0)
  ));
  return v_id;
end; $$;
revoke all on function public.record_backup_recovery_drill(uuid,text,boolean,integer,timestamptz,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.record_backup_recovery_drill(uuid,text,boolean,integer,timestamptz,text,integer,integer,integer) to service_role;

create or replace function public.update_pilot_account_status(
  p_actor_id uuid,
  p_id uuid,
  p_status text,
  p_feedback_notes text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_smoke_status text;
  v_smoke_checked_at timestamptz;
  v_recovery_status text;
  v_recovery_checked_at timestamptz;
  v_recovery_integrity_verified boolean;
  v_recovery_error_count integer;
  v_recovery_backup_version integer;
  v_recovery_digest text;
  v_verification_count integer;
  v_account public.pilot_accounts%rowtype;
begin
  if p_status not in ('selected','invited','active','completed','paused') then raise exception 'Invalid pilot status.'; end if;
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator access is required.'; end if;

  if p_status in ('invited','active') then
    select status,checked_at into v_smoke_status,v_smoke_checked_at from public.launch_smoke_runs order by checked_at desc limit 1;
    if v_smoke_status is distinct from 'ready' then raise exception 'A recorded production smoke test with zero blockers is required before pilot activation.'; end if;
    if v_smoke_checked_at is null or v_smoke_checked_at < now()-interval '24 hours' or v_smoke_checked_at > now() then raise exception 'A fresh production smoke test recorded within 24 hours is required before pilot activation.'; end if;

    select status,checked_at,integrity_verified,error_count,backup_version,digest
      into v_recovery_status,v_recovery_checked_at,v_recovery_integrity_verified,v_recovery_error_count,v_recovery_backup_version,v_recovery_digest
      from public.backup_recovery_drills order by checked_at desc limit 1;
    if v_recovery_status is distinct from 'passed'
      or v_recovery_integrity_verified is not true
      or coalesce(v_recovery_error_count,1) <> 0
      or v_recovery_backup_version is distinct from 2
      or length(btrim(coalesce(v_recovery_digest,''))) <> 64 then
      raise exception 'A verified backup recovery drill with current integrity evidence is required before pilot activation.';
    end if;
    if v_recovery_checked_at is null or v_recovery_checked_at < now()-interval '7 days' or v_recovery_checked_at > now() then raise exception 'A passed backup recovery drill within 7 days is required before pilot activation.'; end if;

    select count(distinct verification_key) into v_verification_count from public.launch_verifications where verification_key in ('invitation','approval_flow','backup_restore');
    if v_verification_count <> 3 then raise exception 'Invitation, approval-flow, and backup/restore launch verification are required before pilot activation.'; end if;
  end if;

  update public.pilot_accounts set status=p_status,feedback_notes=nullif(btrim(coalesce(p_feedback_notes,'')),''),updated_by=p_actor_id,updated_at=now() where id=p_id returning * into v_account;
  if not found then raise exception 'Pilot account not found.'; end if;
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('pilot_account_status_updated','pilot_account',p_id::text,p_actor_id,jsonb_build_object('status',p_status,'contact_id',v_account.contact_id,'feedback_notes',v_account.feedback_notes,'launch_smoke_checked_at',v_smoke_checked_at,'recovery_drill_checked_at',v_recovery_checked_at,'recovery_integrity_verified',v_recovery_integrity_verified));
  return to_jsonb(v_account);
end; $$;
revoke all on function public.update_pilot_account_status(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.update_pilot_account_status(uuid,uuid,text,text) to service_role;
