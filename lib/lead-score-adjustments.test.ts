import{describe,expect,it}from"vitest";import{applyLeadScoreAdjustment,validateLeadScoreAdjustment}from"./lead-score-adjustments";
describe("lead score adjustments",()=>{
 it("applies adjustments without leaving the 0-100 score range",()=>{expect(applyLeadScoreAdjustment(90,20)).toBe(100);expect(applyLeadScoreAdjustment(10,-20)).toBe(0);expect(applyLeadScoreAdjustment(60,5)).toBe(65)});
 it("requires a bounded non-zero whole-number adjustment",()=>{expect(()=>validateLeadScoreAdjustment({adjustment:0,reason:"No change"})).toThrow();expect(()=>validateLeadScoreAdjustment({adjustment:51,reason:"Too high"})).toThrow();expect(()=>validateLeadScoreAdjustment({adjustment:1.5,reason:"Fraction"})).toThrow()});
 it("requires a recorded reason",()=>{expect(()=>validateLeadScoreAdjustment({adjustment:5,reason:"  "})).toThrow();expect(validateLeadScoreAdjustment({adjustment:-10,reason:" Lower near-term fit "})).toEqual({adjustment:-10,reason:"Lower near-term fit"})});
});
