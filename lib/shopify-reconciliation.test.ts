import{describe,expect,it}from"vitest";
import{reconciliationDecisionSchema,summarizeReconciliationDecisions}from"./shopify-reconciliation";

const base={confirmation:"RECORD_SHOPIFY_RECONCILIATION_DECISION",shopifyCustomerGid:"gid://shopify/Customer/123",customerName:"Example Retailer",reviewNote:"Reviewed by sales"};
describe("Shopify reconciliation decisions",()=>{
  it("accepts a held research decision without a CRM contact",()=>expect(reconciliationDecisionSchema.safeParse({...base,decision:"needs_research",contactId:null}).success).toBe(true));
  it("requires a CRM contact for a manual match",()=>expect(reconciliationDecisionSchema.safeParse({...base,decision:"manual_match",contactId:null}).success).toBe(false));
  it("accepts a confirmed manual match",()=>expect(reconciliationDecisionSchema.safeParse({...base,decision:"manual_match",contactId:"123e4567-e89b-12d3-a456-426614174000"}).success).toBe(true));
  it("summarizes the review queue",()=>expect(summarizeReconciliationDecisions([{decision:"needs_research"},{decision:"manual_match"},{decision:"ignored"},{decision:"needs_research"}])).toEqual({total:4,needsResearch:2,manualMatches:1,ignored:1}));
});
