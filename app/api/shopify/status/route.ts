import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getShopifyReadiness } from "@/lib/shopify-config";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(getShopifyReadiness(process.env));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check Shopify readiness.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : 500 });
  }
}
