create table if not exists public.backup_recovery_drills (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('passed','failed')),
  integrity_verified boolean not null,
  backup_version integer,
  exported_at timestamptz,
  digest text,
  table_count integer not null default 0 check (table_count>=0),
  record_count integer not null default 0 check (record_count>=0),
  error_count integer not null default 0 check (error_count>=0),
  checked_by uuid not null references auth.users(id) on delete restrict,
  checked_at timestamptz not null default now()
);
alter table public.backup_recovery_drills enable row level security;
create index if not exists backup_recovery_drills_checked_idx on public.backup_recovery_drills(checked_at desc);

create or replace function public.record_backup_recovery_drill(p_actor_id uuid,p_status text,p_integrity_verified boolean,p_backup_version integer,p_exported_at timestamptz,p_digest text,p_table_count integer,p_record_count integer,p_error_count integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_status not in ('passed','failed') then raise exception 'Invalid recovery drill status.'; end if;
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator access is required.'; end if;
  insert into public.backup_recovery_drills(status,integrity_verified,backup_version,exported_at,digest,table_count,record_count,error_count,checked_by) values(p_status,p_integrity_verified,p_backup_version,p_exported_at,p_digest,greatest(coalesce(p_table_count,0),0),greatest(coalesce(p_record_count,0),0),greatest(coalesce(p_error_count,0),0),p_actor_id) returning id into v_id;
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata) values('backup_recovery_drill_recorded','backup_recovery_drill',v_id::text,p_actor_id,jsonb_build_object('status',p_status,'integrity_verified',p_integrity_verified,'backup_version',p_backup_version,'exported_at',p_exported_at,'digest',p_digest,'table_count',p_table_count,'record_count',p_record_count,'error_count',p_error_count));
  return v_id;
end;$$;
revoke all on function public.record_backup_recovery_drill(uuid,text,boolean,integer,timestamptz,text,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.record_backup_recovery_drill(uuid,text,boolean,integer,timestamptz,text,integer,integer,integer) to service_role;
