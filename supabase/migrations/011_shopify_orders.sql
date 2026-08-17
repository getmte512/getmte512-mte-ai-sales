create table if not exists public.shopify_orders (
  id uuid primary key default gen_random_uuid(),
  shopify_order_gid text not null unique check (shopify_order_gid like 'gid://shopify/Order/%'),
  order_name text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  financial_status text not null,
  fulfillment_status text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency_code text not null check (char_length(currency_code) = 3),
  ordered_at timestamptz not null,
  sync_run_id uuid references public.shopify_sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.shopify_orders enable row level security;
create index if not exists shopify_orders_contact_idx on public.shopify_orders(contact_id,ordered_at desc);
create index if not exists shopify_orders_ordered_idx on public.shopify_orders(ordered_at desc);
