import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSales } from "@/lib/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreLead } from "@/lib/lead-scoring";
import { applyLeadScoreAdjustment } from "@/lib/lead-score-adjustments";
import { buildDailySalesStrategy } from "@/lib/sales-strategy";

export default async function SalesStrategyPage(){
 try{await requireSales();}catch(error){if(error instanceof Error&&error.message==="UNAUTHORIZED")redirect("/login");throw error;}
 const supabase=createAdminClient();
 const [contactsResult,draftsResult,pipelineResult,samplesResult,evidenceResult,adjustmentsResult]=await Promise.all([
  supabase.from("contact_crm").select("*").limit(500),
  supabase.from("outreach_drafts").select("contact_id,status"),
  supabase.from("sales_pipeline").select("contact_id,stage,next_follow_up_on"),
  supabase.from("sample_shipments").select("contact_id,follow_up_at,delivered_at"),
  supabase.from("contact_research_evidence").select("contact_id,confidence,researched_at").order("researched_at",{ascending:false}),
  supabase.from("lead_score_adjustments").select("contact_id,adjustment,created_at").order("created_at",{ascending:false}),
 ]);
 for(const result of [contactsResult,draftsResult,pipelineResult,samplesResult,evidenceResult,adjustmentsResult])if(result.error)throw result.error;
 const evidence=new Map<string,{confidence:"medium"|"high"}>();for(const row of evidenceResult.data??[])if(!evidence.has(row.contact_id))evidence.set(row.contact_id,{confidence:row.confidence as "medium"|"high"});
 const adjustments=new Map<string,number>();for(const row of adjustmentsResult.data??[])if(!adjustments.has(row.contact_id))adjustments.set(row.contact_id,row.adjustment);
 const contacts=(contactsResult.data??[]).map(contact=>{const scored=scoreLead({...contact,research_confidence:evidence.get(contact.id)?.confidence??null});return{id:contact.id,companyName:contact.company_name,score:applyLeadScoreAdjustment(scored.score,adjustments.get(contact.id)),emailHealth:contact.email_health,nextAction:scored.nextAction};});
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Pacific/Honolulu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const strategy=buildDailySalesStrategy({today,contacts,drafts:(draftsResult.data??[]).map(d=>({contactId:d.contact_id,status:d.status})),pipeline:(pipelineResult.data??[]).map(p=>({contactId:p.contact_id,stage:p.stage,nextFollowUpOn:p.next_follow_up_on})),samples:(samplesResult.data??[]).map(s=>({contactId:s.contact_id,followUpAt:s.follow_up_at,deliveredAt:s.delivered_at}))});
 const sent=(draftsResult.data??[]).filter(d=>d.status==="sent").length;const orders=(pipelineResult.data??[]).filter(p=>p.stage==="ordered"||p.stage==="won").length;const samples=(pipelineResult.data??[]).filter(p=>["sample_planned","sample_sent","sample_delivered"].includes(p.stage)).length;
 return <main><header className="topbar"><div><span className="eyebrow">MORE THAN ENERGY</span><h1>Daily Sales Strategy</h1></div><Link className="sign-out-button" href="/">Back to CRM</Link></header><section className="workspace">
  <div className="panel"><div className="panel-heading"><div><span className="section-label">MILESTONE 6</span><h2>Today&apos;s prioritized sales actions</h2><p>Ranked from CRM score, approval state, scheduled follow-ups, sample follow-ups, and suppression status. Nothing is sent automatically.</p></div></div><div className="research-summary"><button><strong>{contacts.length}</strong><span>Accounts</span></button><button><strong>{sent}</strong><span>Outreach sent</span></button><button><strong>{samples}</strong><span>Sample stage</span></button><button><strong>{orders}</strong><span>Converted orders</span></button></div></div>
  <div className="panel"><div className="panel-heading"><div><span className="section-label">ACTION QUEUES</span><h2>What needs attention</h2></div></div><div className="research-summary"><button><strong>{strategy.summary.approvedDrafts}</strong><span>Approved to prepare</span></button><button><strong>{strategy.summary.awaitingApproval}</strong><span>Awaiting approval</span></button><button><strong>{strategy.summary.dueFollowUps}</strong><span>Follow-ups due</span></button><button><strong>{strategy.summary.sampleFollowUps}</strong><span>Sample follow-ups</span></button></div></div>
  <div className="activity-list">{strategy.topActions.map((item,index)=><article className="panel" key={item.contactId}><div className="match-row"><div><strong>#{index+1} · {item.companyName}</strong><p>{item.action}</p><p>{item.reason}</p></div><span className="badge valid">Priority {item.priority}</span></div></article>)}{!strategy.topActions.length&&<div className="panel empty">No actionable accounts are waiting today.</div>}</div>
 </section></main>;
}
