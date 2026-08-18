import type { ShopifyOrderPreview } from "./shopify-orders";
import type { ShopifyProductPreview } from "./shopify-products";

export function buildOrderSyncRows(orders: ShopifyOrderPreview[]) {
  return orders.map((order) => ({
    shopify_order_gid: order.id,
    order_name: order.name,
    contact_id: order.crmContactId,
    financial_status: order.financialStatus,
    fulfillment_status: order.fulfillmentStatus,
    amount: order.amount,
    currency_code: order.currencyCode,
    ordered_at: order.createdAt,
  }));
}

export function buildProductSyncRows(products: ShopifyProductPreview[]) {
  return products.map((product) => ({
    shopify_product_gid: product.id,
    title: product.title,
    status: product.status,
    total_inventory: product.totalInventory,
    variant_count: product.variantCount,
    min_price: product.minPrice ?? null,
    currency_code: product.currencyCode ?? null,
  }));
}

export function syncCounts(reviewed: number, imported: number) {
  if (!Number.isInteger(reviewed) || !Number.isInteger(imported) || reviewed < 0 || imported < 0 || imported > reviewed) {
    throw new Error("Invalid Shopify sync counts.");
  }
  return { reviewed, imported, exceptions: reviewed - imported };
}
