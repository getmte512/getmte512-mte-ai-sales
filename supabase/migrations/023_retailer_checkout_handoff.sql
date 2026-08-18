alter table public.reorder_requests drop constraint if exists reorder_requests_status_check;
alter table public.reorder_requests add constraint reorder_requests_status_check check (status in ('pending_review','approved','declined','checkout_ready','converted'));
alter table public.reorder_requests add column if not exists checkout_url text;
alter table public.reorder_requests add column if not exists checkout_prepared_at timestamptz;
