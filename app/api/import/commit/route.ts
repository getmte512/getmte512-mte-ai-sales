import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

const contactSchema = z.object({
  sourceRow: z.number().int().positive(),
  company: z.string().max(240),
  storeBanner: z.string().max(240),
  buyerName: z.string().max(240),
  jobTitle: z.string().max(240),
  email: z.string().max(320),
  phone: z.string().max(60),
  linkedinUrl: z.string().max(1000),
  website: z.string().max(1000),
  city: z.string().max(120),
  state: z.string().max(80),
  category: z.string().max(240),
  distributor: z.string().max(240),
  notes: z.string().max(4000),
  emailStatus: z.string().max(80),
  opened: z.boolean(),
  clicked: z.boolean(),
  suppressionReason: z.string().nullable(),
  completeness: z.enum(["complete", "usable", "needs_information", "minimal"]),
  status: z.enum(["valid", "warning"]),
});

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contacts: z.array(contactSchema).min(1).max(50_000),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await request.json());
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("commit_contact_import", {
      p_filename: body.filename,
      p_uploaded_by: user.id,
      p_contacts: body.contacts.map((contact) => ({
        source_row: contact.sourceRow,
        company: contact.company,
        store_banner: contact.storeBanner,
        buyer_name: contact.buyerName,
        job_title: contact.jobTitle,
        email: contact.email,
        phone: contact.phone,
        linkedin_url: contact.linkedinUrl,
        website: contact.website,
        city: contact.city,
        state: contact.state,
        category: contact.category,
        distributor: contact.distributor,
        notes: contact.notes,
        email_status: contact.emailStatus,
        opened: contact.opened,
        clicked: contact.clicked,
        suppression_reason: contact.suppressionReason,
        completeness: contact.completeness,
      })),
    });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message === "UNAUTHORIZED" ? "Sign in is required." : message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
