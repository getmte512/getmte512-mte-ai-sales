import { describe, expect, it } from "vitest";
import { getShopifyAdminEndpoint, getShopifyReadiness } from "./shopify-config";

describe("Shopify readiness", () => {
  it("does not report ready without server-only authentication settings", () => {
    expect(getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com" }).configured).toBe(false);
  });

  it("reports ready with a legacy static token without returning the secret", () => {
    const result = getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com", SHOPIFY_ADMIN_ACCESS_TOKEN: "secret" });
    expect(result.configured).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("reports ready with Dev Dashboard client credentials without returning secrets", () => {
    const result = getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com", SHOPIFY_CLIENT_ID: "client-id", SHOPIFY_CLIENT_SECRET: "client-secret" });
    expect(result.configured).toBe(true);
    expect(result.clientCredentialsConfigured).toBe(true);
    expect(JSON.stringify(result)).not.toContain("client-secret");
  });

  it("requires both client credential values", () => {
    expect(getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com", SHOPIFY_CLIENT_ID: "client-id" }).configured).toBe(false);
  });

  it("builds only a valid Shopify Admin endpoint",()=>{expect(getShopifyAdminEndpoint("MTE.myshopify.com","2026-01")).toBe("https://mte.myshopify.com/admin/api/2026-01/graphql.json");expect(()=>getShopifyAdminEndpoint("example.com","2026-01")).toThrow("invalid");});
});
