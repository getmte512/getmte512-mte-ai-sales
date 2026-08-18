import{describe,expect,it}from"vitest";import{canTransitionDraft,outreachEligibility,transitionNeedsAdmin}from"./outreach-approval";
describe("outreach approval policy",()=>{
 it("prevents skipping approval and reopening sent messages",()=>{expect(canTransitionDraft("draft","approved")).toBe(false);expect(canTransitionDraft("awaiting_approval","approved")).toBe(true);expect(canTransitionDraft("approved","sent")).toBe(true);expect(canTransitionDraft("sent","draft")).toBe(false)});
 it("reserves approval decisions for admins",()=>{expect(transitionNeedsAdmin("approved")).toBe(true);expect(transitionNeedsAdmin("rejected")).toBe(true);expect(transitionNeedsAdmin("sent")).toBe(false)});
 it("blocks suppressed and incomplete channels",()=>{expect(outreachEligibility({channel:"email",email:"a@b.com",suppressed:true}).eligible).toBe(false);expect(outreachEligibility({channel:"linkedin",linkedinUrl:null}).eligible).toBe(false)});
 it("requires explicit opt-in for text",()=>{expect(outreachEligibility({channel:"text",phone:"+15125550100",textConsent:false}).eligible).toBe(false);expect(outreachEligibility({channel:"text",phone:"+15125550100",textConsent:true}).eligible).toBe(true)});
});
