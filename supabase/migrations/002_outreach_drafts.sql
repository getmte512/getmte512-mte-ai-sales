create table if not exists public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email')),
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','awaiting_approval','approved','rejected','sent')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contact_id, channel)
);
alter table public.outreach_drafts enable row level security;
create index if not exists outreach_drafts_status_idx on public.outreach_drafts(status, updated_at desc);
