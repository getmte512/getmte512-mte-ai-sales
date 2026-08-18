alter table public.sales_pipeline
  add column if not exists sample_sent_on date,
  add column if not exists sample_delivered_on date,
  add column if not exists sample_tracking_number text;

create index if not exists sales_pipeline_sample_follow_up_idx
  on public.sales_pipeline(sample_delivered_on, next_follow_up_on)
  where sample_delivered_on is not null;
