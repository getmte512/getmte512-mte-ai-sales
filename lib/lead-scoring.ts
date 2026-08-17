export type LeadScoringInput = { buyer_name:string|null; job_title:string|null; email:string|null; phone:string|null; linkedin_url?:string|null; website?:string|null; category:string|null; state:string|null; notes?:string|null; completeness:string; email_health:string; research_confidence?:"medium"|"high"|null; researched_at?:string|null };
export type LeadScore = { score:number; tier:"high"|"medium"|"low"; reasons:string[]; nextAction:string };
export function scoreLead(contact: LeadScoringInput): LeadScore {
  let score=20; const reasons:string[]=[];
  if(contact.buyer_name){score+=15;reasons.push("Named buyer")} if(contact.job_title){score+=10;reasons.push("Role identified")}
  if(contact.email){score+=20;reasons.push("Email available")} if(contact.phone){score+=8;reasons.push("Phone available")}
  if(contact.linkedin_url){score+=7;reasons.push("LinkedIn available")} if(contact.website){score+=5;reasons.push("Website available")}
  if(contact.category){score+=5;reasons.push("Category known")} if(contact.state){score+=5;reasons.push("Market known")}
  if(contact.completeness==="complete")score+=10; else if(contact.completeness==="usable")score+=5;
  if(contact.email_health==="historically_delivered"){score+=10;reasons.push("Previously delivered")}
  else if(contact.email_health==="delivery_risk"){score-=20;reasons.push("Delivery risk")}
  else if(contact.email_health==="suppressed"){score=0;reasons.push("Do not contact")}
  if(contact.research_confidence==="high"){score+=5;reasons.push("High-confidence research source")}
  else if(contact.research_confidence==="medium")reasons.push("Research source recorded");
  else if(contact.buyer_name&&contact.job_title){score-=10;reasons.push("Research source not recorded")}
  score=Math.max(0,Math.min(100,score)); const tier=score>=70?"high":score>=45?"medium":"low";
  const nextAction=contact.email_health==="suppressed"?"Keep suppressed":(!contact.buyer_name||!contact.job_title)&&contact.notes?.trim()?"Verification required":!contact.buyer_name||!contact.job_title?"Research buyer and role":!contact.email?"Find a verified business email":contact.email_health==="delivery_risk"?"Verify email before outreach":!contact.research_confidence?"Verification required":"Review for personalized outreach";
  return {score,tier,reasons,nextAction};
}
