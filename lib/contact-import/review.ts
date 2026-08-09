import { completenessFor, cleanText, normalizeEmail, normalizePhone, normalizeState, normalizeUrl, suppressionReason, validateContact } from "./normalize.ts";
import type { ColumnMapping, ContactDraft, ImportPreview, ReviewedContact } from "./types.ts";

function yes(value: string | undefined): boolean {
  return /^(yes|true|1|opened|clicked|unsubscribed)$/i.test(cleanText(value));
}

function mappedValue(row: Record<string, string>, mapping: ColumnMapping, field: keyof ContactDraft): string {
  const source = Object.entries(mapping).find(([, target]) => target === field)?.[0];
  return source ? row[source] ?? "" : "";
}

export function reviewRows(rows: Record<string, string>[], mapping: ColumnMapping, headers: string[]): ImportPreview {
  const seenEmails = new Map<string, number>();
  const contacts: ReviewedContact[] = rows.map((raw, index) => {
    const contact: ContactDraft = {
      company: cleanText(mappedValue(raw, mapping, "company"), 240),
      storeBanner: cleanText(mappedValue(raw, mapping, "storeBanner"), 240),
      buyerName: cleanText(mappedValue(raw, mapping, "buyerName"), 240),
      jobTitle: cleanText(mappedValue(raw, mapping, "jobTitle"), 240),
      email: normalizeEmail(mappedValue(raw, mapping, "email")),
      phone: normalizePhone(mappedValue(raw, mapping, "phone")),
      linkedinUrl: normalizeUrl(mappedValue(raw, mapping, "linkedinUrl"), true),
      website: normalizeUrl(mappedValue(raw, mapping, "website")),
      city: cleanText(mappedValue(raw, mapping, "city"), 120),
      state: normalizeState(mappedValue(raw, mapping, "state")),
      category: cleanText(mappedValue(raw, mapping, "category"), 240),
      distributor: cleanText(mappedValue(raw, mapping, "distributor"), 240),
      notes: cleanText(mappedValue(raw, mapping, "notes"), 4000),
      emailStatus: cleanText(raw.Status ?? raw["Email Status"], 80),
      opened: yes(raw.Opened),
      clicked: yes(raw.Clicked),
      unsubscribed: yes(raw.Unsubscribed),
      reportedSpam: yes(raw["Reported as spam"]),
    };
    const issues = validateContact(contact);
    const duplicateOfRow = contact.email ? seenEmails.get(contact.email) ?? null : null;
    if (contact.email && duplicateOfRow === null) seenEmails.set(contact.email, index + 2);
    if (duplicateOfRow) issues.push({ field: "email", severity: "warning", message: `Duplicate email from row ${duplicateOfRow}.` });
    const hasError = issues.some((issue) => issue.severity === "error");
    const status: ReviewedContact["status"] = hasError ? "invalid" : duplicateOfRow ? "duplicate" : issues.length ? "warning" : "valid";
    return {
      ...contact,
      sourceRow: index + 2,
      issues,
      duplicateOfRow,
      suppressionReason: suppressionReason(contact),
      completeness: completenessFor(contact),
      status,
      raw,
    };
  });

  return {
    headers,
    mapping,
    contacts,
    summary: {
      total: contacts.length,
      valid: contacts.filter((c) => c.status === "valid").length,
      warnings: contacts.filter((c) => c.status === "warning").length,
      invalid: contacts.filter((c) => c.status === "invalid").length,
      duplicates: contacts.filter((c) => c.status === "duplicate").length,
      suppressed: contacts.filter((c) => c.suppressionReason).length,
    },
  };
}
