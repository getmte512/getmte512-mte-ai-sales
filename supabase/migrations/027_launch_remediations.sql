create table if not exists public.launch_remediations (
  id uuid primary key default gen_random_uuid(),
  check_name text not null unique,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  owner text,
  note text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.launch_remediations enable row level security;
create index if not exists launch_remediations_status_idx on public.launch_remediations(status,updated_at desc);

create or replace function public.upsert_launch_remediation(
  p_actor_id uuid,
  p_check_name text,
  p_status text,
  p_owner text default null,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  remediation_id uuid;
begin
  if coalesce(trim(p_check_name),'') = '' then
    raise exception 'check name is required';
  end if;
  if p_status not in ('open','in_progress','resolved') then
    raise exception 'invalid remediation status';
  end if;

  insert into public.launch_remediations(check_name,status,owner,note,updated_by,updated_at)
  values(trim(p_check_name),p_status,nullif(trim(coalesce(p_owner,'')),''),nullif(trim(coalesce(p_note,'')),''),p_actor_id,now())
  on conflict(check_name) do update set
    status=excluded.status,
    owner=excluded.owner,
    note=excluded.note,
    updated_by=excluded.updated_by,
    updated_at=now()
  returning id into remediation_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('launch_remediation_updated','launch_remediation',remediation_id::text,p_actor_id,jsonb_build_object(
    'check_name',trim(p_check_name),
    'status',p_status,
    'owner',nullif(trim(coalesce(p_owner,'')),''),
    'note',nullif(trim(coalesce(p_note,'')),'')
  ));

  return remediation_id;
end; $$;
