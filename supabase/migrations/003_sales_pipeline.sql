create table if not exists public.sales_pipeline (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null unique references public.contacts(id) on delete cascade,
  stage text not null default 'prospect' check (stage in ('prospect','contacted','sample_planned','sample_sent','follow_up_due','ordered','not_interested')),
  next_follow_up_on date,
  notes text,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sales_pipeline enable row level security;
create index if not exists sales_pipeline_follow_up_idx on public.sales_pipeline(next_follow_up_on) where next_follow_up_on is not null;
create index if not exists sales_pipeline_stage_idx on public.sales_pipeline(stage);
