import{z}from"zod";
export const shopifyApprovalSchema=z.object({confirmation:z.literal("APPROVE_READ_ONLY_CUSTOMER_LINKS"),matches:z.array(z.object({shopifyCustomerGid:z.string().regex(/^gid:\/\/shopify\/Customer\/\d+$/),contactId:z.string().uuid(),confidence:z.enum(["exact","strong"]),reasons:z.array(z.string().trim().min(1).max(100)).max(5)})).min(1).max(250)});
export function countApprovalExceptions(total:number,approved:number){return Math.max(0,total-approved);}
