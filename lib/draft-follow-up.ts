type PipelineSnapshot={stage:string;next_follow_up_on:string|null;notes:string|null;opening_order_value:number|null;ordered_on:string|null;reorder_follow_up_on:string|null}|null;

export function buildSentDraftPipelineUpdate(input:{purpose:"initial_outreach"|"reorder_follow_up";contactId:string;saved:PipelineSnapshot;followUpOn:string}){
  const protectedStages=["sample_planned","sample_sent","follow_up_due","ordered","not_interested"];
  const saved=input.saved;
  const isReorder=input.purpose==="reorder_follow_up";
  return{
    contact_id:input.contactId,
    stage:saved&&protectedStages.includes(saved.stage)?saved.stage:"contacted",
    next_follow_up_on:isReorder?saved?.next_follow_up_on??"":saved?.next_follow_up_on??input.followUpOn,
    notes:saved?.notes??(isReorder?"Reorder follow-up sent; check for a reply in three days.":"Initial outreach sent; follow up in three days."),
    opening_order_value:saved?.opening_order_value??"",
    ordered_on:saved?.ordered_on??"",
    reorder_follow_up_on:isReorder?input.followUpOn:saved?.reorder_follow_up_on??""
  };
}
