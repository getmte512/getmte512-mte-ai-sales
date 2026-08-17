import{describe,expect,it}from"vitest";
import{buildSentDraftPipelineUpdate}from"./draft-follow-up";

const base={contactId:"123e4567-e89b-12d3-a456-426614174000",saved:null,followUpOn:"2026-08-20"};
describe("sent draft follow-up scheduling",()=>{
  it("schedules initial outreach on the general follow-up date",()=>expect(buildSentDraftPipelineUpdate({...base,purpose:"initial_outreach"})).toMatchObject({stage:"contacted",next_follow_up_on:"2026-08-20",reorder_follow_up_on:"",notes:"Initial outreach sent; follow up in three days."}));
  it("schedules reorder outreach on the reorder follow-up date",()=>expect(buildSentDraftPipelineUpdate({...base,purpose:"reorder_follow_up"})).toMatchObject({stage:"contacted",next_follow_up_on:"",reorder_follow_up_on:"2026-08-20",notes:"Reorder follow-up sent; check for a reply in three days."}));
  it("preserves an ordered account stage and order values",()=>expect(buildSentDraftPipelineUpdate({...base,purpose:"reorder_follow_up",saved:{stage:"ordered",next_follow_up_on:null,notes:"Account note",opening_order_value:500,ordered_on:"2026-07-01",reorder_follow_up_on:"2026-08-01"}})).toMatchObject({stage:"ordered",opening_order_value:500,ordered_on:"2026-07-01",reorder_follow_up_on:"2026-08-20"}));
});
