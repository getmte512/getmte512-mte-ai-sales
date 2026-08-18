alter table public.sales_pipeline add column if not exists next_action text;
alter table public.sales_pipeline add column if not exists next_action_at timestamptz;
alter table public.sales_pipeline drop constraint if exists sales_pipeline_stage_check;
alter table public.sales_pipeline add constraint sales_pipeline_stage_check check (stage in ('prospect','contacted','engaged','sample_planned','sample_sent','sample_delivered','follow_up_due','negotiating','ordered','won','lost','not_interested'));

create table if not exists public.sales_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 500),
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sample_shipments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  carrier text,
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  follow_up_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delivered_at is null or shipped_at is not null),
  check (follow_up_at is null or shipped_at is not null)
);

alter table public.sales_tasks enable row level security;
alter table public.sample_shipments enable row level security;
create index if not exists sales_tasks_contact_due_idx on public.sales_tasks(contact_id,due_at);
create index if not exists sample_shipments_contact_idx on public.sample_shipments(contact_id,created_at desc);

create or replace function public.audit_pipeline_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
 values('pipeline_updated','contact',new.contact_id::text,new.updated_by,jsonb_build_object('stage',new.stage,'next_action',new.next_action,'next_action_at',new.next_action_at,'next_follow_up_on',new.next_follow_up_on)); return new;
end; $$;
drop trigger if exists audit_sales_pipeline on public.sales_pipeline;
create trigger audit_sales_pipeline after insert or update on public.sales_pipeline for each row execute function public.audit_pipeline_change();

create or replace function public.audit_sales_task() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
 values(case when new.completed_at is null then 'sales_task_saved' else 'sales_task_completed' end,'contact',new.contact_id::text,new.created_by,jsonb_build_object('task_id',new.id,'title',new.title,'due_at',new.due_at)); return new;
end; $$;
drop trigger if exists audit_sales_tasks on public.sales_tasks;
create trigger audit_sales_tasks after insert or update on public.sales_tasks for each row execute function public.audit_sales_task();

create or replace function public.audit_sample_shipment() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
 values('sample_shipment_saved','contact',new.contact_id::text,new.created_by,jsonb_build_object('sample_shipment_id',new.id,'carrier',new.carrier,'tracking_number',new.tracking_number,'shipped_at',new.shipped_at,'delivered_at',new.delivered_at,'follow_up_at',new.follow_up_at)); return new;
end; $$;
drop trigger if exists audit_sample_shipments on public.sample_shipments;
create trigger audit_sample_shipments after insert or update on public.sample_shipments for each row execute function public.audit_sample_shipment();
