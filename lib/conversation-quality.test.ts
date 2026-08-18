import{describe,expect,it}from"vitest";import{summarizeConversationQuality}from"./conversation-quality";

describe("conversation recommendation quality",()=>{it("uses only reviewed recommendations and keeps guidance advisory",()=>{const rows=[
 {status:"accepted" as const,intent_label:"interested",confidence:"high" as const,model:"m",created_at:"2026-08-01"},
 {status:"dismissed" as const,intent_label:"interested",confidence:"high" as const,model:"m",created_at:"2026-08-02"},
 {status:"pending" as const,intent_label:"pricing_question",confidence:"medium" as const,model:"m",created_at:"2026-08-03"},
];const result=summarizeConversationQuality(rows);expect(result.reviewed).toBe(2);expect(result.accepted).toBe(1);expect(result.dismissed).toBe(1);expect(result.acceptanceRate).toBe(50);expect(result.byIntent[0]).toMatchObject({intent:"interested",reviewed:2,accepted:1,acceptanceRate:50});expect(result.advisories.join(" ")).toContain("before changing prompts or models")});

it("flags repeated weak intent acceptance without changing behavior",()=>{const rows=Array.from({length:5},(_,index)=>({status:index===0?"accepted" as const:"dismissed" as const,intent_label:"pricing_question",confidence:"medium" as const,model:"m",created_at:`2026-08-0${index+1}`}));const result=summarizeConversationQuality(rows);expect(result.byIntent[0].acceptanceRate).toBe(20);expect(result.advisories.some(item=>item.includes("pricing_question recommendations"))).toBe(true)});});
