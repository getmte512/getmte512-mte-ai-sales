import type { ColumnMapping, MteField } from "./types.ts";

const HEADER_ALIASES: Record<string, MteField> = {
  company: "company",
  "company name": "company",
  retailer: "company",
  account: "company",
  "store name": "company",
  banner: "storeBanner",
  "store banner": "storeBanner",
  buyer: "buyerName",
  "buyer name": "buyerName",
  contact: "buyerName",
  "contact name": "buyerName",
  title: "jobTitle",
  "job title": "jobTitle",
  email: "email",
  "email address": "email",
  "work email": "email",
  phone: "phone",
  telephone: "phone",
  linkedin: "linkedinUrl",
  "linkedin url": "linkedinUrl",
  website: "website",
  url: "website",
  city: "city",
  state: "state",
  category: "category",
  distributor: "distributor",
  notes: "notes",
};

export function suggestMapping(headers: string[]): ColumnMapping {
  return Object.fromEntries(
    headers.map((header) => [header, HEADER_ALIASES[header.trim().toLowerCase()] ?? "ignore"]),
  );
}
