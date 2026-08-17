import{z}from"zod";

export const revokeShopifyLinkSchema=z.object({
  linkId:z.string().uuid(),
  confirmation:z.literal("REVOKE_SHOPIFY_CRM_LINK"),
  reason:z.string().trim().min(5).max(300)
});

export function summarizeShopifyLinks(links:{match_confidence:string;updated_at:string}[]){return{
  total:links.length,
  exact:links.filter(link=>link.match_confidence==="exact").length,
  reviewed:links.filter(link=>link.match_confidence==="strong").length,
  latestUpdate:links.map(link=>link.updated_at).sort().at(-1)??null
};}
