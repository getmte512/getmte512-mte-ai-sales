import{describe,expect,it}from"vitest";import{recommendedSampleFollowUp,validatePipelineUpdate}from"./pipeline";
describe("pipeline policy",()=>{
 it("recommends follow-up two days after confirmed sample delivery",()=>expect(recommendedSampleFollowUp({deliveredAt:"2026-08-17T12:00:00.000Z"})).toBe("2026-08-19T12:00:00.000Z"));
 it("falls back to five days after shipment when delivery is unknown",()=>expect(recommendedSampleFollowUp({shippedAt:"2026-08-17T12:00:00.000Z"})).toBe("2026-08-22T12:00:00.000Z"));
 it("requires a recognized stage",()=>expect(()=>validatePipelineUpdate({stage:"invented"})).toThrow("Invalid pipeline stage."));
 it("normalizes an empty next action",()=>expect(validatePipelineUpdate({stage:"engaged",nextAction:"  "})).toEqual({stage:"engaged",nextAction:null}));
});