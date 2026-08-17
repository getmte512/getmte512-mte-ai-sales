create table if not exists public.reorder_requests (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'pending_review' check (status in ('pending_review','approved','declined','converted')),
  currency_code text not null default 'USD',
  estimated_total numeric(12,2) not null default 0 check (estimated_total >= 0),
  lines jsonb not null check (jsonb_typeof(lines) = 'array'),
  customer_note text,
  requested_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reorder_requests enable row level security;
create index if not exists reorder_requests_status_idx on public.reorder_requests(status,created_at desc);
