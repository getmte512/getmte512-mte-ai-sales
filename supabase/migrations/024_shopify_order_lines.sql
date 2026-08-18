alter table public.shopify_orders add column if not exists lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines)='array');

create or replace function public.commit_shopify_snapshot_sync(
  p_sync_type text,
  p_actor_id uuid,
  p_reviewed_count integer,
  p_exception_count integer,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_imported_count integer := 0;
  v_row jsonb;
begin
  if p_sync_type not in ('orders','products') then raise exception 'Unsupported Shopify sync type'; end if;
  if p_reviewed_count < 0 or p_exception_count < 0 or p_exception_count > p_reviewed_count then raise exception 'Invalid Shopify sync counts'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Shopify sync rows must be an array'; end if;
  if not exists(select 1 from auth.users where id = p_actor_id) then raise exception 'Invalid Shopify sync actor'; end if;

  insert into public.shopify_sync_runs(sync_type,status,reviewed_count,imported_count,exception_count,initiated_by)
  values(p_sync_type,'approved',p_reviewed_count,0,p_exception_count,p_actor_id) returning id into v_run_id;

  if p_sync_type = 'orders' then
    for v_row in select * from jsonb_array_elements(p_rows) loop
      insert into public.shopify_orders(shopify_order_gid,order_name,contact_id,financial_status,fulfillment_status,amount,currency_code,ordered_at,lines,sync_run_id,synced_at)
      values(v_row->>'shopify_order_gid',v_row->>'order_name',nullif(v_row->>'contact_id','')::uuid,v_row->>'financial_status',v_row->>'fulfillment_status',(v_row->>'amount')::numeric,v_row->>'currency_code',(v_row->>'ordered_at')::timestamptz,coalesce(v_row->'lines','[]'::jsonb),v_run_id,now())
      on conflict(shopify_order_gid) do update set order_name=excluded.order_name,contact_id=excluded.contact_id,financial_status=excluded.financial_status,fulfillment_status=excluded.fulfillment_status,amount=excluded.amount,currency_code=excluded.currency_code,ordered_at=excluded.ordered_at,lines=excluded.lines,sync_run_id=v_run_id,synced_at=now();
      v_imported_count := v_imported_count + 1;
    end loop;
  else
    for v_row in select * from jsonb_array_elements(p_rows) loop
      insert into public.shopify_products(shopify_product_gid,title,status,total_inventory,variant_count,min_price,currency_code,sync_run_id,synced_at)
      values(v_row->>'shopify_product_gid',v_row->>'title',v_row->>'status',(v_row->>'total_inventory')::integer,(v_row->>'variant_count')::integer,nullif(v_row->>'min_price','')::numeric,nullif(v_row->>'currency_code',''),v_run_id,now())
      on conflict(shopify_product_gid) do update set title=excluded.title,status=excluded.status,total_inventory=excluded.total_inventory,variant_count=excluded.variant_count,min_price=excluded.min_price,currency_code=excluded.currency_code,sync_run_id=v_run_id,synced_at=now();
      v_imported_count := v_imported_count + 1;
    end loop;
  end if;

  update public.shopify_sync_runs set status='completed',imported_count=v_imported_count where id=v_run_id;
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(case when p_sync_type='orders' then 'shopify_orders_synced' else 'shopify_products_synced' end,'shopify_sync_run',v_run_id::text,p_actor_id,jsonb_build_object('reviewed',p_reviewed_count,'imported',v_imported_count,'exceptions',p_exception_count,'atomic',true));
  return jsonb_build_object('run_id',v_run_id,'synced',v_imported_count,'exceptions',p_exception_count,'shopify_changed',false);
end;
$$;

revoke all on function public.commit_shopify_snapshot_sync(text,uuid,integer,integer,jsonb) from public, anon, authenticated;
grant execute on function public.commit_shopify_snapshot_sync(text,uuid,integer,integer,jsonb) to service_role;
