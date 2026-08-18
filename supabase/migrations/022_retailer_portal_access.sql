alter table public.app_user_roles drop constraint if exists app_user_roles_role_check;
alter table public.app_user_roles add constraint app_user_roles_role_check check (role in ('admin','sales','retailer'));

create table if not exists public.retailer_portal_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  contact_id uuid not null unique references public.contacts(id) on delete cascade,
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table public.retailer_portal_access enable row level security;

create or replace function public.audit_retailer_portal_access() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(case when new.revoked_at is null then 'retailer_portal_access_approved' else 'retailer_portal_access_revoked' end,'contact',new.contact_id::text,new.approved_by,jsonb_build_object('user_id',new.user_id,'approved_at',new.approved_at,'revoked_at',new.revoked_at));
  return new;
end; $$;
drop trigger if exists audit_retailer_portal_access on public.retailer_portal_access;
create trigger audit_retailer_portal_access after insert or update on public.retailer_portal_access for each row execute function public.audit_retailer_portal_access();

alter table public.reorder_requests add column if not exists customer_confirmed_at timestamptz;
alter table public.reorder_requests add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
