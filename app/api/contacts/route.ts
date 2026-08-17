import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSales } from "@/lib/authorization";
import { scoreLead } from "@/lib/lead-scoring";
import { z } from "zod";

const researchSchema = z.object({
  id: z.string().uuid(), buyer_name: z.string().trim().max(240), job_title: z.string().trim().max(240),
  email: z.union([z.literal(""), z.string().trim().email().max(320)]), phone: z.string().trim().max(100),
  linkedin_url: z.union([z.literal(""), z.string().url().max(1000)]), website: z.union([z.literal(""), z.string().url().max(1000)]),
  category: z.string().trim().max(240), state: z.string().trim().max(100), notes: z.string().trim().max(4000),
});

type ResearchEvidence = { contact_id:string; source_type:"linkedin"|"company_website"; source_url:string; confidence:"medium"|"high"; research_note:string; researched_at:string };

export async function GET(request: Request) {
  try {
    await requireSales();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim() ?? "";
    const health = searchParams.get("health") ?? "all";
    const supabase = createAdminClient();
    let query = supabase
      .from("contact_crm")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);
    if (search) {
      const safeSearch = search.replace(/[,%()]/g, "%").replace(/%+/g, "%");
      query = query.or(`buyer_name.ilike.%${safeSearch}%,company_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%,state.ilike.%${safeSearch}%`);
    }
    if (health !== "all") query = query.eq("email_health", health);
    const { data, error } = await query;
    if (error) throw error;
    const contacts=data??[];
    const ids=contacts.map(contact=>contact.id);
    const evidenceByContact=new Map<string,ResearchEvidence>();
    if(ids.length){
      const {data:evidence,error:evidenceError}=await supabase.from("contact_research_evidence").select("contact_id,source_type,source_url,confidence,research_note,researched_at").in("contact_id",ids).order("researched_at",{ascending:false});
      if(evidenceError)throw evidenceError;
      for(const row of (evidence??[]) as ResearchEvidence[])if(!evidenceByContact.has(row.contact_id))evidenceByContact.set(row.contact_id,row);
    }
    return NextResponse.json({ contacts: contacts.map((contact) => {
      const evidence=evidenceByContact.get(contact.id);
      const enriched={...contact,research_source_type:evidence?.source_type??null,research_source_url:evidence?.source_url??null,research_confidence:evidence?.confidence??null,research_evidence_note:evidence?.research_note??null,researched_at:evidence?.researched_at??null};
      return {...enriched,...scoreLead(enriched)};
    }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contacts.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message === "FORBIDDEN" ? "Assigned team access is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const {user}=await requireSales();
    const body = researchSchema.parse(await request.json());
    const sourceUrl=body.linkedin_url||body.website;
    if(!sourceUrl)return NextResponse.json({error:"Add a LinkedIn profile or company website before saving buyer research so the source can be reviewed."},{status:400});
    const sourceType:ResearchEvidence["source_type"]=body.linkedin_url?"linkedin":"company_website";
    const confidence:ResearchEvidence["confidence"]=body.linkedin_url?"high":"medium";
    const supabase = createAdminClient();
    const { id, ...fields } = body;
    const values = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value || null]));
    const researchNote=body.notes||`Buyer research saved from ${sourceType==="linkedin"?"LinkedIn":"the company website"}.`;
    const {error:evidenceError}=await supabase.from("contact_research_evidence").insert({contact_id:id,source_type:sourceType,source_url:sourceUrl,confidence,research_note:researchNote,researched_by:user.id});
    if(evidenceError)throw evidenceError;
    const {data:existing,error:readError}=await supabase.from("contacts").select("email").eq("id",id).single();
    if(readError)throw readError;
    const emailChanged=(existing.email??"").toLowerCase()!==body.email.toLowerCase();
    const { data, error } = await supabase.from("contacts").update({ ...values, ...(emailChanged?{email_health:"unverified"}:{}), updated_at: new Date().toISOString() }).eq("id", id).select("id").single();
    if (error) throw error;
    return NextResponse.json({ contact: data, research:{source_type:sourceType,source_url:sourceUrl,confidence} });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save research.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message === "FORBIDDEN" ? "Assigned team access is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
