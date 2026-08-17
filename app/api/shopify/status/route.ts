import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { getShopifyReadiness } from "@/lib/shopify-config";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(getShopifyReadiness(process.env));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check Shopify readiness.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message === "FORBIDDEN" ? "Administrator access is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}
