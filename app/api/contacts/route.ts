import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    await requireUser();
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
      const safeSearch = search.replace(/[,%()]/g, " ");
      query = query.or(`buyer_name.ilike.%${safeSearch}%,company_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`);
    }
    if (health !== "all") query = query.eq("email_health", health);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ contacts: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load contacts.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
