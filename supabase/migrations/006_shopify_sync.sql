create table if not exists public.shopify_customer_links (
  id uuid primary key default gen_random_uuid(),
  shopify_customer_gid text not null unique check (shopify_customer_gid like 'gid://shopify/Customer/%'),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  match_confidence text not null check (match_confidence in ('exact','strong')),
  match_reasons jsonb not null default '[]'::jsonb,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists shopify_customer_links_contact_idx on public.shopify_customer_links(contact_id);
alter table public.shopify_customer_links enable row level security;

create table if not exists public.shopify_sync_runs (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null check (sync_type in ('customer_links','orders','products')),
  status text not null check (status in ('approved','completed','failed')),
  reviewed_count integer not null default 0 check (reviewed_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  exception_count integer not null default 0 check (exception_count >= 0),
  initiated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.shopify_sync_runs enable row level security;
create index if not exists shopify_sync_runs_created_idx on public.shopify_sync_runs(created_at desc);
