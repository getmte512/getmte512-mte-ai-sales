export type ShopifyReadiness = {
  configured: boolean;
  shopConfigured: boolean;
  tokenConfigured: boolean;
  apiVersion: string;
  requiredScopes: string[];
};

export function getShopifyReadiness(env: Record<string, string | undefined>): ShopifyReadiness {
  const shopConfigured = Boolean(env.SHOPIFY_SHOP_DOMAIN?.trim());
  const tokenConfigured = Boolean(env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim());
  return {
    configured: shopConfigured && tokenConfigured,
    shopConfigured,
    tokenConfigured,
    apiVersion: env.SHOPIFY_API_VERSION?.trim() || "2026-01",
    requiredScopes: ["read_customers", "read_orders", "read_products", "read_inventory"],
  };
}
