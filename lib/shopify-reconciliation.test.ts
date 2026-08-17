import{describe,expect,it}from"vitest";
import{manualMatchApprovalSchema,reconciliationDecisionSchema,selectUnapprovedManualMatches,summarizeReconciliationDecisions}from"./shopify-reconciliation";

const base={confirmation:"RECORD_SHOPIFY_RECONCILIATION_DECISION",shopifyCustomerGid:"gid://shopify/Customer/123",customerName:"Example Retailer",reviewNote:"Reviewed by sales"};
describe("Shopify reconciliation decisions",()=>{
  it("accepts a held research decision without a CRM contact",()=>expect(reconciliationDecisionSchema.safeParse({...base,decision:"needs_research",contactId:null}).success).toBe(true));
  it("requires a CRM contact for a manual match",()=>expect(reconciliationDecisionSchema.safeParse({...base,decision:"manual_match",contactId:null}).success).toBe(false));
  it("accepts a confirmed manual match",()=>expect(reconciliationDecisionSchema.safeParse({...base,decision:"manual_match",contactId:"123e4567-e89b-12d3-a456-426614174000"}).success).toBe(true));
  it("requires explicit approval and valid decision IDs",()=>expect(manualMatchApprovalSchema.safeParse({confirmation:"APPROVE_REVIEWED_MANUAL_MATCHES",decisionIds:["123e4567-e89b-12d3-a456-426614174000"]}).success).toBe(true));
  it("rejects an empty manual-match approval",()=>expect(manualMatchApprovalSchema.safeParse({confirmation:"APPROVE_REVIEWED_MANUAL_MATCHES",decisionIds:[]}).success).toBe(false));
  it("removes customer links that were already approved",()=>expect(selectUnapprovedManualMatches([{shopify_customer_gid:"gid://shopify/Customer/1"},{shopify_customer_gid:"gid://shopify/Customer/2"}],["gid://shopify/Customer/1"])).toEqual([{shopify_customer_gid:"gid://shopify/Customer/2"}]));
  it("summarizes the review queue",()=>expect(summarizeReconciliationDecisions([{decision:"needs_research"},{decision:"manual_match"},{decision:"ignored"},{decision:"needs_research"}])).toEqual({total:4,needsResearch:2,manualMatches:1,ignored:1}));
});
