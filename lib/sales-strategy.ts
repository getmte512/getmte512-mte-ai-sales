export type StrategyContact={id:string;companyName:string;score:number;emailHealth:string;nextAction:string};
export type StrategyDraft={contactId:string;status:string};
export type StrategyPipeline={contactId:string;stage:string;nextFollowUpOn:string|null};
export type StrategySample={contactId:string;followUpAt:string|null;deliveredAt:string|null};
export type StrategyAction={contactId:string;companyName:string;priority:number;action:string;reason:string};

export function buildDailySalesStrategy(input:{today:string;contacts:StrategyContact[];drafts:StrategyDraft[];pipeline:StrategyPipeline[];samples:StrategySample[]}){
 const actions:StrategyAction[]=[];
 for(const contact of input.contacts){
  if(contact.emailHealth==="suppressed")continue;
  const draft=input.drafts.find(item=>item.contactId===contact.id);
  const pipeline=input.pipeline.find(item=>item.contactId===contact.id);
  const sample=input.samples.find(item=>item.contactId===contact.id&&item.followUpAt&&item.followUpAt.slice(0,10)<=input.today);
  let priority=contact.score;let action=contact.nextAction;let reason=`Lead score ${contact.score}`;
  if(draft?.status==="approved"){priority+=100;action="Prepare approved outreach";reason="Approved message is ready for manual sending";}
  else if(draft?.status==="awaiting_approval"){priority+=90;action="Review outreach draft";reason="Draft is waiting for approval";}
  else if(sample){priority+=85;action="Follow up on sample";reason=sample.deliveredAt?"Sample delivered and follow-up is due":"Sample follow-up date is due";}
  else if(pipeline?.nextFollowUpOn&&pipeline.nextFollowUpOn<=input.today){priority+=80;action="Complete scheduled follow-up";reason=`Pipeline follow-up due ${pipeline.nextFollowUpOn}`;}
  else if(contact.nextAction==="Review for personalized outreach"){priority+=60;action="Create personalized outreach draft";reason="Research and contactability are ready";}
  actions.push({contactId:contact.id,companyName:contact.companyName,priority,action,reason});
 }
 const sorted=actions.sort((a,b)=>b.priority-a.priority);
 return{actions:sorted,topActions:sorted.slice(0,10),summary:{accounts:input.contacts.length,approvedDrafts:input.drafts.filter(d=>d.status==="approved").length,awaitingApproval:input.drafts.filter(d=>d.status==="awaiting_approval").length,dueFollowUps:input.pipeline.filter(p=>p.nextFollowUpOn&&p.nextFollowUpOn<=input.today).length,sampleFollowUps:input.samples.filter(s=>s.followUpAt&&s.followUpAt.slice(0,10)<=input.today).length}};
}
