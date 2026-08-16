import { describe, expect, it } from "vitest";
import { getShopifyReadiness } from "./shopify-config";

describe("Shopify readiness", () => {
  it("does not report ready without both server-only settings", () => {
    expect(getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com" }).configured).toBe(false);
  });

  it("reports ready without returning secret values", () => {
    const result = getShopifyReadiness({ SHOPIFY_SHOP_DOMAIN: "mte.myshopify.com", SHOPIFY_ADMIN_ACCESS_TOKEN: "secret" });
    expect(result.configured).toBe(true);
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
