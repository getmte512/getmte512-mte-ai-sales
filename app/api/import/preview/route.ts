import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";
import { suggestMapping } from "@/lib/contact-import/mapping";
import { reviewRows } from "@/lib/contact-import/review";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 50_000;

export async function POST(request: Request) {
  try {
    await requireUser();
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".csv")) return NextResponse.json({ error: "Only .csv files are accepted." }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "The CSV exceeds the 10 MB pilot limit." }, { status: 413 });

    const csv = await file.text();
    const rows = parse(csv, {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      relax_column_count: false,
      trim: false,
      max_record_size: 64 * 1024,
    }) as Record<string, string>[];
    if (rows.length > MAX_ROWS) return NextResponse.json({ error: "The CSV exceeds the 50,000-row pilot limit." }, { status: 413 });
    if (!rows.length) return NextResponse.json({ error: "The CSV contains no contact rows." }, { status: 400 });

    const headers = Object.keys(rows[0]);
    const mapping = suggestMapping(headers);
    return NextResponse.json(reviewRows(rows, mapping, headers));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse CSV.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
