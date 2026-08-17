import{describe,expect,it}from"vitest";
import{buildShopifyCustomerInsights,recommendShopifyCustomerAction,summarizeShopifyCustomerInsights}from"./shopify-customer-insights";

const orders=[
  {contact_id:"contact-a",amount:"125.50",currency_code:"USD",ordered_at:"2026-08-10T00:00:00Z",fulfillment_status:"FULFILLED"},
  {contact_id:"contact-a",amount:75,currency_code:"USD",ordered_at:"2026-08-12T00:00:00Z",fulfillment_status:"UNFULFILLED"},
  {contact_id:"contact-b",amount:50,currency_code:"USD",ordered_at:"2026-08-11T00:00:00Z",fulfillment_status:"FULFILLED"},
  {contact_id:null,amount:500,currency_code:"USD",ordered_at:"2026-08-13T00:00:00Z",fulfillment_status:"FULFILLED"}
];
describe("Shopify customer insights",()=>{
  it("groups matched orders by CRM contact",()=>expect(buildShopifyCustomerInsights(orders)[0]).toEqual({contactId:"contact-a",orderCount:2,revenue:200.5,currencyCode:"USD",latestOrderAt:"2026-08-12T00:00:00Z",unfulfilledOrders:1}));
  it("excludes unmatched orders from customer value",()=>expect(buildShopifyCustomerInsights(orders)).toHaveLength(2));
  it("summarizes customer revenue and fulfillment",()=>expect(summarizeShopifyCustomerInsights(buildShopifyCustomerInsights(orders))).toEqual({customers:2,orders:3,revenue:250.5,unfulfilledOrders:1,currencyCode:"USD"}));
  it("prioritizes unfulfilled orders",()=>expect(recommendShopifyCustomerAction(buildShopifyCustomerInsights(orders)[0],"2026-08-17T00:00:00Z")).toMatchObject({priority:"urgent",action:"Review fulfillment"}));
  it("recommends reorder outreach after 30 days",()=>expect(recommendShopifyCustomerAction({...buildShopifyCustomerInsights(orders)[1],latestOrderAt:"2026-07-01T00:00:00Z"},"2026-08-17T00:00:00Z")).toMatchObject({priority:"high",action:"Prepare reorder outreach",ageDays:47}));
});
