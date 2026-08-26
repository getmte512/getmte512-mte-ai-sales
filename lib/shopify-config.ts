export type ShopifyReadiness = {
  configured: boolean;
  shopConfigured: boolean;
  tokenConfigured: boolean;
  clientCredentialsConfigured: boolean;
  apiVersion: string;
  requiredScopes: string[];
};

type ShopifyTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

let cachedClientCredentialsToken: { shop: string; token: string; expiresAt: number } | null = null;

export function normalizeShopifyShopDomain(shop: string) {
  const normalized = shop.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)) throw new Error("The Shopify shop domain is invalid.");
  return normalized;
}

export function getConfiguredShopifyDomain(env: Record<string, string | undefined> = process.env) {
  const candidates = [env.SHOPIFY_SHOP_DOMAIN, env.SHOPIFY_STORE_DOMAIN].filter((value): value is string => Boolean(value?.trim()));
  for (const candidate of candidates) {
    try {
      return normalizeShopifyShopDomain(candidate);
    } catch {
      // Try the next configured domain. This lets production recover from a stale placeholder variable.
    }
  }
  return candidates[0]?.trim() || "";
}

export function getShopifyReadiness(env: Record<string, string | undefined>): ShopifyReadiness {
  let shopConfigured = false;
  try {
    shopConfigured = Boolean(getConfiguredShopifyDomain(env) && normalizeShopifyShopDomain(getConfiguredShopifyDomain(env)));
  } catch {
    shopConfigured = false;
  }
  const tokenConfigured = Boolean(env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim());
  const clientCredentialsConfigured = Boolean(env.SHOPIFY_CLIENT_ID?.trim() && env.SHOPIFY_CLIENT_SECRET?.trim());
  return {
    configured: shopConfigured && (tokenConfigured || clientCredentialsConfigured),
    shopConfigured,
    tokenConfigured,
    clientCredentialsConfigured,
    apiVersion: env.SHOPIFY_API_VERSION?.trim() || "2026-01",
    requiredScopes: ["read_customers", "read_orders", "read_products", "read_inventory"],
  };
}

export function getShopifyAdminEndpoint(shop: string, apiVersion: string) {
  const normalized = normalizeShopifyShopDomain(shop);
  if (!/^20\d{2}-(01|04|07|10)$/.test(apiVersion)) throw new Error("The Shopify API version is invalid.");
  return `https://${normalized}/admin/api/${apiVersion}/graphql.json`;
}

export async function getShopifyAdminAccessToken(env: Record<string, string | undefined> = process.env) {
  const staticToken = env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  if (staticToken) return staticToken;

  const shop = normalizeShopifyShopDomain(getConfiguredShopifyDomain(env));
  const clientId = env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = env.SHOPIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("SHOPIFY_NOT_CONFIGURED");

  const now = Date.now();
  if (cachedClientCredentialsToken && cachedClientCredentialsToken.shop === shop && cachedClientCredentialsToken.expiresAt > now + 60_000) {
    return cachedClientCredentialsToken.token;
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  let payload: ShopifyTokenResponse = {};
  try {
    payload = await response.json();
  } catch {
    // handled below
  }
  if (!response.ok || !payload.access_token) throw new Error("SHOPIFY_TOKEN_EXCHANGE_FAILED");

  const expiresIn = Number(payload.expires_in) > 0 ? Number(payload.expires_in) : 24 * 60 * 60;
  cachedClientCredentialsToken = {
    shop,
    token: payload.access_token,
    expiresAt: now + expiresIn * 1000,
  };
  return payload.access_token;
}
