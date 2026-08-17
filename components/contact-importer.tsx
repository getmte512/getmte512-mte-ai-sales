"use client";

import { useEffect, useMemo, useState } from "react";
import type { ImportPreview } from "@/lib/contact-import/types";
import { createOutreachDraft } from "@/lib/outreach-draft";
import { buildReorderRecommendations } from "@/lib/reorder-intelligence";

type CrmContact = {
  id: string;
  buyer_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  company_name: string;
  store_banner_name: string | null;
  category: string | null;
  state: string | null;
  linkedin_url: string | null;
  website: string | null;
  notes: string | null;
  completeness: string;
  email_health: string;
  score: number; tier: "high" | "medium" | "low"; reasons: string[]; nextAction: string;
};
type SavedDraft = { id:string; contact_id:string; channel:"email"|"linkedin"; subject:string; body:string; status:"draft"|"awaiting_approval"|"approved"|"rejected"|"sent"; updated_at:string };
type PipelineRecord = { id:string; contact_id:string; stage:string; next_follow_up_on:string|null; notes:string|null; opening_order_value:number|null; ordered_on:string|null; reorder_follow_up_on:string|null; updated_at:string };
type ShopifyStatus = { configured:boolean; shopConfigured:boolean; tokenConfigured:boolean; apiVersion:string; requiredScopes:string[] };
type ShopifyPreview = { summary:{total:number;matched:number;review:number;unmatched:number}; matches:{customer:{id:string;displayName:string;email:string|null;company:string|null};contactId:string|null;confidence:string;reasons:string[]}[] };
type ShopifyOrders = { summary:{total:number;matched:number;unfulfilled:number;revenue:number;currencyCode:string}; orders:{id:string;name:string;createdAt:string;financialStatus:string;fulfillmentStatus:string;amount:number;currencyCode:string;crmContactId:string|null}[] };
type ShopifyProducts = {summary:{total:number;active:number;lowStock:number;outOfStock:number;totalUnits:number};products:{id:string;title:string;status:string;totalInventory:number;variantCount:number}[]};
type ShopifyConnectionTest={connected:boolean;shopName:string;domain:string;apiVersion:string;scopes:{scope:string;granted:boolean}[];allRequiredScopes:boolean};
type ShopifyHistory={approvedLinks:number;runs:{id:string;sync_type:string;status:string;reviewed_count:number;imported_count:number;exception_count:number;created_at:string}[]};

export function ContactImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [search, setSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState<"all" | "usable" | "risk">("all");
  const [view, setView] = useState<"dashboard" | "import" | "crm" | "priorities" | "outreach" | "pipeline" | "reports" | "shopify" | "shopify_orders" | "shopify_products" | "reconciliation" | "shopify_test" | "shopify_approval" | "shopify_history" | "reorders">("dashboard");
  const [researchContact, setResearchContact] = useState<CrmContact | null>(null);
  const [skippedResearchIds, setSkippedResearchIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"all" | "ready" | "research" | "reviewed" | "risk">("all");
  const [draftContact, setDraftContact] = useState<CrmContact | null>(null);
  const [draftChannel, setDraftChannel] = useState<"email"|"linkedin">("email");
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  const [pipeline, setPipeline] = useState<PipelineRecord[]>([]);
  const [pipelineFilter, setPipelineFilter] = useState<"all" | "prospects" | "contacted" | "due" | "samples" | "orders">("all");
  const [shopifyStatus, setShopifyStatus] = useState<ShopifyStatus | null>(null);
  const [shopifyPreview, setShopifyPreview] = useState<ShopifyPreview | null>(null);
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrders | null>(null);
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProducts | null>(null);
  const [shopifyConnectionTest,setShopifyConnectionTest]=useState<ShopifyConnectionTest|null>(null);
  const [shopifyHistory,setShopifyHistory]=useState<ShopifyHistory|null>(null);

  const importable = useMemo(
    () => preview?.contacts.filter((contact) => contact.status === "valid" || contact.status === "warning") ?? [],
    [preview],
  );
  const priorityContacts = useMemo(() => contacts.filter((contact) => {
    if (priorityFilter === "ready") return contact.nextAction === "Review for personalized outreach";
    if (priorityFilter === "research") return contact.nextAction === "Research buyer and role" || contact.nextAction === "Find a verified business email";
    if (priorityFilter === "reviewed") return contact.nextAction === "Verification required";
    if (priorityFilter === "risk") return contact.email_health === "delivery_risk" || contact.email_health === "suppressed";
    return true;
  }).sort((a, b) => b.score - a.score), [contacts, priorityFilter]);
  const visibleContacts = useMemo(() => contacts.filter((contact) => {
    if (emailFilter === "usable") return contact.email_health !== "delivery_risk" && contact.email_health !== "suppressed";
    if (emailFilter === "risk") return contact.email_health === "delivery_risk" || contact.email_health === "suppressed";
    return true;
  }), [contacts, emailFilter]);
  const today = new Date().toISOString().slice(0,10);
  const pipelineContacts = useMemo(() => contacts.filter((contact) => {
    const item = pipeline.find((record) => record.contact_id === contact.id);
    if (pipelineFilter === "prospects") return !item || item.stage === "prospect";
    if (pipelineFilter === "contacted") return item?.stage === "contacted" || item?.stage === "follow_up_due";
    if (pipelineFilter === "due") return Boolean(item?.next_follow_up_on && item.next_follow_up_on <= today && item.stage !== "ordered" && item.stage !== "not_interested");
    if (pipelineFilter === "samples") return item?.stage === "sample_planned" || item?.stage === "sample_sent";
    if (pipelineFilter === "orders") return item?.stage === "ordered";
    return true;
  }).sort((a,b)=>b.score-a.score), [contacts, pipeline, pipelineFilter, today]);
  const dueFollowUps = pipeline.filter(item=>item.next_follow_up_on && item.next_follow_up_on<=today && item.stage!=="ordered" && item.stage!=="not_interested");
  const reorderDue = pipeline.filter(item=>item.reorder_follow_up_on && item.reorder_follow_up_on<=today);
  const openingOrderRevenue = pipeline.reduce((sum,item)=>sum+(item.opening_order_value??0),0);
  const reorderRecommendations=buildReorderRecommendations(pipeline.map(item=>{const contact=contacts.find(c=>c.id===item.contact_id);return{contactId:item.contact_id,companyName:contact?.company_name??"Unknown company",stage:item.stage,orderedOn:item.ordered_on,reorderFollowUpOn:item.reorder_follow_up_on,openingOrderValue:item.opening_order_value}}),today).filter(item=>item.stage==="ordered");
  const topStates=summarize(contacts.map(contact=>contact.state),5);
  const topCategories=summarize(contacts.map(contact=>contact.category),5);
  const funnel=[
    {label:"Imported",count:contacts.length},
    {label:"Researched",count:contacts.filter(c=>c.nextAction==="Review for personalized outreach").length},
    {label:"Drafted",count:drafts.length},
    {label:"Sent",count:drafts.filter(d=>d.status==="sent").length},
    {label:"Samples",count:pipeline.filter(p=>p.stage==="sample_planned"||p.stage==="sample_sent").length},
    {label:"Orders",count:pipeline.filter(p=>p.stage==="ordered").length}
  ];
  const recentActivity=[
    ...drafts.map(d=>({id:`draft-${d.id}`,contactId:d.contact_id,when:d.updated_at,title:`Outreach ${d.status.replaceAll("_"," ")}`,detail:`${d.channel} draft`})),
    ...pipeline.map(p=>({id:`pipeline-${p.id}`,contactId:p.contact_id,when:p.updated_at,title:`Pipeline moved to ${p.stage.replaceAll("_"," ")}`,detail:p.next_follow_up_on?`Next follow-up ${p.next_follow_up_on}`:"Pipeline updated"}))
  ].filter(item=>item.when).sort((a,b)=>b.when.localeCompare(a.when)).slice(0,8);
  const nextMove=drafts.some(d=>d.status==="approved")
    ? {view:"outreach" as const,title:"Send the approved outreach",detail:`${drafts.filter(d=>d.status==="approved").length} approved messages are ready to prepare.`}
    : drafts.some(d=>d.status==="awaiting_approval")
      ? {view:"outreach" as const,title:"Review the waiting outreach drafts",detail:`${drafts.filter(d=>d.status==="awaiting_approval").length} drafts are ready for your decision.`}
      : dueFollowUps.length
      ? {view:"pipeline" as const,title:"Complete today’s buyer follow-ups",detail:`${dueFollowUps.length} buyers need a response today.`}
      : contacts.some(c=>c.nextAction==="Research buyer and role"||c.nextAction==="Find a verified business email")
        ? {view:"priorities" as const,title:"Research the next priority buyers",detail:"Fill the strongest buyer gaps to unlock more outreach."}
        : {view:"reports" as const,title:"Review pipeline performance",detail:"Your immediate queues are clear."};

  useEffect(() => { void loadContacts(""); void loadDrafts(); void loadPipeline(); }, []);

  async function inspectFile() {
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    const formData = new FormData(); formData.append("file", file);
    const response = await fetch("/api/import/preview", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to inspect the file.");
    else setPreview(result);
    setBusy(false);
  }

  async function commitImport() {
    if (!file || !preview) return;
    setBusy(true); setError("");
    const response = await fetch("/api/import/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, contacts: importable }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Import failed.");
    else { setNotice(`${result.imported ?? importable.length} contacts imported.`); await loadContacts(); setView("crm"); }
    setBusy(false);
  }

  async function loadContacts(query = search) {
    setLoadingContacts(true); setError("");
    const response = await fetch(`/api/contacts?q=${encodeURIComponent(query)}`);
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to load CRM contacts.");
    else setContacts(result.contacts);
    setLoadingContacts(false);
  }

  async function saveResearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!researchContact) return;
    const continueToNext=(event.nativeEvent as SubmitEvent).submitter?.getAttribute("name")==="save_next";
    const nextContact=getNextResearchContact(researchContact.id);
    setBusy(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const fields = ["buyer_name", "job_title", "email", "phone", "linkedin_url", "website", "category", "state", "notes"];
    const body = Object.fromEntries(fields.map((field) => [field, String(form.get(field) ?? "")]));
    const response = await fetch("/api/contacts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: researchContact.id, ...body }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to save research.");
    else { setNotice(continueToNext&&nextContact?"Buyer research saved. Loading the next profile.":"Buyer research saved and priority score refreshed."); setResearchContact(continueToNext?nextContact:null); await loadContacts(""); }
    setBusy(false);
  }

  function getNextResearchContact(currentId:string,additionalSkipped:string[] = []) {
    const excluded=new Set([...skippedResearchIds,...additionalSkipped]);
    const queue=[...contacts].filter(c=>c.nextAction==="Research buyer and role"||c.nextAction==="Find a verified business email").sort((a,b)=>b.score-a.score);
    const currentIndex=queue.findIndex(c=>c.id===currentId);
    return currentIndex>=0?queue.slice(currentIndex+1).find(c=>!excluded.has(c.id))??null:queue.find(c=>!excluded.has(c.id))??null;
  }

  function skipResearchContact() {
    if(!researchContact)return;
    const next=getNextResearchContact(researchContact.id,[researchContact.id]);
    const skippedCount=skippedResearchIds.includes(researchContact.id)?skippedResearchIds.length:skippedResearchIds.length+1;
    setSkippedResearchIds(ids=>ids.includes(researchContact.id)?ids:[...ids,researchContact.id]);
    setNotice(next?`${researchContact.company_name} skipped without changes. ${skippedCount} skipped this session.`:"Research run complete. No buyer data was changed by skips.");
    setResearchContact(next);
  }

  async function loadDrafts() {
    const response=await fetch("/api/drafts"); const result=await response.json();
    if(response.ok)setDrafts(result.drafts); else if(response.status!==404)setError(result.error??"Unable to load drafts.");
  }

  async function saveDraft(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!draftContact)return; setBusy(true); setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/drafts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contact_id:draftContact.id,channel:draftChannel,subject:String(form.get("subject")??""),body:String(form.get("body")??""),status:"awaiting_approval"})});
    const result=await response.json(); if(!response.ok)setError(result.error??"Unable to save draft."); else {setNotice("Draft saved and added to the approval queue.");setDraftContact(null);await loadDrafts();} setBusy(false);
  }

  async function updateDraftStatus(id:string,status:"approved"|"rejected"|"sent") {
    if(status==="sent"&&!window.confirm("Confirm this outreach was actually sent. This will schedule a three-day follow-up."))return;
    setBusy(true); setError("");
    const response=await fetch("/api/drafts",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,status})});
    const result=await response.json();
    if(!response.ok) setError(result.error??"Unable to update draft.");
    else {
      let followUpScheduled=true;
      if(status==="sent") try { await scheduleFollowUpForSentDraft(id); } catch(error) { followUpScheduled=false; setError(error instanceof Error?error.message:"Unable to schedule the follow-up."); }
      setNotice(status==="approved"?"Draft approved and ready to copy.":status==="sent"&&followUpScheduled?"Outreach marked sent and a three-day follow-up was scheduled.":status==="sent"?"Outreach marked sent; the follow-up still needs to be scheduled.":"Draft returned for revision.");
      await loadDrafts();
    }
    setBusy(false);
  }

  async function scheduleFollowUpForSentDraft(draftId:string) {
    const draft=drafts.find(item=>item.id===draftId); if(!draft)return;
    const saved=pipeline.find(item=>item.contact_id===draft.contact_id);
    const protectedStages=["sample_planned","sample_sent","follow_up_due","ordered","not_interested"];
    const followUp=new Date(); followUp.setDate(followUp.getDate()+3);
    const response=await fetch("/api/pipeline",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      contact_id:draft.contact_id,
      stage:saved&&protectedStages.includes(saved.stage)?saved.stage:"contacted",
      next_follow_up_on:saved?.next_follow_up_on??followUp.toISOString().slice(0,10),
      notes:saved?.notes??"Initial outreach sent; follow up in three days.",
      opening_order_value:saved?.opening_order_value??"",
      ordered_on:saved?.ordered_on??"",
      reorder_follow_up_on:saved?.reorder_follow_up_on??""
    })});
    if(!response.ok){const result=await response.json();throw new Error(result.error??"Unable to schedule the follow-up.");}
    await loadPipeline();
  }

  async function copyDraft(draft:SavedDraft) {
    try { await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`); setNotice("Approved outreach copied to the clipboard."); }
    catch { setError("Clipboard access was unavailable. Open Edit draft to copy the text manually."); }
  }

  function openDraftEmail(draft:SavedDraft,contact:CrmContact) {
    if(draft.channel!=="email"){setError("This draft is not an email draft.");return;}
    if(!contact.email){setError("Add a verified recipient email before preparing this message.");return;}
    const params=new URLSearchParams({subject:draft.subject,body:draft.body});
    window.location.href=`mailto:${encodeURIComponent(contact.email)}?${params.toString()}`;
    setNotice(`Email prepared for ${contact.email}. Return here and choose Mark sent only after sending it.`);
  }

  async function loadPipeline(){const response=await fetch("/api/pipeline");const result=await response.json();if(response.ok)setPipeline(result.pipeline);else if(response.status!==404)setError(result.error??"Unable to load follow-ups.")}

  async function loadShopifyStatus(){const response=await fetch("/api/shopify/status");const result=await response.json();if(response.ok)setShopifyStatus(result);else setError(result.error??"Unable to check Shopify readiness.")}
  async function previewShopifyMatches(){setBusy(true);setError("");const response=await fetch("/api/shopify/preview");const result=await response.json();if(response.ok)setShopifyPreview(result);else setError(result.error??"Unable to preview Shopify matches.");setBusy(false)}
  async function previewShopifyOrders(){setBusy(true);setError("");const response=await fetch("/api/shopify/orders");const result=await response.json();if(response.ok)setShopifyOrders(result);else setError(result.error??"Unable to preview Shopify orders.");setBusy(false)}
  async function previewShopifyProducts(){setBusy(true);setError("");const response=await fetch("/api/shopify/products");const result=await response.json();if(response.ok)setShopifyProducts(result);else setError(result.error??"Unable to preview Shopify products.");setBusy(false)}
  async function loadShopifyReconciliation(){setBusy(true);setError("");const [customersResponse,ordersResponse]=await Promise.all([fetch("/api/shopify/preview"),fetch("/api/shopify/orders")]);const [customersResult,ordersResult]=await Promise.all([customersResponse.json(),ordersResponse.json()]);if(customersResponse.ok&&ordersResponse.ok){setShopifyPreview(customersResult);setShopifyOrders(ordersResult)}else setError(customersResult.error??ordersResult.error??"Unable to prepare reconciliation.");setBusy(false)}
  function exportShopifyReconciliation(){if(!shopifyPreview||!shopifyOrders)return;const quote=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;const rows:[[string,...string[]],...(string[])[]]=[["Record type","Shopify record","CRM contact ID","Status","Details"],...shopifyPreview.matches.map(match=>["Customer",match.customer.displayName,match.contactId??"",match.confidence,match.reasons.join("; ")]),...shopifyOrders.orders.map(order=>["Order",order.name,order.crmContactId??"",order.crmContactId?"matched":"unmatched",`${order.financialStatus}; ${order.fulfillmentStatus}; ${order.currencyCode} ${order.amount}`])];const csv=rows.map(row=>row.map(quote).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download=`mte-shopify-reconciliation-${today}.csv`;link.click();URL.revokeObjectURL(url)}
  async function testShopifyConnection(){setBusy(true);setError("");const response=await fetch("/api/shopify/test");const result=await response.json();if(response.ok)setShopifyConnectionTest(result);else setError(result.error??"Unable to test Shopify connection.");setBusy(false)}
  async function approveShopifyLinks(){if(!shopifyPreview)return;const approved=shopifyPreview.matches.filter(match=>match.contactId&&(match.confidence==="exact"||match.confidence==="strong"));if(!approved.length)return;if(!window.confirm(`Approve ${approved.length} verified Shopify-to-CRM customer links? This saves links in the CRM but does not change Shopify.`))return;setBusy(true);setError("");const response=await fetch("/api/shopify/approve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({confirmation:"APPROVE_READ_ONLY_CUSTOMER_LINKS",matches:approved.map(match=>({shopifyCustomerGid:match.customer.id,contactId:match.contactId,confidence:match.confidence,reasons:match.reasons}))})});const result=await response.json();if(response.ok)setNotice(`${result.approved} Shopify customer links approved. Shopify was not changed.`);else setError(result.error??"Unable to approve Shopify links.");setBusy(false)}
  async function loadShopifyHistory(){setBusy(true);setError("");const response=await fetch("/api/shopify/history");const result=await response.json();if(response.ok)setShopifyHistory(result);else setError(result.error??"Unable to load Shopify sync history.");setBusy(false)}

  async function savePipeline(event:React.FormEvent<HTMLFormElement>,contact:CrmContact){event.preventDefault();setBusy(true);setError("");const form=new FormData(event.currentTarget);const response=await fetch("/api/pipeline",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contact_id:contact.id,stage:String(form.get("stage")??"prospect"),next_follow_up_on:String(form.get("next_follow_up_on")??""),notes:String(form.get("notes")??""),opening_order_value:String(form.get("opening_order_value")??""),ordered_on:String(form.get("ordered_on")??""),reorder_follow_up_on:String(form.get("reorder_follow_up_on")??"")})});const result=await response.json();if(!response.ok)setError(result.error??"Unable to save follow-up.");else{setNotice(`${contact.company_name} pipeline updated.`);await loadPipeline()}setBusy(false)}

  function exportPipeline(){const quote=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;const header=["Buyer","Company","Stage","Next follow-up","Order value","Ordered on","Reorder follow-up","Notes"];const rows=contacts.map(contact=>{const item=pipeline.find(p=>p.contact_id===contact.id);return [contact.buyer_name,contact.company_name,item?.stage??"prospect",item?.next_follow_up_on,item?.opening_order_value,item?.ordered_on,item?.reorder_follow_up_on,item?.notes]});const csv=[header,...rows].map(row=>row.map(quote).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download=`mte-sales-pipeline-${today}.csv`;link.click();URL.revokeObjectURL(url)}

  return (
    <section className="workspace">
      <nav className="tabs" aria-label="Milestone sections">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => { setView("dashboard"); void loadContacts(); void loadDrafts(); void loadPipeline(); }}>Today</button>
        <button className={view === "import" ? "active" : ""} onClick={() => setView("import")}>CSV Import</button>
        <button className={view === "crm" ? "active" : ""} onClick={() => { setView("crm"); void loadContacts(); }}>Contact CRM</button>
        <button className={view === "priorities" ? "active" : ""} onClick={() => { setView("priorities"); void loadContacts(); }}>Priority Buyers</button>
        <button className={view === "outreach" ? "active" : ""} onClick={() => { setView("outreach"); void loadContacts(); }}>Outreach Drafts</button>
        <button className={view === "pipeline" ? "active" : ""} onClick={() => { setView("pipeline"); void loadPipeline(); }}>Samples & Follow-ups</button>
        <button className={view === "reports" ? "active" : ""} onClick={() => { setView("reports"); void loadPipeline(); }}>Reports</button>
        <button className={view === "reorders" ? "active" : ""} onClick={() => { setView("reorders"); void loadPipeline(); }}>Reorder Intelligence</button>
        <button className={view === "shopify" ? "active" : ""} onClick={() => { setView("shopify"); void loadShopifyStatus(); }}>Shopify Sync</button>
        <button className={view === "shopify_orders" ? "active" : ""} onClick={() => { setView("shopify_orders"); void loadShopifyStatus(); }}>Shopify Orders</button>
        <button className={view === "shopify_products" ? "active" : ""} onClick={() => { setView("shopify_products"); void loadShopifyStatus(); }}>Products & Inventory</button>
        <button className={view === "reconciliation" ? "active" : ""} onClick={() => { setView("reconciliation"); void loadShopifyStatus(); }}>Reconciliation</button>
        <button className={view === "shopify_test" ? "active" : ""} onClick={() => { setView("shopify_test"); void loadShopifyStatus(); }}>Connection Test</button>
        <button className={view === "shopify_approval" ? "active" : ""} onClick={() => { setView("shopify_approval"); void loadShopifyStatus(); }}>Sync Approval</button>
        <button className={view === "shopify_history" ? "active" : ""} onClick={() => { setView("shopify_history"); void loadShopifyHistory(); }}>Sync History</button>
      </nav>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {view === "dashboard" ? (
        <><div className="dashboard-grid"><button onClick={()=>setView("outreach")}><strong>{drafts.filter(d=>d.status==="approved").length}</strong><span>Approved drafts ready</span></button><button onClick={()=>setView("outreach")}><strong>{drafts.filter(d=>d.status==="awaiting_approval").length}</strong><span>Drafts awaiting approval</span></button><button onClick={()=>setView("pipeline")}><strong>{dueFollowUps.length}</strong><span>Follow-ups due</span></button><button onClick={()=>setView("pipeline")}><strong>{pipeline.filter(p=>p.stage==="sample_planned"||p.stage==="sample_sent").length}</strong><span>Samples in progress</span></button><button onClick={()=>setView("pipeline")}><strong>{pipeline.filter(p=>p.stage==="ordered").length}</strong><span>Opening orders</span></button></div><div className="dashboard-columns"><div className="panel"><span className="section-label">DO NEXT</span><h2>Today’s action list</h2><div className="action-list">{drafts.filter(d=>d.status==="approved").map(d=>{const c=contacts.find(contact=>contact.id===d.contact_id);return <button key={d.id} onClick={()=>setView("outreach")}><span className="action-dot"></span><div><strong>Send approved outreach</strong><p>{c?.buyer_name} · {c?.company_name}</p></div></button>})}{drafts.filter(d=>d.status==="awaiting_approval").map(d=>{const c=contacts.find(contact=>contact.id===d.contact_id);return <button key={d.id} onClick={()=>setView("outreach")}><span className="action-dot approval"></span><div><strong>Review outreach draft</strong><p>{c?.buyer_name} · {c?.company_name}</p></div></button>})}{dueFollowUps.map(p=>{const c=contacts.find(contact=>contact.id===p.contact_id);return <button key={p.id} onClick={()=>setView("pipeline")}><span className="action-dot followup"></span><div><strong>Complete follow-up</strong><p>{c?.buyer_name} · {c?.company_name}</p></div></button>})}{!drafts.some(d=>d.status==="approved"||d.status==="awaiting_approval")&&!dueFollowUps.length&&<div className="empty">No urgent outreach or follow-ups.</div>}</div></div><div className="panel"><span className="section-label">RESEARCH NEXT</span><h2>Highest-priority gaps</h2><div className="mini-list">{[...contacts].filter(c=>c.nextAction==="Research buyer and role"||c.nextAction==="Find a verified business email").sort((a,b)=>b.score-a.score).slice(0,5).map(c=><button key={c.id} onClick={()=>{setView("priorities");setResearchContact(c)}}><span className={`score-ring ${c.tier}`}>{c.score}</span><div><strong>{c.buyer_name||"Buyer needed"}</strong><p>{c.company_name}</p></div></button>)}</div></div></div><div className="panel recent-activity"><span className="section-label">RECENT ACTIVITY</span><h2>Latest sales changes</h2><div className="activity-list">{recentActivity.map(item=>{const c=contacts.find(contact=>contact.id===item.contactId);return <button key={item.id} onClick={()=>setSelectedContact(c??null)}><div><strong>{item.title}</strong><p>{c?.company_name??"Unknown company"} · {item.detail}</p></div><time dateTime={item.when}>{new Date(item.when).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</time></button>})}{!recentActivity.length&&<div className="empty">Sales activity will appear here after the first update.</div>}</div></div></>
      ) : view === "import" ? (
        <>
          <div className="panel upload-panel">
            <div>
              <span className="section-label">STEP 1</span>
              <h2>Upload a retail contact CSV</h2>
              <p>The file is inspected before anything is saved. Pilot limit: 10 MB or 50,000 rows.</p>
            </div>
            <label className="file-picker">
              <input type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} />
              <span>{file ? file.name : "Choose CSV file"}</span>
            </label>
            <button className="primary" disabled={!file || busy} onClick={inspectFile}>{busy && file ? "Inspecting…" : "Inspect file"}</button>
          </div>

          {preview && (
            <>
              <div className="stats">
                <Stat label="Total rows" value={preview.summary.total} />
                <Stat label="Ready" value={preview.summary.valid + preview.summary.warnings} />
                <Stat label="Warnings" value={preview.summary.warnings} />
                <Stat label="Invalid" value={preview.summary.invalid} />
                <Stat label="Duplicates" value={preview.summary.duplicates} />
                <Stat label="Suppressed" value={preview.summary.suppressed} />
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <div><span className="section-label">STEP 2</span><h2>Review before importing</h2></div>
                  <button className="primary" disabled={!importable.length || busy} onClick={commitImport}>Import {importable.length} contacts</button>
                </div>
                <div className="mapping-note"><strong>Detected mapping:</strong> {Object.entries(preview.mapping).map(([source, target]) => `${source} → ${target}`).join(" · ")}</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Row</th><th>Company</th><th>Buyer</th><th>Email</th><th>Status</th><th>Missing / warnings</th></tr></thead>
                    <tbody>{preview.contacts.slice(0, 100).map((contact) => (
                      <tr key={contact.sourceRow}>
                        <td>{contact.sourceRow}</td><td>{contact.company || "—"}</td><td>{contact.buyerName || "—"}</td><td>{contact.email || "—"}</td>
                        <td><span className={`badge ${contact.status}`}>{contact.status}</span>{contact.suppressionReason && <span className="badge suppressed">suppressed</span>}</td>
                        <td className="issues">{contact.issues.map((issue) => issue.message).join(" ") || "None"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                {preview.contacts.length > 100 && <p className="muted">Showing the first 100 rows. All {preview.contacts.length} rows will be processed.</p>}
              </div>
            </>
          )}
        </>
      ) : view === "crm" ? (
        <div className="panel">
          <div className="panel-heading">
            <div><span className="section-label">CONTACT CRM</span><h2>Imported retail buyers</h2></div>
            <form className="search" onSubmit={(event) => { event.preventDefault(); void loadContacts(); }}>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search buyer, company, email, category…" />
              <select aria-label="Email status" value={emailFilter} onChange={(event) => setEmailFilter(event.target.value as "all" | "usable" | "risk")}><option value="all">All email statuses</option><option value="usable">Usable email</option><option value="risk">Email risk</option></select>
              <button className="secondary" disabled={loadingContacts}>{loadingContacts ? "Searching…" : "Search"}</button>
              {(search || emailFilter !== "all") && <button type="button" className="secondary" onClick={() => { setSearch(""); setEmailFilter("all"); void loadContacts(""); }}>Clear</button>}
            </form>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Buyer</th><th>Company</th><th>Email</th><th>Phone</th><th>Title</th><th>Category</th><th>State</th><th>Completeness</th><th>Email health</th><th></th></tr></thead>
               <tbody>{visibleContacts.map((contact) => (
                <tr key={contact.id}><td>{contact.buyer_name || "Unnamed contact"}</td><td>{contact.company_name}{contact.store_banner_name ? ` / ${contact.store_banner_name}` : ""}</td><td>{contact.email || "—"}</td><td>{contact.phone || "—"}</td><td>{contact.job_title || "—"}</td><td>{contact.category || "—"}</td><td>{contact.state || "—"}</td><td><span className="badge neutral">{contact.completeness.replaceAll("_", " ")}</span></td><td><span className={`badge ${contact.email_health === "suppressed" ? "suppressed" : "neutral"}`}>{contact.email_health}</span></td><td><button className="secondary compact" onClick={()=>setSelectedContact(contact)}>Open</button></td></tr>
              ))}</tbody>
            </table>
          </div>
          {!visibleContacts.length && <div className="empty">No contacts match these filters.</div>}
        </div>
      ) : view === "priorities" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">MILESTONE 2</span><h2>Buyer priorities</h2><p>Start with the strongest, most reachable retail opportunities.</p></div><button className="secondary" disabled={loadingContacts} onClick={() => void loadContacts("")}>{loadingContacts ? "Refreshing…" : "Refresh scores"}</button></div>
          <div className="research-summary"><button className={priorityFilter==="all"?"active":""} onClick={()=>setPriorityFilter("all")}><strong>{contacts.length}</strong><span>All buyers</span></button><button className={priorityFilter==="ready"?"active":""} onClick={()=>setPriorityFilter("ready")}><strong>{contacts.filter(c=>c.nextAction==="Review for personalized outreach").length}</strong><span>Outreach ready</span></button><button className={priorityFilter==="research"?"active":""} onClick={()=>setPriorityFilter("research")}><strong>{contacts.filter(c=>c.nextAction==="Research buyer and role"||c.nextAction==="Find a verified business email").length}</strong><span>Needs research</span></button><button className={priorityFilter==="reviewed"?"active":""} onClick={()=>setPriorityFilter("reviewed")}><strong>{contacts.filter(c=>c.nextAction==="Verification required").length}</strong><span>Reviewed gaps</span></button><button className={priorityFilter==="risk"?"active":""} onClick={()=>setPriorityFilter("risk")}><strong>{contacts.filter(c=>c.email_health==="delivery_risk"||c.email_health==="suppressed").length}</strong><span>Email risk</span></button></div>
          <div className="queue-heading"><strong>{priorityContacts.length} buyers in this queue</strong><span>Ranked highest score first</span></div>
          <div className="priority-grid">{priorityContacts.map((contact,index)=><article className="priority-card" key={contact.id}><div className="priority-rank">#{index+1}</div><div className={`score-ring ${contact.tier}`}>{contact.score}</div><div className="priority-copy"><h3>{contact.buyer_name||"Buyer research needed"}</h3><strong>{contact.company_name}{contact.store_banner_name?` / ${contact.store_banner_name}`:""}</strong><p>{contact.job_title||"Role not identified"} · {contact.category||"Category unknown"}</p><div className="reason-list">{contact.reasons.map(reason=><span key={reason}>{reason}</span>)}</div></div><div className="next-action"><small>NEXT ACTION</small><strong>{contact.nextAction}</strong><button className="secondary compact" onClick={()=>setResearchContact(contact)}>Edit research</button></div></article>)}</div>
          {!contacts.length&&<div className="empty">Loading buyer priorities…</div>}
        </div>
      ) : view === "outreach" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">DRAFT WORKSPACE</span><h2>Outreach-ready buyers</h2><p>Create personalized drafts for review. Nothing is sent automatically.</p></div><span className="safe-pill">Approval required before sending</span></div><div className="draft-list">{contacts.filter(c=>c.nextAction==="Review for personalized outreach").sort((a,b)=>b.score-a.score).map(contact=>{const saved=drafts.find(d=>d.contact_id===contact.id);return <article key={contact.id} className="draft-row"><div className={`score-ring ${contact.tier}`}>{contact.score}</div><div><h3>{contact.buyer_name}</h3><strong>{contact.company_name}</strong><p>{contact.job_title} · {contact.category}</p><small>{contact.email||"Recipient email needed"}</small>{saved&&<span className={`badge ${saved.status==="approved"||saved.status==="sent"?"valid":saved.status==="rejected"?"invalid":"warning"}`}>{saved.status.replaceAll("_"," ")}</span>}</div><div className="draft-actions"><button className="secondary" onClick={()=>setDraftContact(contact)}>{saved?"Edit draft":"Create draft"}</button>{saved?.status==="awaiting_approval"&&<><button className="primary" disabled={busy} onClick={()=>void updateDraftStatus(saved.id,"approved")}>Approve</button><button className="secondary" disabled={busy} onClick={()=>void updateDraftStatus(saved.id,"rejected")}>Revise</button></>}{saved?.status==="approved"&&<><button className="primary" disabled={busy||!contact.email||saved.channel!=="email"} onClick={()=>openDraftEmail(saved,contact)}>Prepare email</button><button className="secondary" disabled={busy} onClick={()=>void copyDraft(saved)}>Copy draft</button><button className="secondary" disabled={busy} onClick={()=>void updateDraftStatus(saved.id,"sent")}>Mark sent</button></>}</div></article>})}</div>{!contacts.some(c=>c.nextAction==="Review for personalized outreach")&&<div className="empty">Finish buyer research to unlock outreach drafts.</div>}</div>
      ) : view === "pipeline" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">SALES PIPELINE</span><h2>Samples & follow-ups</h2><p>Track each buyer from first contact through samples and opening orders.</p></div><span className="safe-pill">{pipeline.filter(p=>p.next_follow_up_on).length} scheduled follow-ups</span></div><div className="research-summary pipeline-filters"><button className={pipelineFilter==="all"?"active":""} onClick={()=>setPipelineFilter("all")}><strong>{contacts.length}</strong><span>All buyers</span></button><button className={pipelineFilter==="prospects"?"active":""} onClick={()=>setPipelineFilter("prospects")}><strong>{contacts.filter(c=>{const p=pipeline.find(item=>item.contact_id===c.id);return !p||p.stage==="prospect"}).length}</strong><span>Prospects</span></button><button className={pipelineFilter==="contacted"?"active":""} onClick={()=>setPipelineFilter("contacted")}><strong>{pipeline.filter(p=>p.stage==="contacted"||p.stage==="follow_up_due").length}</strong><span>Contacted</span></button><button className={pipelineFilter==="due"?"active":""} onClick={()=>setPipelineFilter("due")}><strong>{dueFollowUps.length}</strong><span>Due now</span></button><button className={pipelineFilter==="samples"?"active":""} onClick={()=>setPipelineFilter("samples")}><strong>{pipeline.filter(p=>p.stage==="sample_planned"||p.stage==="sample_sent").length}</strong><span>Samples</span></button><button className={pipelineFilter==="orders"?"active":""} onClick={()=>setPipelineFilter("orders")}><strong>{pipeline.filter(p=>p.stage==="ordered").length}</strong><span>Orders</span></button></div><div className="queue-heading"><strong>{pipelineContacts.length} buyers shown</strong><span>Highest priority first</span></div><div className="pipeline-list">{pipelineContacts.map(contact=>{const saved=pipeline.find(p=>p.contact_id===contact.id);return <form className="pipeline-row" key={contact.id} onSubmit={event=>void savePipeline(event,contact)}><div><h3>{contact.buyer_name||"Buyer research needed"}</h3><strong>{contact.company_name}</strong>{saved?.next_follow_up_on&&saved.next_follow_up_on<=today&&saved.stage!=="ordered"&&saved.stage!=="not_interested"&&<span className="badge warning">Follow-up due</span>}</div><label>Stage<select name="stage" defaultValue={saved?.stage??"prospect"}><option value="prospect">Prospect</option><option value="contacted">Contacted</option><option value="sample_planned">Sample planned</option><option value="sample_sent">Sample sent</option><option value="follow_up_due">Follow-up due</option><option value="ordered">Opening order</option><option value="not_interested">Not interested</option></select></label><label>Next follow-up<input name="next_follow_up_on" type="date" defaultValue={saved?.next_follow_up_on??""}/></label><label className="pipeline-notes">Notes<input name="notes" defaultValue={saved?.notes??""} placeholder="Sample, call, or order details"/></label><div className="order-fields"><label>Order value<input name="opening_order_value" type="number" min="0" step="0.01" defaultValue={saved?.opening_order_value??""}/></label><label>Ordered on<input name="ordered_on" type="date" defaultValue={saved?.ordered_on??""}/></label><label>Reorder follow-up<input name="reorder_follow_up_on" type="date" defaultValue={saved?.reorder_follow_up_on??""}/></label></div><button className="secondary" disabled={busy}>Save</button></form>})}{!pipelineContacts.length&&<div className="empty">No buyers are in this pipeline queue.</div>}</div></div>
      ) : view === "reorders" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">ACCOUNT GROWTH</span><h2>Reorder intelligence</h2><p>Prioritize accounts approaching a likely replenishment window. Recommendations never send messages or place orders.</p></div><span className="safe-pill">Approval required for outreach</span></div><div className="shopify-readiness"><div><strong>{reorderRecommendations.length}</strong><span>Ordering accounts</span></div><div><strong>{reorderRecommendations.filter(item=>item.risk==="overdue").length}</strong><span>Overdue</span></div><div><strong>{reorderRecommendations.filter(item=>item.risk==="due_soon").length}</strong><span>Due in 7 days</span></div><div><strong>${reorderRecommendations.filter(item=>item.risk==="overdue"||item.risk==="due_soon").reduce((sum,item)=>sum+(item.openingOrderValue??0),0).toLocaleString()}</strong><span>Opening revenue at risk</span></div></div><div className="activity-list">{reorderRecommendations.map(item=>{const contact=contacts.find(c=>c.id===item.contactId);return <button key={item.contactId} onClick={()=>contact&&setSelectedContact(contact)}><div><strong>{item.companyName}</strong><p>{item.action} · Opening order ${(item.openingOrderValue??0).toLocaleString(undefined,{style:"currency",currency:"USD"})}</p></div><span className={`badge ${item.risk==="overdue"?"invalid":item.risk==="due_soon"?"warning":"valid"}`}>{item.daysUntil===null?"Date needed":item.daysUntil<0?`${Math.abs(item.daysUntil)} days overdue`:item.daysUntil===0?"Due today":`Due in ${item.daysUntil} days`}</span></button>})}{!reorderRecommendations.length&&<div className="empty">Opening orders will appear here with predicted reorder windows.</div>}</div></div>
      ) : view === "shopify_history" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">AUDIT HISTORY</span><h2>Shopify synchronization history</h2><p>Review every approved synchronization run and the number of customer links currently stored.</p></div><button className="secondary" disabled={busy} onClick={()=>void loadShopifyHistory()}>{busy?"Refreshing…":"Refresh history"}</button></div>{shopifyHistory&&<><div className="shopify-readiness"><div><strong>{shopifyHistory.approvedLinks}</strong><span>Approved customer links</span></div><div><strong>{shopifyHistory.runs.length}</strong><span>Recorded sync runs</span></div><div><strong>{shopifyHistory.runs.reduce((sum,run)=>sum+run.imported_count,0)}</strong><span>Records linked</span></div><div><strong>{shopifyHistory.runs.reduce((sum,run)=>sum+run.exception_count,0)}</strong><span>Exceptions held</span></div></div><div className="activity-list">{shopifyHistory.runs.map(run=><div className="match-row" key={run.id}><div><strong>{run.sync_type.replaceAll("_"," ")} · {run.status}</strong><p>{new Date(run.created_at).toLocaleString()} · {run.imported_count} linked · {run.exception_count} held</p></div><span className={`badge ${run.status==="failed"?"invalid":"valid"}`}>{run.status}</span></div>)}{!shopifyHistory.runs.length&&<div className="empty">No Shopify sync runs have been approved yet.</div>}</div></>}</div>
      ) : view === "shopify_approval" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">APPROVAL GATE</span><h2>Approve verified customer links</h2><p>Only exact and strong matches can pass this gate. Ambiguous and unmatched records remain blocked.</p></div><button className="secondary" disabled={!shopifyStatus?.configured||busy} onClick={()=>void loadShopifyReconciliation()}>{busy?"Loading…":"Load review set"}</button></div>{shopifyPreview&&<><div className="shopify-readiness"><div><strong>{shopifyPreview.matches.filter(match=>match.contactId&&(match.confidence==="exact"||match.confidence==="strong")).length}</strong><span>Eligible links</span></div><div><strong>{shopifyPreview.summary.review}</strong><span>Ambiguous—blocked</span></div><div><strong>{shopifyPreview.summary.unmatched}</strong><span>Unmatched—blocked</span></div><div><strong>0</strong><span>Shopify writes</span></div></div><div className="activity-list">{shopifyPreview.matches.filter(match=>match.contactId&&(match.confidence==="exact"||match.confidence==="strong")).map(match=><div className="match-row" key={match.customer.id}><div><strong>{match.customer.displayName}</strong><p>{match.reasons.join(" · ")}</p></div><span className="badge valid">Eligible</span></div>)}</div><div className="draft-actions shopify-note"><button className="primary" disabled={busy||!shopifyPreview.matches.some(match=>match.contactId&&(match.confidence==="exact"||match.confidence==="strong"))} onClick={()=>void approveShopifyLinks()}>Approve verified links</button></div></>}<div className="alert success shopify-note">Approval stores reviewed links and an audit record in the CRM. It never changes Shopify customers.</div></div>
      ) : view === "shopify_test" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">CONNECTION DIAGNOSTICS</span><h2>Shopify connection test</h2><p>Verify the store identity, API version, token, and minimum read permissions without changing store data.</p></div><button className="primary" disabled={!shopifyStatus?.configured||busy} onClick={()=>void testShopifyConnection()}>{busy?"Testing…":"Test connection"}</button></div>{!shopifyStatus?.configured&&<div className="alert error">Complete the server-only Shopify connection settings before testing.</div>}{shopifyConnectionTest&&<><div className={`alert ${shopifyConnectionTest.allRequiredScopes?"success":"error"}`}>{shopifyConnectionTest.connected?`Connected to ${shopifyConnectionTest.shopName} (${shopifyConnectionTest.domain}) using API ${shopifyConnectionTest.apiVersion}.`:"Connection failed."}</div><div className="panel inset-panel"><span className="section-label">ACCESS CHECK</span><h3>Required read permissions</h3><div className="activity-list">{shopifyConnectionTest.scopes.map(item=><div className="match-row" key={item.scope}><strong>{item.scope}</strong><span className={`badge ${item.granted?"valid":"invalid"}`}>{item.granted?"Granted":"Missing"}</span></div>)}</div></div></>}<div className="alert success shopify-note">The test sends no customer data and performs no Shopify mutations.</div></div>
      ) : view === "reconciliation" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">SYNC CONTROL</span><h2>Shopify reconciliation</h2><p>Compare customers and orders, resolve exceptions, and save a review file before any import.</p></div><div className="draft-actions"><button className="primary" disabled={!shopifyStatus?.configured||busy} onClick={()=>void loadShopifyReconciliation()}>{busy?"Comparing…":"Run reconciliation"}</button><button className="secondary" disabled={!shopifyPreview||!shopifyOrders} onClick={exportShopifyReconciliation}>Download review CSV</button></div></div>{!shopifyStatus?.configured&&<div className="alert error">Complete the server-only Shopify connection settings before running reconciliation.</div>}{shopifyPreview&&shopifyOrders&&<><div className="shopify-readiness"><div><strong>{shopifyPreview.summary.matched}</strong><span>Customers matched</span></div><div><strong>{shopifyPreview.summary.review+shopifyPreview.summary.unmatched}</strong><span>Customer exceptions</span></div><div><strong>{shopifyOrders.summary.matched}</strong><span>Orders linked</span></div><div><strong>{shopifyOrders.summary.total-shopifyOrders.summary.matched}</strong><span>Order exceptions</span></div></div><div className="dashboard-columns"><div className="panel inset-panel"><span className="section-label">READY</span><h3>Safe automatic matches</h3><p>{shopifyPreview.matches.filter(match=>match.confidence==="exact"||match.confidence==="strong").length} customer records have strong matching signals.</p><p>{shopifyOrders.summary.matched} recent orders connect to known CRM contacts.</p></div><div className="panel inset-panel"><span className="section-label">REVIEW REQUIRED</span><h3>Exceptions held back</h3><p>{shopifyPreview.summary.review} ambiguous customer matches require a decision.</p><p>{shopifyPreview.summary.unmatched} customers and {shopifyOrders.summary.total-shopifyOrders.summary.matched} orders remain unmatched.</p></div></div></>}<div className="alert success shopify-note">Reconciliation is preview-only. Downloading the review CSV does not approve or import any records.</div></div>
      ) : view === "shopify_products" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">READ-ONLY CATALOG PREVIEW</span><h2>Shopify products & inventory</h2><p>Review the sellable catalog and inventory risks before connecting product data to the CRM.</p></div><button className="primary" disabled={!shopifyStatus?.configured||busy} onClick={()=>void previewShopifyProducts()}>{busy?"Loading…":"Preview catalog"}</button></div>{!shopifyStatus?.configured&&<div className="alert error">Complete the server-only Shopify connection settings before loading products.</div>}{shopifyProducts&&<><div className="research-summary pipeline-filters"><button><strong>{shopifyProducts.summary.total}</strong><span>Products</span></button><button><strong>{shopifyProducts.summary.active}</strong><span>Active</span></button><button><strong>{shopifyProducts.summary.totalUnits}</strong><span>Units available</span></button><button><strong>{shopifyProducts.summary.lowStock}</strong><span>Low stock</span></button><button><strong>{shopifyProducts.summary.outOfStock}</strong><span>Out of stock</span></button></div><div className="activity-list">{shopifyProducts.products.map(product=><div className="match-row" key={product.id}><div><strong>{product.title}</strong><p>{product.variantCount} {product.variantCount===1?"variant":"variants"} · {product.status.toLowerCase()}</p></div><span className={`badge ${product.totalInventory<=0?"invalid":product.totalInventory<=10?"warning":"valid"}`}>{product.totalInventory} available</span></div>)}</div></>}<div className="alert success shopify-note">This catalog view is preview-only and cannot change products, prices, or inventory.</div></div>
      ) : view === "shopify_orders" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">READ-ONLY ORDER PREVIEW</span><h2>Recent Shopify orders</h2><p>Review revenue, fulfillment work, and CRM matches before any order data is imported.</p></div><button className="primary" disabled={!shopifyStatus?.configured||busy} onClick={()=>void previewShopifyOrders()}>{busy?"Loading…":"Preview recent orders"}</button></div>{!shopifyStatus?.configured&&<div className="alert error">Complete the server-only Shopify connection settings before loading orders.</div>}{shopifyOrders&&<><div className="research-summary"><button><strong>{shopifyOrders.summary.total}</strong><span>Recent orders</span></button><button><strong>{shopifyOrders.summary.matched}</strong><span>Matched to CRM</span></button><button><strong>{shopifyOrders.summary.unfulfilled}</strong><span>Need fulfillment</span></button><button><strong>{shopifyOrders.summary.currencyCode} {shopifyOrders.summary.revenue.toLocaleString()}</strong><span>Preview revenue</span></button></div><div className="activity-list">{shopifyOrders.orders.map(order=><div className="match-row" key={order.id}><div><strong>{order.name} · {order.financialStatus.replaceAll("_"," ")}</strong><p>{new Date(order.createdAt).toLocaleDateString()} · {order.fulfillmentStatus.replaceAll("_"," ")} · {order.currencyCode} {order.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</p></div><span className={`badge ${order.crmContactId?"valid":"warning"}`}>{order.crmContactId?"CRM matched":"Unmatched"}</span></div>)}</div></>}<div className="alert success shopify-note">This screen is preview-only. It cannot modify orders, fulfillment, customers, or CRM records.</div></div>
      ) : view === "shopify" ? (
        <div className="panel"><div className="panel-heading"><div><span className="section-label">MILESTONE 7</span><h2>Shopify synchronization</h2><p>Prepare secure, read-only customer and order matching before any live synchronization.</p></div><span className={`badge ${shopifyStatus?.configured?"valid":"warning"}`}>{shopifyStatus?.configured?"Connection settings ready":"Setup required"}</span></div><div className="shopify-readiness"><div><strong>{shopifyStatus?.shopConfigured?"Ready":"Needed"}</strong><span>Shop domain</span></div><div><strong>{shopifyStatus?.tokenConfigured?"Ready":"Needed"}</strong><span>Server-only access token</span></div><div><strong>{shopifyStatus?.apiVersion??"2026-01"}</strong><span>GraphQL API version</span></div><div><strong>Read only</strong><span>Initial synchronization mode</span></div></div><div className="dashboard-columns"><div className="panel inset-panel"><span className="section-label">MINIMUM ACCESS</span><h3>Required Shopify permissions</h3><div className="scope-list">{(shopifyStatus?.requiredScopes??["read_customers","read_orders","read_products","read_inventory"]).map(scope=><span key={scope}>{scope}</span>)}</div><p>No write permission is requested for the first connection.</p></div><div className="panel inset-panel"><span className="section-label">SAFE SYNC PLAN</span><h3>What happens next</h3><ol><li>Test the store connection.</li><li>Preview customer matches by email, phone, and company.</li><li>Review unmatched or ambiguous accounts.</li><li>Approve the first read-only import.</li></ol></div></div><div className="shopify-preview"><div className="panel-heading"><div><span className="section-label">CUSTOMER MATCH PREVIEW</span><h3>Review before importing</h3></div><button className="primary" disabled={!shopifyStatus?.configured||busy} onClick={()=>void previewShopifyMatches()}>{busy?"Comparing…":"Preview customer matches"}</button></div>{shopifyPreview&&<><div className="research-summary"><button><strong>{shopifyPreview.summary.total}</strong><span>Shopify customers</span></button><button><strong>{shopifyPreview.summary.matched}</strong><span>Matched</span></button><button><strong>{shopifyPreview.summary.review}</strong><span>Needs review</span></button><button><strong>{shopifyPreview.summary.unmatched}</strong><span>Unmatched</span></button></div><div className="activity-list">{shopifyPreview.matches.slice(0,20).map(match=><div className="match-row" key={match.customer.id}><div><strong>{match.customer.displayName}</strong><p>{match.customer.company||match.customer.email||"No matching details"}</p></div><span className={`badge ${match.confidence==="exact"||match.confidence==="strong"?"valid":match.confidence==="review"?"warning":"neutral"}`}>{match.confidence}</span></div>)}</div></>}</div><div className="alert success shopify-note">Credentials remain on the server and are never returned to this screen. Previewing does not change Shopify or CRM data.</div></div>
      ) : (
        <>
          <div className="report-toolbar">
            <div><span className="section-label">SALES REPORTING</span><h2>Pipeline performance</h2></div>
            <button className="secondary" onClick={exportPipeline}>Download CSV</button>
          </div>
          <div className="dashboard-grid report-cards"><button><strong>{pipeline.filter(p=>p.stage==="ordered").length}</strong><span>Opening orders</span></button><button><strong>${openingOrderRevenue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><span>Opening-order revenue</span></button><button><strong>{pipeline.filter(p=>p.stage==="sample_sent").length}</strong><span>Samples sent</span></button><button><strong>{reorderDue.length}</strong><span>Reorders due</span></button></div>
          <div className="panel funnel-panel"><span className="section-label">SALES FUNNEL</span><h2>Buyer progress</h2><div className="funnel-steps">{funnel.map((step,index)=><div key={step.label}><strong>{step.count}</strong><span>{step.label}</span><small>{index===0?"100% of list":`${contacts.length?Math.round(step.count/contacts.length*100):0}% of list`}</small></div>)}</div></div>
          <button className="panel next-move" onClick={()=>setView(nextMove.view)}><div><span className="section-label">RECOMMENDED NEXT MOVE</span><h2>{nextMove.title}</h2><p>{nextMove.detail}</p></div><strong>Open queue →</strong></button>
          <div className="dashboard-columns segment-reports"><div className="panel"><span className="section-label">TERRITORY MIX</span><h2>Top states</h2><div className="stage-report">{topStates.map(item=><button key={item.label} onClick={()=>{setSearch(item.label);setView("crm");void loadContacts(item.label)}}><span>{item.label}</span><strong>{item.count}</strong></button>)}{!topStates.length&&<div className="empty">Add state data to see territory performance.</div>}</div></div><div className="panel"><span className="section-label">CHANNEL MIX</span><h2>Top categories</h2><div className="stage-report">{topCategories.map(item=><button key={item.label} onClick={()=>{setSearch(item.label);setView("crm");void loadContacts(item.label)}}><span>{item.label}</span><strong>{item.count}</strong></button>)}{!topCategories.length&&<div className="empty">Complete buyer research to see category performance.</div>}</div></div></div>
          <div className="dashboard-columns"><div className="panel"><span className="section-label">PIPELINE REPORT</span><h2>Stage summary</h2><div className="stage-report">{["prospect","contacted","sample_planned","sample_sent","follow_up_due","ordered","not_interested"].map(stage=><div key={stage}><span>{stage.replaceAll("_"," ")}</span><strong>{pipeline.filter(p=>p.stage===stage).length+(stage==="prospect"?contacts.filter(c=>!pipeline.some(p=>p.contact_id===c.id)).length:0)}</strong></div>)}</div></div><div className="panel"><span className="section-label">REORDER QUEUE</span><h2>Accounts to revisit</h2><div className="mini-list">{reorderDue.map(p=>{const c=contacts.find(contact=>contact.id===p.contact_id);return <button key={p.id} onClick={()=>setView("pipeline")}><div><strong>{c?.company_name}</strong><p>Reorder follow-up {p.reorder_follow_up_on}</p></div></button>})}{!reorderDue.length&&<div className="empty">No reorder follow-ups due.</div>}</div></div></div>
        </>
      )}
      {selectedContact && (()=>{const savedDrafts=drafts.filter(d=>d.contact_id===selectedContact.id);const savedPipeline=pipeline.find(p=>p.contact_id===selectedContact.id);return <div className="research-backdrop"><div className="panel research-panel contact-profile"><div className="panel-heading"><div><span className="section-label">COMPANY & CONTACT</span><h2>{selectedContact.company_name}</h2><p>{selectedContact.buyer_name||"Buyer name needed"}{selectedContact.job_title?` · ${selectedContact.job_title}`:""}</p></div><button className="secondary" onClick={()=>setSelectedContact(null)}>Close</button></div><div className="profile-grid"><div><small>EMAIL</small>{selectedContact.email?<a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>:<span>Not added</span>}</div><div><small>PHONE</small>{selectedContact.phone?<a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a>:<span>Not added</span>}</div><div><small>CATEGORY</small><span>{selectedContact.category||"Not added"}</span></div><div><small>TERRITORY</small><span>{selectedContact.state||"Not added"}</span></div><div><small>WEBSITE</small>{selectedContact.website?<a href={selectedContact.website} target="_blank" rel="noreferrer">Open website</a>:<span>Not added</span>}</div><div><small>LINKEDIN</small>{selectedContact.linkedin_url?<a href={selectedContact.linkedin_url} target="_blank" rel="noreferrer">Open LinkedIn</a>:<span>Not added</span>}</div><div><small>OUTREACH</small><span>{savedDrafts.length?savedDrafts.map(d=>`${d.channel}: ${d.status.replaceAll("_"," ")}`).join(" · "):"No drafts"}</span></div><div><small>PIPELINE</small><span>{savedPipeline?.stage.replaceAll("_"," ")??"Prospect"}</span></div></div>{selectedContact.notes&&<div className="profile-notes"><small>RESEARCH NOTES</small><p>{selectedContact.notes}</p></div>}<div className="draft-actions"><button className="primary" onClick={()=>{setSelectedContact(null);setResearchContact(selectedContact)}}>Edit contact</button><button className="secondary" onClick={()=>{setSelectedContact(null);setView("pipeline")}}>Open pipeline</button></div></div></div>})()}
      {researchContact && <div className="research-backdrop"><form key={researchContact.id} className="panel research-panel" onSubmit={saveResearch}><div className="panel-heading"><div><span className="section-label">BUYER RESEARCH</span><h2>{researchContact.company_name}</h2></div><button type="button" className="secondary" onClick={() => setResearchContact(null)}>Close</button></div><div className="research-fields"><label>Buyer name<input name="buyer_name" defaultValue={researchContact.buyer_name ?? ""} /></label><label>Job title<input name="job_title" defaultValue={researchContact.job_title ?? ""} /></label><label>Email address<input name="email" type="email" defaultValue={researchContact.email ?? ""} /></label><label>Phone number<input name="phone" type="tel" defaultValue={researchContact.phone ?? ""} /></label><label>LinkedIn URL<input name="linkedin_url" type="url" defaultValue={researchContact.linkedin_url ?? ""} /></label><label>Company website<input name="website" type="url" defaultValue={researchContact.website ?? ""} /></label><label>Category<input name="category" defaultValue={researchContact.category ?? ""} /></label><label>State / territory<input name="state" defaultValue={researchContact.state ?? ""} placeholder="Example: Texas" /></label><label className="full">Research notes<textarea name="notes" rows={5} defaultValue={researchContact.notes ?? ""} /></label></div><div className="draft-actions"><button type="button" className="secondary" disabled={busy} onClick={skipResearchContact}>Skip for now</button><button className="primary" disabled={busy}>{busy ? "Saving…" : "Save research"}</button><button className="secondary" name="save_next" disabled={busy}>{busy ? "Saving…" : "Save & next"}</button></div></form></div>}
      {draftContact && (()=>{const saved=drafts.find(d=>d.contact_id===draftContact.id&&d.channel===draftChannel);const generated=createOutreachDraft({buyerName:draftContact.buyer_name??"there",companyName:draftContact.company_name,category:draftContact.category,channel:draftChannel});const draft=saved??generated;return <div className="research-backdrop"><form key={`${draftContact.id}-${draftChannel}`} className="panel research-panel" onSubmit={saveDraft}><div className="panel-heading"><div><span className="section-label">OUTREACH DRAFT</span><h2>{draftContact.company_name}</h2></div><button type="button" className="secondary" onClick={()=>setDraftContact(null)}>Close</button></div><div className="research-fields"><label>Channel<select value={draftChannel} onChange={event=>setDraftChannel(event.target.value as "email"|"linkedin")}><option value="email">Email</option><option value="linkedin">LinkedIn</option></select></label><label className="full">Subject<input name="subject" defaultValue={draft.subject}/></label><label className="full">{draftChannel==="email"?"Email draft":"LinkedIn draft"}<textarea name="body" rows={draftChannel==="email"?12:6} defaultValue={draft.body}/></label></div><button className="primary" disabled={busy}>{busy?"Saving…":"Save for approval"}</button><p className="draft-warning">This workspace cannot send messages.</p></form></div>})()}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat"><strong>{value.toLocaleString()}</strong><span>{label}</span></div>;
}

function summarize(values:(string|null)[],limit:number) {
  const counts=new Map<string,number>();
  for(const value of values){const label=value?.trim();if(label)counts.set(label,(counts.get(label)??0)+1);}
  return [...counts.entries()].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label)).slice(0,limit);
}
