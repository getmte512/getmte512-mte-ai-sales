"use client";

import { useMemo, useState } from "react";
import type { ImportPreview } from "@/lib/contact-import/types";

type CrmContact = {
  id: string;
  buyer_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  company_name: string;
  store_banner_name: string | null;
  category: string | null;
  state: string | null;
  completeness: string;
  email_health: string;
};

export function ContactImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"import" | "crm">("import");

  const importable = useMemo(
    () => preview?.contacts.filter((contact) => contact.status === "valid" || contact.status === "warning") ?? [],
    [preview],
  );

  async function inspectFile() {
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    const formData = new FormData(); formData.append("file", file);
    const response = await fetch("/api/import/preview", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to inspect the file.");
    else setPreview(result);
    setBusy(false);
  }

  async function commitImport() {
    if (!file || !preview) return;
    setBusy(true); setError("");
    const response = await fetch("/api/import/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, contacts: importable }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Import failed.");
    else { setNotice(`${result.imported ?? importable.length} contacts imported.`); await loadContacts(); setView("crm"); }
    setBusy(false);
  }

  async function loadContacts(query = search) {
    setBusy(true); setError("");
    const response = await fetch(`/api/contacts?q=${encodeURIComponent(query)}`);
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to load CRM contacts.");
    else setContacts(result.contacts);
    setBusy(false);
  }

  return (
    <section className="workspace">
      <nav className="tabs" aria-label="Milestone sections">
        <button className={view === "import" ? "active" : ""} onClick={() => setView("import")}>CSV Import</button>
        <button className={view === "crm" ? "active" : ""} onClick={() => { setView("crm"); void loadContacts(); }}>Contact CRM</button>
      </nav>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {view === "import" ? (
        <>
          <div className="panel upload-panel">
            <div>
              <span className="section-label">STEP 1</span>
              <h2>Upload a retail contact CSV</h2>
              <p>The file is inspected before anything is saved. Pilot limit: 10 MB or 50,000 rows.</p>
            </div>
            <label className="file-picker">
              <input type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} />
              <span>{file ? file.name : "Choose CSV file"}</span>
            </label>
            <button className="primary" disabled={!file || busy} onClick={inspectFile}>{busy ? "Inspecting…" : "Inspect file"}</button>
          </div>

          {preview && (
            <>
              <div className="stats">
                <Stat label="Total rows" value={preview.summary.total} />
                <Stat label="Ready" value={preview.summary.valid + preview.summary.warnings} />
                <Stat label="Warnings" value={preview.summary.warnings} />
                <Stat label="Invalid" value={preview.summary.invalid} />
                <Stat label="Duplicates" value={preview.summary.duplicates} />
                <Stat label="Suppressed" value={preview.summary.suppressed} />
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <div><span className="section-label">STEP 2</span><h2>Review before importing</h2></div>
                  <button className="primary" disabled={!importable.length || busy} onClick={commitImport}>Import {importable.length} contacts</button>
                </div>
                <div className="mapping-note"><strong>Detected mapping:</strong> {Object.entries(preview.mapping).map(([source, target]) => `${source} → ${target}`).join(" · ")}</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Row</th><th>Company</th><th>Buyer</th><th>Email</th><th>Status</th><th>Missing / warnings</th></tr></thead>
                    <tbody>{preview.contacts.slice(0, 100).map((contact) => (
                      <tr key={contact.sourceRow}>
                        <td>{contact.sourceRow}</td><td>{contact.company || "—"}</td><td>{contact.buyerName || "—"}</td><td>{contact.email || "—"}</td>
                        <td><span className={`badge ${contact.status}`}>{contact.status}</span>{contact.suppressionReason && <span className="badge suppressed">suppressed</span>}</td>
                        <td className="issues">{contact.issues.map((issue) => issue.message).join(" ") || "None"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                {preview.contacts.length > 100 && <p className="muted">Showing the first 100 rows. All {preview.contacts.length} rows will be processed.</p>}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="panel">
          <div className="panel-heading">
            <div><span className="section-label">CONTACT CRM</span><h2>Imported retail buyers</h2></div>
            <form className="search" onSubmit={(event) => { event.preventDefault(); void loadContacts(); }}>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search buyer, company, email, category…" />
              <button className="secondary" disabled={busy}>Search</button>
            </form>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Buyer</th><th>Company</th><th>Email</th><th>Title</th><th>Category</th><th>Completeness</th><th>Email health</th></tr></thead>
              <tbody>{contacts.map((contact) => (
                <tr key={contact.id}><td>{contact.buyer_name || "Unnamed contact"}</td><td>{contact.company_name}{contact.store_banner_name ? ` / ${contact.store_banner_name}` : ""}</td><td>{contact.email || "—"}</td><td>{contact.job_title || "—"}</td><td>{contact.category || "—"}</td><td><span className="badge neutral">{contact.completeness.replaceAll("_", " ")}</span></td><td><span className={`badge ${contact.email_health === "suppressed" ? "suppressed" : "neutral"}`}>{contact.email_health}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
          {!contacts.length && <div className="empty">No contacts loaded. Import a CSV or run a search.</div>}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat"><strong>{value.toLocaleString()}</strong><span>{label}</span></div>;
}
