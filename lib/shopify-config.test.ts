import { describe, expect, it } from "vitest";
import { getConfiguredShopifyDomain, getShopifyAdminEndpoint, getShopifyReadiness } from "./shopify-config";

describe("Shopify readiness", () => {
  it("does not report ready without server-only authentication settings", () => {
    expect(getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com" }).configured).toBe(false);
  });

  it("reports ready with a legacy static token without returning the secret", () => {
    const result = getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com", SHOPIFY_ADMIN_ACCESS_TOKEN: "secret" });
    expect(result.configured).toBe(true);
    expect(result.authMode).toBe("static_token");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("reports ready with Dev Dashboard client credentials without returning secrets", () => {
    const result = getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com", SHOPIFY_CLIENT_ID: "client-id", SHOPIFY_CLIENT_SECRET: "client-secret" });
    expect(result.configured).toBe(true);
    expect(result.clientCredentialsConfigured).toBe(true);
    expect(result.authMode).toBe("client_credentials");
    expect(result.missing).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("client-secret");
  });

  it("requires both client credential values and safely reports what is missing", () => {
    const result = getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com", SHOPIFY_CLIENT_ID: "client-id" });
    expect(result.configured).toBe(false);
    expect(result.authMode).toBe("partial");
    expect(result.missing).toContain("SHOPIFY_CLIENT_SECRET");
  });

  it("falls back from a stale placeholder domain to a valid store domain", () => {
    const env = { SHOPIFY_SHOP_DOMAIN: "https://api.example.com", SHOPIFY_STORE_DOMAIN: "mte-wholesale.myshopify.com", SHOPIFY_CLIENT_ID: "client-id", SHOPIFY_CLIENT_SECRET: "client-secret" };
    expect(getConfiguredShopifyDomain(env)).toBe("mte-wholesale.myshopify.com");
    const result = getShopifyReadiness(env);
    expect(result.configured).toBe(true);
    expect(result.domainSource).toBe("SHOPIFY_STORE_DOMAIN");
    expect(result.domainValid).toBe(true);
  });

  it("never returns configured environment values in diagnostics", () => {
    const result = getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte-wholesale.myshopify.com", SHOPIFY_CLIENT_ID: "sensitive-client-id", SHOPIFY_CLIENT_SECRET: "sensitive-client-secret" });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("mte-wholesale.myshopify.com");
    expect(serialized).not.toContain("sensitive-client-id");
    expect(serialized).not.toContain("sensitive-client-secret");
  });

  it("builds only a valid Shopify Admin endpoint",()=>{expect(getShopifyAdminEndpoint("MTE.myshopify.com","2026-01")).toBe("https://mte.myshopify.com/admin/api/2026-01/graphql.json");expect(()=>getShopifyAdminEndpoint("example.com","2026-01")).toThrow("invalid");});
});
