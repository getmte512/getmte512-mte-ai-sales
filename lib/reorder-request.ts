import{z}from"zod";
const reorderLines=z.array(z.object({productId:z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/),title:z.string().trim().min(1).max(300),quantity:z.number().int().min(1).max(1000),unitPrice:z.number().min(0).max(100000)})).min(1).max(100);
export const reorderRequestSchema=z.object({confirmation:z.literal("SUBMIT_FOR_INTERNAL_REVIEW"),contactId:z.string().uuid().nullable(),currencyCode:z.string().regex(/^[A-Z]{3}$/),customerNote:z.string().trim().max(1000).default(""),lines:reorderLines});
export const retailerCheckoutSchema=z.object({confirmation:z.literal("CUSTOMER_CONFIRM_SHOPIFY_CHECKOUT"),currencyCode:z.string().regex(/^[A-Z]{3}$/),customerNote:z.string().trim().max(1000).default(""),lines:reorderLines});
export const reorderDecisionSchema=z.object({id:z.string().uuid(),decision:z.enum(["approved","declined"]),confirmation:z.literal("CONFIRM_INTERNAL_REVIEW_DECISION")});
export function calculateReorderRequestTotal(lines:{quantity:number;unitPrice:number}[]){return Math.round(lines.reduce((sum,line)=>sum+line.quantity*line.unitPrice,0)*100)/100;}
