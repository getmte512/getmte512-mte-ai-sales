export type ResearchContact = {
  id: string;
  company_name: string;
  store_banner_name: string | null;
  buyer_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website: string | null;
  category: string | null;
  state: string | null;
  notes: string | null;
};

export type ResearchEvidence = {
  contact_id: string;
  source_type: "linkedin" | "company_website";
  source_url: string;
  confidence: "medium" | "high";
  research_note: string;
  researched_at: string;
};

export type ReviewableResearchContact = ResearchContact & {
  evidence: ResearchEvidence | null;
};

export type ResearchAccountProfile = {
  accountKey: string;
  companyName: string;
  storeBannerName: string | null;
  category: string | null;
  state: string | null;
  buyers: ReviewableResearchContact[];
};

export function buildResearchProfiles(
  contacts: ResearchContact[],
  evidence: ResearchEvidence[],
): ResearchAccountProfile[] {
  const latestEvidence = new Map<string, ResearchEvidence>();
  for (const item of [...evidence].sort((a, b) => b.researched_at.localeCompare(a.researched_at))) {
    if (!latestEvidence.has(item.contact_id)) latestEvidence.set(item.contact_id, item);
  }

  const accounts = new Map<string, ResearchAccountProfile>();
  for (const contact of contacts) {
    const accountKey = `${contact.company_name.trim().toLowerCase()}|${(contact.store_banner_name ?? "").trim().toLowerCase()}`;
    const existing = accounts.get(accountKey) ?? {
      accountKey,
      companyName: contact.company_name,
      storeBannerName: contact.store_banner_name,
      category: contact.category,
      state: contact.state,
      buyers: [],
    };
    if (!existing.category && contact.category) existing.category = contact.category;
    if (!existing.state && contact.state) existing.state = contact.state;
    existing.buyers.push({ ...contact, evidence: latestEvidence.get(contact.id) ?? null });
    accounts.set(accountKey, existing);
  }

  return [...accounts.values()]
    .map((account) => ({
      ...account,
      buyers: [...account.buyers].sort((a, b) => (a.buyer_name ?? "").localeCompare(b.buyer_name ?? "")),
    }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
}
