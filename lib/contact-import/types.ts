export const MTE_FIELDS = [
  "company",
  "storeBanner",
  "buyerName",
  "jobTitle",
  "email",
  "phone",
  "linkedinUrl",
  "website",
  "city",
  "state",
  "category",
  "distributor",
  "notes",
] as const;

export type MteField = (typeof MTE_FIELDS)[number];

export type ColumnMapping = Record<string, MteField | "ignore">;

export type ContactDraft = {
  company: string;
  storeBanner: string;
  buyerName: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  website: string;
  city: string;
  state: string;
  category: string;
  distributor: string;
  notes: string;
  emailStatus: string;
  opened: boolean;
  clicked: boolean;
  unsubscribed: boolean;
  reportedSpam: boolean;
};

export type RowIssue = {
  field: string;
  severity: "warning" | "error";
  message: string;
};

export type ReviewedContact = ContactDraft & {
  sourceRow: number;
  status: "valid" | "warning" | "invalid" | "duplicate";
  completeness: "complete" | "usable" | "needs_information" | "minimal";
  suppressionReason: string | null;
  issues: RowIssue[];
  duplicateOfRow: number | null;
  raw: Record<string, string>;
};

export type ImportPreview = {
  headers: string[];
  mapping: ColumnMapping;
  contacts: ReviewedContact[];
  summary: {
    total: number;
    valid: number;
    warnings: number;
    invalid: number;
    duplicates: number;
    suppressed: number;
  };
};
