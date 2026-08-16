alter table public.sales_pipeline add column if not exists opening_order_value numeric(12,2) check (opening_order_value is null or opening_order_value >= 0);
alter table public.sales_pipeline add column if not exists ordered_on date;
alter table public.sales_pipeline add column if not exists reorder_follow_up_on date;
create index if not exists sales_pipeline_reorder_idx on public.sales_pipeline(reorder_follow_up_on) where reorder_follow_up_on is not null;
