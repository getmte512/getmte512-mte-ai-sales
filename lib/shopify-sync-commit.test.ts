import { describe, expect, it } from "vitest";
import { buildOrderSyncRows, buildProductSyncRows, syncCounts } from "./shopify-sync-commit";

describe("Shopify sync commit payloads", () => {
  it("maps order previews including repeatable line snapshots", () => {
    const lines=[{productId:"gid://shopify/Product/1",title:"Energy",quantity:2}];
    expect(buildOrderSyncRows([{id:"gid://shopify/Order/1",name:"#1001",createdAt:"2026-08-17T12:00:00Z",financialStatus:"PAID",fulfillmentStatus:"FULFILLED",amount:42,currencyCode:"USD",crmContactId:"11111111-1111-1111-1111-111111111111",lines}])).toEqual([{shopify_order_gid:"gid://shopify/Order/1",order_name:"#1001",contact_id:"11111111-1111-1111-1111-111111111111",financial_status:"PAID",fulfillment_status:"FULFILLED",amount:42,currency_code:"USD",ordered_at:"2026-08-17T12:00:00Z",lines}]);
  });

  it("maps product previews and preserves nullable price/currency", () => {
    expect(buildProductSyncRows([{id:"gid://shopify/Product/1",title:"Energy",status:"ACTIVE",totalInventory:8,variantCount:2}])).toEqual([{shopify_product_gid:"gid://shopify/Product/1",title:"Energy",status:"ACTIVE",total_inventory:8,variant_count:2,min_price:null,currency_code:null}]);
  });

  it("derives exception counts and rejects impossible counts", () => {
    expect(syncCounts(10,7)).toEqual({reviewed:10,imported:7,exceptions:3});
    expect(()=>syncCounts(2,3)).toThrow("Invalid Shopify sync counts.");
  });
});
