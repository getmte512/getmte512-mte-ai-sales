create table if not exists public.shopify_products (
  id uuid primary key default gen_random_uuid(),
  shopify_product_gid text not null unique check (shopify_product_gid like 'gid://shopify/Product/%'),
  title text not null,
  status text not null,
  total_inventory integer not null,
  variant_count integer not null check (variant_count >= 0),
  min_price numeric(12,2) check (min_price is null or min_price >= 0),
  currency_code text check (currency_code is null or char_length(currency_code) = 3),
  sync_run_id uuid references public.shopify_sync_runs(id) on delete set null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.shopify_products enable row level security;
create index if not exists shopify_products_status_idx on public.shopify_products(status,title);
