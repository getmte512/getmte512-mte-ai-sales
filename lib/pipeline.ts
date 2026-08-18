export const pipelineStages=["prospect","contacted","engaged","sample_planned","sample_sent","sample_delivered","follow_up_due","negotiating","ordered","won","lost","not_interested"] as const;
export type PipelineStage=typeof pipelineStages[number];

export function recommendedSampleFollowUp(input:{shippedAt?:string|null;deliveredAt?:string|null}){
 const anchor=input.deliveredAt??input.shippedAt;
 if(!anchor)return null;
 const date=new Date(anchor); if(Number.isNaN(date.getTime()))return null;
 date.setUTCDate(date.getUTCDate()+(input.deliveredAt?2:5));
 return date.toISOString();
}

export function validatePipelineUpdate(input:{stage:string;nextAction?:string|null}){
 if(!pipelineStages.includes(input.stage as PipelineStage))throw new Error("Invalid pipeline stage.");
 const nextAction=input.nextAction?.trim()||null;
 if(nextAction&&nextAction.length>500)throw new Error("Next action must be 500 characters or fewer.");
 return{stage:input.stage as PipelineStage,nextAction};
}
