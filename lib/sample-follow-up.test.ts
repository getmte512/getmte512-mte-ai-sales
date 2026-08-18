import{describe,expect,it}from"vitest";import{recommendedSampleFollowUp,validateSampleTimeline}from"./sample-follow-up";
describe("sample follow-up",()=>{
 it("recommends follow-up two days after confirmed delivery",()=>expect(recommendedSampleFollowUp("2026-08-17")).toBe("2026-08-19"));
 it("handles month boundaries",()=>expect(recommendedSampleFollowUp("2026-08-31")).toBe("2026-09-02"));
 it("rejects delivery before shipment",()=>expect(()=>validateSampleTimeline({sentOn:"2026-08-18",deliveredOn:"2026-08-17"})).toThrow());
});
