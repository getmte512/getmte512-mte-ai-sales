create table if not exists public.sales_operating_review_annotations (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.sales_operating_review_snapshots(id) on delete restrict,
  annotation_type text not null check (annotation_type in ('observation','decision','risk')),
  body text not null check (char_length(trim(body)) between 8 and 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists sales_operating_review_annotations_snapshot_idx on public.sales_operating_review_annotations(snapshot_id,created_at asc);
alter table public.sales_operating_review_annotations enable row level security;
revoke all on public.sales_operating_review_annotations from public,anon,authenticated;
grant select on public.sales_operating_review_annotations to service_role;

create or replace function public.add_sales_operating_review_annotation(p_actor_id uuid,p_snapshot_id uuid,p_annotation_type text,p_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role in ('admin','sales')) then raise exception 'Sales access is required'; end if;
 if p_annotation_type not in ('observation','decision','risk') then raise exception 'Invalid annotation type'; end if;
 if char_length(trim(coalesce(p_body,'')))<8 or char_length(trim(coalesce(p_body,'')))>2000 then raise exception 'Annotation must be between 8 and 2000 characters'; end if;
 if not exists(select 1 from public.sales_operating_review_snapshots where id=p_snapshot_id) then raise exception 'Operating review snapshot not found'; end if;
 insert into public.sales_operating_review_annotations(snapshot_id,annotation_type,body,created_by) values(p_snapshot_id,p_annotation_type,trim(p_body),p_actor_id) returning id into v_id;
 insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata) values('sales_operating_review_annotation_added','sales_operating_review_annotation',v_id::text,p_actor_id,jsonb_build_object('snapshot_id',p_snapshot_id,'annotation_type',p_annotation_type));
 return v_id;
end$$;
revoke all on function public.add_sales_operating_review_annotation(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.add_sales_operating_review_annotation(uuid,uuid,text,text) to service_role;
