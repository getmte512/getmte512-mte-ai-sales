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

export function getShopifyAdminEndpoint(shop:string,apiVersion:string){
  const normalized=shop.trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized))throw new Error("The Shopify shop domain is invalid.");
  if(!/^20\d{2}-(01|04|07|10)$/.test(apiVersion))throw new Error("The Shopify API version is invalid.");
  return `https://${normalized}/admin/api/${apiVersion}/graphql.json`;
}
