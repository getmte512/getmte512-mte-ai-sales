import{z}from"zod";

export const reconciliationDecisionSchema=z.object({
  confirmation:z.literal("RECORD_SHOPIFY_RECONCILIATION_DECISION"),
  shopifyCustomerGid:z.string().regex(/^gid:\/\/shopify\/Customer\/\d+$/),
  customerName:z.string().trim().min(1).max(200),
  decision:z.enum(["needs_research","manual_match","ignored"]),
  contactId:z.string().uuid().nullable(),
  reviewNote:z.string().trim().max(500).optional().default("")
}).superRefine((value,context)=>{
  if(value.decision==="manual_match"&&!value.contactId)context.addIssue({code:"custom",path:["contactId"],message:"A CRM contact is required for a manual match."});
});

export const manualMatchApprovalSchema=z.object({confirmation:z.literal("APPROVE_REVIEWED_MANUAL_MATCHES"),decisionIds:z.array(z.string().uuid()).min(1).max(250)});

export function summarizeReconciliationDecisions(decisions:{decision:string}[]){return{
  total:decisions.length,
  needsResearch:decisions.filter(item=>item.decision==="needs_research").length,
  manualMatches:decisions.filter(item=>item.decision==="manual_match").length,
  ignored:decisions.filter(item=>item.decision==="ignored").length
};}

export function selectUnapprovedManualMatches<T extends{shopify_customer_gid:string}>(decisions:T[],approvedCustomerGids:string[]){const approved=new Set(approvedCustomerGids);return decisions.filter(decision=>!approved.has(decision.shopify_customer_gid));}
