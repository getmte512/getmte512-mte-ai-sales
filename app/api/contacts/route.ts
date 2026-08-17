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
    return NextResponse.json({ contacts: (data ?? []).map((contact) => ({ ...contact, ...scoreLead(contact) })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contacts.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message === "FORBIDDEN" ? "Assigned team access is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSales();
    const body = researchSchema.parse(await request.json());
    const supabase = createAdminClient();
    const { id, ...fields } = body;
    const values = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value || null]));
    const {data:existing,error:readError}=await supabase.from("contacts").select("email").eq("id",id).single();
    if(readError)throw readError;
    const emailChanged=(existing.email??"").toLowerCase()!==body.email.toLowerCase();
    const { data, error } = await supabase.from("contacts").update({ ...values, ...(emailChanged?{email_health:"unverified"}:{}), updated_at: new Date().toISOString() }).eq("id", id).select("id").single();
    if (error) throw error;
    return NextResponse.json({ contact: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save research.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message === "FORBIDDEN" ? "Assigned team access is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400 });
  }
}
