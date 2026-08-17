import{describe,expect,it}from"vitest";
import{buildShopifySalesAnalytics}from"./shopify-sales-analytics";

const orders=[{amount:"100",currency_code:"USD",ordered_at:"2026-07-01T00:00:00Z",fulfillment_status:"FULFILLED"},{amount:50,currency_code:"USD",ordered_at:"2026-07-20T00:00:00Z",fulfillment_status:"UNFULFILLED"},{amount:200,currency_code:"USD",ordered_at:"2026-08-02T00:00:00Z",fulfillment_status:"FULFILLED"}];
describe("Shopify sales analytics",()=>{
  it("calculates revenue, average value, and fulfillment rate",()=>{const summary=buildShopifySalesAnalytics(orders).summary;expect(summary).toMatchObject({orders:3,revenue:350,currencyCode:"USD"});expect(summary.averageOrderValue).toBeCloseTo(350/3);expect(summary.fulfillmentRate).toBeCloseTo(200/3);});
  it("groups sales by month",()=>expect(buildShopifySalesAnalytics(orders).monthly).toEqual([{month:"2026-07",orders:2,revenue:150},{month:"2026-08",orders:1,revenue:200}]));
  it("returns safe zero values for an empty history",()=>expect(buildShopifySalesAnalytics([]).summary).toEqual({orders:0,revenue:0,averageOrderValue:0,fulfillmentRate:0,currencyCode:"USD"}));
});
