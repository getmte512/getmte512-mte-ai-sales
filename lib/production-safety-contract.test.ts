import{describe,expect,it}from"vitest";import{roleAllows}from"./app-role";import{canTransitionDraft,outreachEligibility,transitionNeedsAdmin}from"./outreach-approval";import{buildShopifyCartUrl}from"./shopify-cart";
describe("production safety contract",()=>{
 it("keeps retailer and sales roles isolated",()=>{expect(roleAllows("retailer","sales")).toBe(false);expect(roleAllows("sales","retailer")).toBe(false)});
 it("requires admin review before outreach approval",()=>{expect(transitionNeedsAdmin("approved")).toBe(true);expect(canTransitionDraft("draft","approved")).toBe(false);expect(canTransitionDraft("awaiting_approval","approved")).toBe(true)});
 it("blocks suppressed outreach and unconsented text",()=>{expect(outreachEligibility({channel:"email",email:"buyer@example.com",suppressed:true}).eligible).toBe(false);expect(outreachEligibility({channel:"text",phone:"+15555550100",textConsent:false}).eligible).toBe(false)});
 it("only hands orders to an HTTPS Shopify cart",()=>expect(buildShopifyCartUrl("mte.myshopify.com",[{variantGid:"gid://shopify/ProductVariant/123",quantity:1}])).toBe("https://mte.myshopify.com/cart/123:1"));
});
