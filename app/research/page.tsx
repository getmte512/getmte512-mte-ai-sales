import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSales } from "@/lib/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildResearchProfiles, type ResearchContact, type ResearchEvidence } from "@/lib/research-profiles";

export default async function ResearchProfilesPage() {
  try {
    await requireSales();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") redirect("/login");
    throw error;
  }

  const supabase = createAdminClient();
  const [{ data: contacts, error: contactsError }, { data: evidence, error: evidenceError }] = await Promise.all([
    supabase.from("contacts").select("id,company_name,store_banner_name,buyer_name,job_title,email,phone,linkedin_url,website,category,state,notes").order("company_name"),
    supabase.from("contact_research_evidence").select("contact_id,source_type,source_url,confidence,research_note,researched_at").order("researched_at", { ascending: false }),
  ]);
  if (contactsError) throw contactsError;
  if (evidenceError) throw evidenceError;

  const profiles = buildResearchProfiles((contacts ?? []) as ResearchContact[], (evidence ?? []) as ResearchEvidence[]);
  const reviewedBuyers = profiles.reduce((sum, profile) => sum + profile.buyers.filter((buyer) => buyer.evidence).length, 0);
  const totalBuyers = profiles.reduce((sum, profile) => sum + profile.buyers.length, 0);

  return (
    <main>
      <header className="topbar">
        <div><span className="eyebrow">MORE THAN ENERGY</span><h1>Research Profiles</h1></div>
        <Link className="sign-out-button" href="/">Back to CRM</Link>
      </header>
      <section className="workspace">
        <div className="panel">
          <div className="panel-heading"><div><span className="section-label">MILESTONE 2</span><h2>Reviewable retailer and buyer research</h2><p>Every verified profile shows the source, confidence, research note, and timestamp used to support it.</p></div></div>
          <div className="research-summary"><button><strong>{profiles.length}</strong><span>Retailer accounts</span></button><button><strong>{totalBuyers}</strong><span>Buyer profiles</span></button><button><strong>{reviewedBuyers}</strong><span>Source-backed</span></button><button><strong>{Math.max(0,totalBuyers-reviewedBuyers)}</strong><span>Need evidence</span></button></div>
        </div>
        <div className="activity-list">
          {profiles.map((profile) => <article className="panel" key={profile.accountKey}>
            <div className="panel-heading"><div><span className="section-label">RETAILER ACCOUNT</span><h2>{profile.companyName}{profile.storeBannerName ? ` / ${profile.storeBannerName}` : ""}</h2><p>{[profile.category,profile.state].filter(Boolean).join(" · ") || "Category and territory not yet confirmed"}</p></div></div>
            {profile.buyers.map((buyer) => <div className="match-row" key={buyer.id}>
              <div>
                <strong>{buyer.buyer_name || "Buyer not identified"}{buyer.job_title ? ` · ${buyer.job_title}` : ""}</strong>
                <p>{buyer.email || "Email not confirmed"}{buyer.phone ? ` · ${buyer.phone}` : ""}</p>
                {buyer.evidence ? <><p>{buyer.evidence.research_note}</p><p><a href={buyer.evidence.source_url} target="_blank" rel="noreferrer">Review {buyer.evidence.source_type === "linkedin" ? "LinkedIn" : "company website"} source</a> · {buyer.evidence.confidence} confidence · researched {new Date(buyer.evidence.researched_at).toLocaleString()}</p></> : <p>No reviewable research evidence recorded yet.</p>}
              </div>
              <span className={`badge ${buyer.evidence ? "valid" : "warning"}`}>{buyer.evidence ? `${buyer.evidence.confidence} confidence` : "Evidence needed"}</span>
            </div>)}
          </article>)}
          {!profiles.length && <div className="panel empty">No retailer profiles are available yet.</div>}
        </div>
      </section>
    </main>
  );
}
