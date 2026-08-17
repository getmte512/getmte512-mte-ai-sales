import { describe, expect, it } from "vitest";
import { getShopifyAdminEndpoint, getShopifyReadiness } from "./shopify-config";

describe("Shopify readiness", () => {
  it("does not report ready without both server-only settings", () => {
    expect(getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com" }).configured).toBe(false);
  });

  it("reports ready without returning secret values", () => {
    const result = getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com", SHOPIFY_ADMIN_ACCESS_TOKEN: "secret" });
    expect(result.configured).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it("builds only a valid Shopify Admin endpoint",()=>{expect(getShopifyAdminEndpoint("MTE.myshopify.com","2026-01")).toBe("https://mte.myshopify.com/admin/api/2026-01/graphql.json");expect(()=>getShopifyAdminEndpoint("example.com","2026-01")).toThrow("invalid");});
});
