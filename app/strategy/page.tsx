import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSales } from "@/lib/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreLead } from "@/lib/lead-scoring";
import { applyLeadScoreAdjustment } from "@/lib/lead-score-adjustments";
import { buildDailySalesStrategy } from "@/lib/sales-strategy";
import { scoreReplyPriority } from "@/lib/reply-priority";
import { buildSalesCommandCenter } from "@/lib/sales-command-center";

export default async function SalesStrategyPage(){
 try{await requireSales();}catch(error){if(error instanceof Error&&error.message==="UNAUTHORIZED")redirect("/login");throw error;}
 const supabase=createAdminClient();
 const [contactsResult,draftsResult,pipelineResult,samplesResult,evidenceResult,adjustmentsResult,repliesResult,recommendationsResult,tasksResult,prospectsResult]=await Promise.all([
  supabase.from("contact_crm").select("*").limit(500),
  supabase.from("outreach_drafts").select("contact_id,status"),
  supabase.from("sales_pipeline").select("contact_id,stage,next_follow_up_on"),
  supabase.from("sample_shipments").select("contact_id,follow_up_at,delivered_at"),
  supabase.from("contact_research_evidence").select("contact_id,confidence,researched_at").order("researched_at",{ascending:false}),
  supabase.from("lead_score_adjustments").select("contact_id,adjustment,created_at").order("created_at",{ascending:false}),
  supabase.from("outreach_replies").select("id,contact_id,received_at,review_status,matched_by").eq("review_status","unreviewed").order("received_at",{ascending:true}).limit(200),
  supabase.from("conversation_recommendations").select("reply_id,intent_label,confidence,status").order("created_at",{ascending:false}).limit(500),
  supabase.from("sales_tasks").select("id,contact_id,title,due_at,completed_at").is("completed_at",null).order("due_at",{ascending:true,nullsFirst:false}).limit(300),
  supabase.from("prospect_discovery_candidates").select("id,company_name,buyer_name,confidence,status,discovered_at").eq("status","pending").order("discovered_at",{ascending:true}).limit(200),
 ]);
 for(const result of [contactsResult,draftsResult,pipelineResult,samplesResult,evidenceResult,adjustmentsResult,repliesResult,recommendationsResult,tasksResult,prospectsResult])if(result.error)throw result.error;
 const evidence=new Map<string,{confidence:"medium"|"high"}>();for(const row of evidenceResult.data??[])if(!evidence.has(row.contact_id))evidence.set(row.contact_id,{confidence:row.confidence as "medium"|"high"});
 const adjustments=new Map<string,number>();for(const row of adjustmentsResult.data??[])if(!adjustments.has(row.contact_id))adjustments.set(row.contact_id,row.adjustment);
 const contacts=(contactsResult.data??[]).map(contact=>{const scored=scoreLead({...contact,research_confidence:evidence.get(contact.id)?.confidence??null});return{id:contact.id,companyName:contact.company_name,score:applyLeadScoreAdjustment(scored.score,adjustments.get(contact.id)),emailHealth:contact.email_health,nextAction:scored.nextAction};});
 const companyByContact=new Map(contacts.map(contact=>[contact.id,contact.companyName]));
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Pacific/Honolulu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const strategy=buildDailySalesStrategy({today,contacts,drafts:(draftsResult.data??[]).map(d=>({contactId:d.contact_id,status:d.status})),pipeline:(pipelineResult.data??[]).map(p=>({contactId:p.contact_id,stage:p.stage,nextFollowUpOn:p.next_follow_up_on})),samples:(samplesResult.data??[]).map(s=>({contactId:s.contact_id,followUpAt:s.follow_up_at,deliveredAt:s.delivered_at}))});
 const recommendationByReply=new Map<string,{intent_label:string;confidence:string;status:string}>();for(const row of recommendationsResult.data??[])if(!recommendationByReply.has(row.reply_id))recommendationByReply.set(row.reply_id,{intent_label:row.intent_label,confidence:row.confidence,status:row.status});
 const nowMs=Date.now();
 const command=buildSalesCommandCenter({today,nowMs,replies:(repliesResult.data??[]).map(reply=>{const recommendation=recommendationByReply.get(reply.id)??null;const scored=scoreReplyPriority({received_at:reply.received_at,review_status:reply.review_status,matched_by:reply.matched_by,recommendation},nowMs);return{id:reply.id,contactId:reply.contact_id,companyName:reply.contact_id?companyByContact.get(reply.contact_id)??null:null,receivedAt:reply.received_at,reviewStatus:reply.review_status,priorityScore:scored.score,priorityReasons:scored.reasons};}),tasks:(tasksResult.data??[]).map(task=>({id:task.id,contactId:task.contact_id,companyName:companyByContact.get(task.contact_id)??null,title:task.title,dueAt:task.due_at,completedAt:task.completed_at})),prospects:(prospectsResult.data??[]).map(prospect=>({id:prospect.id,companyName:prospect.company_name,buyerName:prospect.buyer_name,confidence:prospect.confidence,status:prospect.status,discoveredAt:prospect.discovered_at})),accountActions:strategy.actions});
 const sent=(draftsResult.data??[]).filter(d=>d.status==="sent").length;const orders=(pipelineResult.data??[]).filter(p=>p.stage==="ordered"||p.stage==="won").length;const samples=(pipelineResult.data??[]).filter(p=>["sample_planned","sample_sent","sample_delivered"].includes(p.stage)).length;
 return <main><header className="topbar"><div><span className="eyebrow">MORE THAN ENERGY</span><h1>Daily Sales Command Center</h1></div><Link className="sign-out-button" href="/">Back to CRM</Link></header><section className="workspace">
  <div className="panel"><div className="panel-heading"><div><span className="section-label">MILESTONE 14</span><h2>What should I do next?</h2><p>One transparent queue across buyer replies, sales tasks, prospect reviews, and account actions. Ranking is advisory and deterministic. Nothing here sends outreach, approves a draft, changes pipeline state, or completes a task automatically.</p></div></div><div className="research-summary"><button><strong>{command.summary.buyerReplies}</strong><span>Buyer replies</span></button><button><strong>{command.summary.openTasks}</strong><span>Open tasks</span></button><button><strong>{command.summary.prospectReviews}</strong><span>Prospects to review</span></button><button><strong>{command.summary.accountActions}</strong><span>Account actions</span></button></div></div>
  <div className="activity-list">{command.topItems.map((item,index)=><article className="panel" key={item.id}><div className="match-row"><div><strong>#{index+1} · {item.title}</strong><p>{item.action}</p><p>{item.reason}</p><Link href={item.href}>Open workspace</Link></div><span className="badge valid">Priority {item.priority}</span></div></article>)}{!command.topItems.length&&<div className="panel empty">No sales actions are waiting right now.</div>}</div>
  <div className="panel"><div className="panel-heading"><div><span className="section-label">ACCOUNT STRATEGY</span><h2>Existing account-level signals</h2><p>The original lead, draft, pipeline, and sample strategy remains visible underneath the unified queue.</p></div></div><div className="research-summary"><button><strong>{contacts.length}</strong><span>Accounts</span></button><button><strong>{sent}</strong><span>Outreach sent</span></button><button><strong>{samples}</strong><span>Sample stage</span></button><button><strong>{orders}</strong><span>Converted orders</span></button></div></div>
  <div className="panel"><div className="panel-heading"><div><span className="section-label">ACTION QUEUES</span><h2>Account workflow counts</h2></div></div><div className="research-summary"><button><strong>{strategy.summary.approvedDrafts}</strong><span>Approved to prepare</span></button><button><strong>{strategy.summary.awaitingApproval}</strong><span>Awaiting approval</span></button><button><strong>{strategy.summary.dueFollowUps}</strong><span>Follow-ups due</span></button><button><strong>{strategy.summary.sampleFollowUps}</strong><span>Sample follow-ups</span></button></div></div>
 </section></main>;
}
