create table if not exists public.shopify_reconciliation_decisions (
  id uuid primary key default gen_random_uuid(),
  shopify_customer_gid text not null unique check (shopify_customer_gid like 'gid://shopify/Customer/%'),
  customer_name text not null,
  decision text not null check (decision in ('needs_research','manual_match','ignored')),
  contact_id uuid references public.contacts(id) on delete set null,
  review_note text,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((decision = 'manual_match' and contact_id is not null) or decision <> 'manual_match')
);
alter table public.shopify_reconciliation_decisions enable row level security;
create index if not exists shopify_reconciliation_decisions_status_idx on public.shopify_reconciliation_decisions(decision,updated_at desc);
