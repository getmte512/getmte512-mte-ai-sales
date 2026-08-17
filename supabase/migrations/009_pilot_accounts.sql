create table if not exists public.pilot_accounts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references public.contacts(id) on delete cascade,
  status text not null default 'selected' check (status in ('selected','invited','active','completed','paused')),
  feedback_notes text,
  added_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pilot_accounts enable row level security;
create index if not exists pilot_accounts_status_idx on public.pilot_accounts(status,updated_at desc);
