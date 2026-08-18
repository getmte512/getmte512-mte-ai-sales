create table if not exists public.conversation_response_drafts (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null unique references public.conversation_recommendations(id) on delete cascade,
  reply_id uuid not null references public.outreach_replies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  channel text not null default 'email' check (channel in ('email')),
  subject text not null,
  body text not null,
  status text not null default 'awaiting_approval' check (status in ('awaiting_approval','approved','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversation_response_drafts_status_idx on public.conversation_response_drafts(status,created_at desc);
alter table public.conversation_response_drafts enable row level security;
