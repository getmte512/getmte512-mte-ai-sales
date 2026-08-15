import type { ContactDraft, RowIssue } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA",
  michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

export function cleanText(value: unknown, maxLength = 500): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeEmail(value: unknown): string {
  return cleanText(value, 320).replace(/^[<\s]+|[>\s]+$/g, "").toLowerCase();
}

export function normalizePhone(value: unknown): string {
  const original = cleanText(value, 60);
  const extension = original.match(/(?:ext\.?|x)\s*(\d+)$/i)?.[1];
  const digits = original.replace(/\D/g, "");
  if (digits.length < 7) return original;
  const normalized = digits.length === 10 ? `+1${digits}` : digits.startsWith("1") && digits.length === 11 ? `+${digits}` : `+${digits}`;
  return extension ? `${normalized} x${extension}` : normalized;
}

export function normalizeUrl(value: unknown, linkedinOnly = false): string {
  const raw = cleanText(value, 1000);
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    url.protocol = "https:";
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "trk"].forEach((key) => url.searchParams.delete(key));
    if (linkedinOnly && !/(^|\.)linkedin\.com$/i.test(url.hostname)) return raw;
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

export function normalizeState(value: unknown): string {
  const state = cleanText(value, 80);
  if (/^[A-Za-z]{2}$/.test(state)) return state.toUpperCase();
  return STATE_CODES[state.toLowerCase()] ?? state;
}

export function validateContact(contact: ContactDraft): RowIssue[] {
  const issues: RowIssue[] = [];
  if (!contact.company && !contact.storeBanner) {
    issues.push({ field: "company", severity: "error", message: "Company or store banner is required." });
  }
  if (!contact.buyerName && !contact.email && !contact.phone && !contact.linkedinUrl) {
    issues.push({ field: "buyerName", severity: "error", message: "A buyer name or contact method is required." });
  }
  if (!contact.buyerName) issues.push({ field: "buyerName", severity: "warning", message: "Buyer name is missing." });
  if (!contact.email) issues.push({ field: "email", severity: "warning", message: "Email is missing." });
  else if (!EMAIL_PATTERN.test(contact.email)) issues.push({ field: "email", severity: "error", message: "Email format is invalid." });
  if (!contact.jobTitle) issues.push({ field: "jobTitle", severity: "warning", message: "Job title is missing." });
  if (!contact.linkedinUrl) issues.push({ field: "linkedinUrl", severity: "warning", message: "LinkedIn URL is missing." });
  if (contact.linkedinUrl && !/(^https:\/\/)?([^/]+\.)?linkedin\.com\//i.test(contact.linkedinUrl)) {
    issues.push({ field: "linkedinUrl", severity: "warning", message: "LinkedIn URL could not be verified as a LinkedIn address." });
  }
  return issues;
}

export function completenessFor(contact: ContactDraft): "complete" | "usable" | "needs_information" | "minimal" {
  const populated = [contact.company, contact.buyerName, contact.jobTitle, contact.email, contact.phone, contact.linkedinUrl, contact.website, contact.city, contact.state, contact.category].filter(Boolean).length;
  if (populated >= 9) return "complete";
  if (populated >= 6) return "usable";
  if (populated >= 3) return "needs_information";
  return "minimal";
}

export function suppressionReason(contact: ContactDraft): string | null {
  const status = contact.emailStatus.toLowerCase();
  if (contact.reportedSpam || status === "spam") return "spam_complaint";
  if (contact.unsubscribed) return "unsubscribed";
  if (status === "hard bounced") return "hard_bounce";
  if (status === "suppressed") return "previously_suppressed";
  return null;
}
