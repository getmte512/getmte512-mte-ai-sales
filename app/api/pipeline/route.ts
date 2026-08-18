import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSales } from "@/lib/authorization";
import { validatePipelineUpdate } from "@/lib/pipeline";

const pipelineSchema=z.object({
  contact_id:z.string().uuid(),
  stage:z.enum(["prospect","contacted","engaged","sample_planned","sample_sent","sample_delivered","follow_up_due","negotiating","ordered","won","lost","not_interested"]),
  next_follow_up_on:z.union([z.literal(""),z.string().date()]).default(""),
  next_action:z.string().trim().max(500).optional().default(""),
  next_action_at:z.union([z.literal(""),z.string().datetime()]).optional().default(""),
  notes:z.string().trim().max(4000).default(""),
  opening_order_value:z.union([z.literal(""),z.coerce.number().min(0).max(10000000)]).default(""),
  ordered_on:z.union([z.literal(""),z.string().date()]).default(""),
  reorder_follow_up_on:z.union([z.literal(""),z.string().date()]).default("")
});

export async function GET(){try{await requireSales();const supabase=createAdminClient();const{data,error}=await supabase.from("sales_pipeline").select("*").order("updated_at",{ascending:false}).limit(500);if(error)throw error;return NextResponse.json({pipeline:data??[]})}catch(error){const message=error instanceof Error?error.message:"Unable to load pipeline.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Assigned team access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500})}}

export async function POST(request:Request){try{const{user}=await requireSales();const body=pipelineSchema.parse(await request.json());const validated=validatePipelineUpdate({stage:body.stage,nextAction:body.next_action});const supabase=createAdminClient();const{data,error}=await supabase.from("sales_pipeline").upsert({...body,stage:validated.stage,next_action:validated.nextAction,next_action_at:body.next_action_at||null,next_follow_up_on:body.next_follow_up_on||null,notes:body.notes||null,opening_order_value:body.opening_order_value===""?null:body.opening_order_value,ordered_on:body.ordered_on||null,reorder_follow_up_on:body.reorder_follow_up_on||null,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"contact_id"}).select("*").single();if(error)throw error;return NextResponse.json({pipeline:data})}catch(error){const message=error instanceof Error?error.message:"Unable to save pipeline.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Assigned team access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:400})}}
