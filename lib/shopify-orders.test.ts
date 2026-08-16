import {describe,expect,it} from "vitest";
import {summarizeShopifyOrders} from "./shopify-orders";

describe("Shopify order summary",()=>{
  it("totals revenue and fulfillment work",()=>{const result=summarizeShopifyOrders([
    {id:"1",name:"#1",createdAt:"2026-01-01",financialStatus:"PAID",fulfillmentStatus:"UNFULFILLED",amount:125,currencyCode:"USD",crmContactId:"c1"},
    {id:"2",name:"#2",createdAt:"2026-01-02",financialStatus:"PAID",fulfillmentStatus:"FULFILLED",amount:75,currencyCode:"USD",crmContactId:null}
  ]);expect(result).toMatchObject({total:2,matched:1,unfulfilled:1,revenue:200,currencyCode:"USD"});});
  it("handles an empty preview",()=>expect(summarizeShopifyOrders([])).toMatchObject({total:0,revenue:0,currencyCode:"USD"}));
});
