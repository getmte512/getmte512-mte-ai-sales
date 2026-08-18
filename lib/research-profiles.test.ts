import { describe, expect, it } from "vitest";
import { buildResearchProfiles, type ResearchContact, type ResearchEvidence } from "./research-profiles";

const contact = (id: string, buyer: string): ResearchContact => ({
  id,
  company_name: "Retailer One",
  store_banner_name: null,
  buyer_name: buyer,
  job_title: "Buyer",
  email: `${id}@example.com`,
  phone: null,
  linkedin_url: null,
  website: "https://example.com",
  category: "Wellness",
  state: "TX",
  notes: null,
});

describe("buildResearchProfiles", () => {
  it("groups buyers into a retailer profile and attaches the latest evidence", () => {
    const evidence: ResearchEvidence[] = [
      { contact_id: "a", source_type: "company_website", source_url: "https://example.com/old", confidence: "medium", research_note: "Older", researched_at: "2026-08-16T10:00:00Z" },
      { contact_id: "a", source_type: "linkedin", source_url: "https://linkedin.com/in/a", confidence: "high", research_note: "Confirmed current buyer", researched_at: "2026-08-17T10:00:00Z" },
    ];
    const profiles = buildResearchProfiles([contact("b", "Blake"), contact("a", "Alex")], evidence);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].buyers.map((buyer) => buyer.buyer_name)).toEqual(["Alex", "Blake"]);
    expect(profiles[0].buyers[0].evidence?.source_url).toBe("https://linkedin.com/in/a");
    expect(profiles[0].buyers[1].evidence).toBeNull();
  });
});
