export type OutreachChannel="email"|"linkedin"|"text";
export type DraftStatus="draft"|"awaiting_approval"|"approved"|"rejected"|"sent";

const transitions:Record<DraftStatus,DraftStatus[]>={
  draft:["awaiting_approval"],
  awaiting_approval:["draft","approved","rejected"],
  approved:["sent","draft"],
  rejected:["draft","awaiting_approval"],
  sent:[],
};

export function canTransitionDraft(from:DraftStatus,to:DraftStatus){return transitions[from].includes(to);}
export function transitionNeedsAdmin(to:DraftStatus){return to==="approved"||to==="rejected";}

export function outreachEligibility(input:{channel:OutreachChannel;email?:string|null;phone?:string|null;linkedinUrl?:string|null;suppressed?:boolean;textConsent?:boolean}){
  if(input.suppressed)return{eligible:false,reason:`${input.channel} outreach is suppressed for this contact.`};
  if(input.channel==="email"&&!input.email)return{eligible:false,reason:"A recipient email is required before approval."};
  if(input.channel==="linkedin"&&!input.linkedinUrl)return{eligible:false,reason:"A LinkedIn profile is required before approval."};
  if(input.channel==="text"&&!input.phone)return{eligible:false,reason:"A recipient phone number is required before approval."};
  if(input.channel==="text"&&!input.textConsent)return{eligible:false,reason:"Explicit text-message opt-in consent is required before approval."};
  return{eligible:true,reason:"Channel is eligible for approval."};
}
