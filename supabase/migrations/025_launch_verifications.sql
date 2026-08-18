create table if not exists public.launch_verifications (
  verification_key text primary key check (verification_key in ('invitation','approval_flow','backup_restore')),
  verified_at timestamptz not null,
  verified_by uuid not null references auth.users(id) on delete restrict,
  note text not null check (length(btrim(note)) between 8 and 1000),
  updated_at timestamptz not null default now()
);

alter table public.launch_verifications enable row level security;

create or replace function public.record_launch_verification(
  p_verification_key text,
  p_actor_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verified_at timestamptz := now();
begin
  if p_verification_key not in ('invitation','approval_flow','backup_restore') then
    raise exception 'Unsupported launch verification key';
  end if;
  if length(btrim(coalesce(p_note,''))) < 8 or length(btrim(p_note)) > 1000 then
    raise exception 'Launch verification note must be 8 to 1000 characters';
  end if;
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role='admin') then
    raise exception 'Administrator access is required';
  end if;

  insert into public.launch_verifications(verification_key,verified_at,verified_by,note,updated_at)
  values(p_verification_key,v_verified_at,p_actor_id,btrim(p_note),v_verified_at)
  on conflict(verification_key) do update set
    verified_at=excluded.verified_at,
    verified_by=excluded.verified_by,
    note=excluded.note,
    updated_at=excluded.updated_at;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('launch_verification_recorded','launch_verification',p_verification_key,p_actor_id,
    jsonb_build_object('verified_at',v_verified_at,'note',btrim(p_note)));

  return jsonb_build_object('verification_key',p_verification_key,'verified_at',v_verified_at);
end;
$$;

revoke all on function public.record_launch_verification(text,uuid,text) from public, anon, authenticated;
grant execute on function public.record_launch_verification(text,uuid,text) to service_role;
