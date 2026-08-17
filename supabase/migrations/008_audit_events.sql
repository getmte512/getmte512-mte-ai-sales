create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type,entity_id);

create or replace function public.audit_reorder_request_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(case when tg_op='INSERT' then 'reorder_request_created' else 'reorder_request_'||new.status end,'reorder_request',new.id::text,coalesce(new.reviewed_by,new.requested_by),jsonb_build_object('status',new.status,'estimated_total',new.estimated_total,'currency_code',new.currency_code));
  return new;
end; $$;
drop trigger if exists audit_reorder_requests on public.reorder_requests;
create trigger audit_reorder_requests after insert or update of status on public.reorder_requests for each row execute function public.audit_reorder_request_change();

create or replace function public.audit_shopify_customer_link() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('shopify_customer_link_approved','shopify_customer_link',new.id::text,new.reviewed_by,jsonb_build_object('contact_id',new.contact_id,'confidence',new.match_confidence));
  return new;
end; $$;
drop trigger if exists audit_shopify_customer_links on public.shopify_customer_links;
create trigger audit_shopify_customer_links after insert or update on public.shopify_customer_links for each row execute function public.audit_shopify_customer_link();
