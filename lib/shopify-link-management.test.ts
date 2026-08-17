import{describe,expect,it}from"vitest";
import{revokeShopifyLinkSchema,summarizeShopifyLinks}from"./shopify-link-management";

describe("Shopify link management",()=>{
  it("requires explicit revocation and a reason",()=>expect(revokeShopifyLinkSchema.safeParse({linkId:"123e4567-e89b-12d3-a456-426614174000",confirmation:"REVOKE_SHOPIFY_CRM_LINK",reason:"Customer was matched to the wrong company."}).success).toBe(true));
  it("rejects an unexplained revocation",()=>expect(revokeShopifyLinkSchema.safeParse({linkId:"123e4567-e89b-12d3-a456-426614174000",confirmation:"REVOKE_SHOPIFY_CRM_LINK",reason:"no"}).success).toBe(false));
  it("summarizes exact and reviewed links",()=>expect(summarizeShopifyLinks([{match_confidence:"exact",updated_at:"2026-08-10T00:00:00Z"},{match_confidence:"strong",updated_at:"2026-08-12T00:00:00Z"}])).toEqual({total:2,exact:1,reviewed:1,latestUpdate:"2026-08-12T00:00:00Z"}));
});
