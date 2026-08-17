export const backupTables=["contacts","outreach_drafts","sales_pipeline","shopify_customer_links","shopify_sync_runs","shopify_orders","shopify_products","reorder_requests","audit_events"] as const;
export function buildBackupSummary(data:Record<string,unknown[]>){return Object.fromEntries(backupTables.map(table=>[table,data[table]?.length??0]));}
