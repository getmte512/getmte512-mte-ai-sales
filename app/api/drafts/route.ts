import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSales } from "@/lib/authorization";

const saveSchema = z.object({ contact_id:z.string().uuid(), channel:z.enum(["email","linkedin"]).default("email"), subject:z.string().trim().min(1).max(300), body:z.string().trim().min(1).max(10000), status:z.enum(["draft","awaiting_approval"]).default("draft") });
const statusSchema = z.object({ id:z.string().uuid(), status:z.enum(["draft","awaiting_approval","approved","rejected","sent"]) });

export async function GET() {
  try { await requireSales(); const supabase=createAdminClient(); const {data,error}=await supabase.from("outreach_drafts").select("*").order("updated_at",{ascending:false}).limit(500); if(error)throw error; return NextResponse.json({drafts:data??[]}); }
  catch(error){const message=error instanceof Error?error.message:"Unable to load drafts.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Assigned team access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500});}
}

export async function POST(request:Request) {
  try { const{user}=await requireSales(); const body=saveSchema.parse(await request.json()); const supabase=createAdminClient(); const {data,error}=await supabase.from("outreach_drafts").upsert({...body,created_by:user.id,updated_at:new Date().toISOString()},{onConflict:"contact_id,channel"}).select("*").single(); if(error)throw error; return NextResponse.json({draft:data}); }
  catch(error){const message=error instanceof Error?error.message:"Unable to save draft.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Assigned team access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:400});}
}

export async function PATCH(request:Request) {
  try { await requireSales(); const body=statusSchema.parse(await request.json()); const supabase=createAdminClient(); const {data,error}=await supabase.from("outreach_drafts").update({status:body.status,updated_at:new Date().toISOString()}).eq("id",body.id).select("*").single(); if(error)throw error; return NextResponse.json({draft:data}); }
  catch(error){const message=error instanceof Error?error.message:"Unable to update draft.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Assigned team access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:400});}
}
