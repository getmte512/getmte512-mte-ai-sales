# MTE AI Sales Platform Roadmap

## Product rule

AI may research, organize, score, recommend, and draft. No email, text message,
LinkedIn message, or customer notification is sent without Scott's approval.
Customer orders are never placed until the customer explicitly confirms them.

## Milestone 1 — Contact importer, CRM foundation, and Shopify readiness

- Securely import, clean, validate, deduplicate, and store retail contact CSVs.
- Flag missing fields, invalid records, unsubscribes, and suppressed contacts.
- Display contacts in a searchable lightweight CRM.
- Establish account and contact identifiers that can later link to Shopify customers and orders without rebuilding the contact database.

## Milestone 2 — Retailer and buyer research

- Research retailer accounts and buyer roles.
- Store sources, confidence, and research timestamps.
- Create reviewable buyer and account profiles.

## Milestone 3 — Prospect scoring and daily priorities

- Rank retail opportunities using transparent scoring factors.
- Produce Scott's daily prioritized account list.
- Allow manual score adjustments and record why scores changed.

## Milestone 4 — Approval-only outreach drafting

- Draft personalized email, text, and LinkedIn messages.
- Require Scott to review, edit, and approve every message.
- Maintain suppression, consent, and channel eligibility checks.

## Milestone 5 — Follow-ups, samples, and pipeline management

- Track conversations, tasks, pipeline stages, and next actions.
- Track sample shipments, delivery, and recommended follow-up timing.
- Keep CRM changes reviewable and auditable.

## Milestone 6 — Reporting and sales strategy

- Show pipeline, outreach, conversion, sample, and account health reporting.
- Recommend the highest-value opportunities and next actions each day.

## Milestone 7 — Shopify synchronization

- Securely connect MTE's Shopify store.
- Match Shopify customers to CRM accounts and contacts.
- Synchronize approved customer, product, inventory, order, and fulfillment data.
- Provide reconciliation, error handling, access controls, and audit logs.

## Milestone 8 — Retailer reorder portal

- Give approved wholesale customers secure account access.
- Show eligible products, previous orders, and relevant availability.
- Let customers repeat or modify an earlier order and confirm it through Shopify.
- Feed confirmed reorder activity back into the MTE CRM.

## Milestone 9 — Reorder intelligence and account growth

- Predict likely reorder windows and accounts at risk of going quiet.
- Recommend replenishment, cross-sell, and account-growth actions.
- Draft reorder reminders for Scott's approval.
- Do not place orders or send reminders autonomously.

## Milestone 10 — Production hardening and launch

- Complete security, privacy, recovery, monitoring, and performance reviews.
- Test permissions, approval gates, Shopify reconciliation, and audit trails.
- Pilot with a small set of MTE users and retailer accounts before wider launch.

## Milestone 11 — Evidence-backed prospect discovery

**Status: implementation complete on `main`; production use still requires real credentials and live validation.**

- Discover prospective retailer accounts and buyer candidates outside the active CRM.
- Require reviewable source evidence, confidence, and research notes.
- Deduplicate candidates against existing CRM contacts.
- Require sales/admin review before a discovered prospect becomes a CRM contact.
- Preserve provenance, profiles, analytics, structured reviewer feedback, and transactional provider-usage guardrails.
- Automated web discovery feeds only the review queue, remains source-validated and budget-guarded, and cannot create active CRM contacts or send outreach without the existing human controls.
- Discovery never sends a message.

## Milestone 12 — Approval-gated outbound delivery and response tracking

**Status: implementation complete on `main`; production use still requires migrations through 045, signed Resend webhook configuration, and live validation.**

- Freeze approved delivery content and make completion idempotent.
- Preserve suppression, consent, eligibility, and administrator approval at the delivery boundary.
- Support optional explicitly confirmed provider email with stable idempotency and durable attempt/event evidence.
- Correlate replies only through RFC evidence; keep unmatched inbound mail explicitly unmatched.
- Surface a human reply-review queue and suppress permanent bounces/complaints.
- No response is sent automatically.

## Milestone 13 — Conversation intelligence and assisted follow-up

**Status: implementation complete on `main`; production use still requires migrations through 050, server-only OpenAI configuration, and live validation.**

- Treat inbound buyer messages as untrusted model input and never let reply text become instructions or tool authority.
- Analyze only replies with a proven RFC conversation match or an explicit audited human match to a delivered email intent.
- Classify buyer intent with explicit confidence and preserve a concise reviewable summary.
- Recommend the next human sales action and an optional pipeline-stage change without applying either automatically.
- Store recommendations separately from CRM state with accepted/dismissed review history and audit evidence.
- Rank replies with a transparent deterministic priority score using intent, confidence, conversation match, and age.
- Require explicit human acceptance before recommendation actions become available.
- Create an idempotent follow-up task only through a separate explicit action.
- Apply a suggested pipeline stage only through a separate explicit action and retain apply evidence.
- Copy an accepted suggested response into the standard outreach workflow only as a `draft`, with a recommendation-specific conversation thread key.
- Preserve the existing administrator approval, suppression, delivery-intent, and exactly-once delivery boundaries for that response draft.
- Keep unmatched-message resolution, recommendation review, task creation, pipeline application, and response-draft handoff auditable end-to-end.
- Aggregate accepted/dismissed recommendations into transparent intent/confidence quality signals and tuning advisories; these metrics never self-modify prompts, models, CRM state, or delivery behavior.
- No response is sent automatically, and AI has no autonomous CRM mutation authority.

**Completion gate:** a matched buyer reply can be analyzed into a constrained recommendation and optional response draft; a human can accept or dismiss it; task creation, pipeline mutation, and response-draft handoff each require separate explicit actions; repeated actions are idempotent where applicable; recommendation quality is measurable from explicit human review outcomes; and the resulting evidence is auditable without autonomous sends or hidden pipeline mutations. Production validation must confirm the Milestone 13 schema through migration `050` and exercise these controls with an internal/test conversation before wider use.

## Milestone 14 — Unified daily sales command center

**Status: implementation complete on `main`; no new credentials or database migration are required.**

- Combine unreviewed buyer replies, open sales tasks, pending prospect reviews, and existing account-level strategy recommendations into one sales-priority workspace.
- Keep the ranking deterministic and transparent; each item shows the action, reason, priority, and destination workspace rather than relying on an opaque model rank.
- Separate work into `Act now`, `Today`, and `Up next` lanes so direct buyer attention, unmatched inbound email, overdue tasks, due-today work, and lower-urgency opportunities are clearly distinguished.
- Treat unmatched inbound email as an explicit conversation-matching blocker instead of presenting it as a normal matched reply.
- Consolidate multiple signals for the same active CRM contact under the highest-priority visible action while preserving secondary signals as context and preserving raw workload counts.
- Keep pending discovery candidates separate until they are explicitly reviewed into the CRM.
- Fail closed when any required command-center data source is unreadable; never present a partial priority queue as if it were complete.
- Keep the command center read-only. Ranking cannot send outreach, approve drafts, match replies, complete tasks, change pipeline state, accept prospects, or create orders.

**Completion gate:** a sales user can open one workspace and see a trustworthy, source-complete, transparently ranked daily queue across buyer conversations, tasks, prospect review, and account strategy; urgent work is separated from later work; duplicate contact signals are consolidated without deleting evidence; and every state-changing action still happens through its existing explicit human-controlled workflow.

## Milestone 15 — Framework and dependency security hardening

**Status: implementation complete on `main`; no new credentials or database migration are required.**

- Upgrade the application from Next.js 15 to stable Next.js 16.3.0 and regenerate `package-lock.json` with npm's resolver.
- Move production PostCSS and Sharp dependencies beyond the high-severity advisory ranges reported by the prior dependency tree.
- Raise the production dependency gate from critical-only to `high` severity so future high or critical advisories fail CI instead of remaining informational.
- Preserve the existing Node.js 22 production baseline, Supabase integration, approval boundaries, outbound delivery controls, Shopify confirmation rules, and CRM mutation safeguards.
- Remove the deprecated `next lint` command rather than retaining a dead Next.js 15 script after the framework upgrade.
- Verify the exact dependency graph with `npm ci`, secret scanning, the stricter production audit, production preflight, the complete test suite, TypeScript, and the production build.

**Completion gate:** the lockfile resolves Next.js 16.3.0 with production dependencies outside the previously reported high-severity PostCSS and Sharp advisory ranges; `npm audit --omit=dev --audit-level=high` passes; and the full application safety/test/build gate passes without weakening any human approval or order-confirmation control.

## Milestone 16 — Audited command-center outcomes

**Status: implementation complete on `main`; production use requires migration `051` and live validation.**

- Let sales/admin users explicitly mark a command-center recommendation card complete, dismiss it with a note, or defer it to a future date.
- Store those decisions in `sales_command_decisions`, separate from buyer replies, sales tasks, pipeline rows, prospect-review records, outreach drafts, delivery state, and Shopify orders.
- Bind each decision to a SHA-256 fingerprint of the item identity, kind, recommended action, and reason so a materially changed recommendation can reappear instead of being hidden by stale history.
- Require short notes for dismiss/defer and require a future date for defer.
- Automatically make an expired deferral visible again without mutating its underlying CRM record.
- Record the decision row and `sales_command_decision_recorded` audit event atomically through a service-role RPC after sales/admin authorization.
- Recompute and verify the item fingerprint server-side before accepting a decision snapshot.
- Fail the command center closed if decision history cannot be read, preventing a queue from appearing complete when suppression history is missing.
- Keep source workflows independent: marking a card complete does not review a reply or complete an underlying task; dismiss/defer do not change pipeline or prospect state; no command outcome approves or sends outreach or creates an order.
- Add a production smoke check for migration `051` and a live launch ceremony that verifies outcome audit evidence while confirming source CRM state remains unchanged.

**Completion gate:** a sales user can complete, dismiss, or defer a recommendation card with auditable evidence; active deferrals disappear and later reappear when due; materially changed recommendations receive a new fingerprint and can reappear; source CRM records remain untouched by card outcomes; the production smoke test reports **Milestone 16 schema** as passing after migration `051`; and the full security/test/type/build gate passes.

## Milestone 17 — Weekly and monthly sales operating review

**Status: implementation complete on `main`; no new credentials or database migration are required beyond the Milestone 16 decision table.**

- Add a read-only Sales Operating Review workspace that compares the current seven-day and 30-day windows with the immediately preceding equal periods.
- Report Shopify revenue and order count, confirmed outreach deliveries, buyer replies, completed sales tasks, accepted prospects, delivered samples, and completed command-center cards from persisted evidence.
- Show command-card dismissals and deferrals as workload context rather than treating them as completed selling activity.
- Show a reply-to-delivery activity ratio as a descriptive activity measure, not as a causal conversion attribution.
- Generate deterministic operating signals from explicit period-over-period rules; do not fabricate model-generated explanations or percentages when the prior baseline is zero.
- Use the Pacific/Honolulu operating date for period boundaries.
- Fail closed if any required operating-review source is unavailable instead of presenting a partial report as complete.
- Keep the operating review read-only: it cannot change CRM records, command decisions, outreach state, or Shopify orders.

**Completion gate:** a sales user can open one workspace and see comparable weekly and monthly operating performance with explicit source windows and prior-period values; zero-baseline changes are represented without invented percentage growth; missing sources block the report; and the full security/test/type/build gate passes without introducing mutation authority.

## Milestone 18 — Immutable operating-review snapshots

**Status: implementation complete on `main`; production use requires migration `052` and live validation.**

- Let sales/admin users explicitly preserve the current weekly or monthly operating review as durable historical evidence from the Sales Operating Review workspace.
- Recompute the review server-side from Shopify/CRM evidence before recording; never trust browser-supplied metric values or a browser-supplied hash.
- Restrict snapshot recording to the current Pacific/Honolulu operating date so the API cannot manufacture retroactive reviews from today’s database state.
- Canonicalize the period, as-of date, and review payload and bind them to a deterministic SHA-256 payload hash.
- Store the complete review payload and source windows in `sales_operating_review_snapshots`, with one immutable row per period/as-of date.
- Make repeated recording idempotent when the hash matches, and reject an attempt to rewrite an existing period/date with different evidence.
- Record `sales_operating_review_snapshot_recorded` audit evidence atomically with the new snapshot through a service-role RPC after sales/admin authorization.
- Revoke direct public/authenticated table access and expose mutation only through the service-role RPC.
- Display retained snapshot history and evidence hashes alongside the live operating review without giving history records edit/delete controls.
- Fail the operating-review page closed if snapshot history cannot be read, so retained-history availability is part of the trustworthy review surface.
- Extend the read-only production smoke test with a named **Milestone 18 schema** check for migration `052` and explicitly verify the smoke test itself never records snapshots.
- Document the production ceremony: record weekly/monthly evidence, verify 64-character hashes and audit events, repeat to prove idempotency, and retain source CRM/outreach/order state unchanged.

**Completion gate:** a sales user can explicitly record weekly/monthly operating evidence for today; the server independently recomputes and hashes the review; the database preserves one immutable snapshot per period/date and rejects conflicting rewrites; repeated identical recording is idempotent; audit evidence identifies actor/period/date/hash; history is visible but not editable; production smoke reports **Milestone 18 schema** after migration `052`; and the full security/test/type/build gate passes without granting the snapshot workflow any CRM, outreach, pipeline, task, command-outcome, or Shopify-order mutation authority.

## Milestone 19 — Historical operating trends

**Status: implementation complete on `main`; no new migration or credentials required.**

Compare immutable weekly/monthly snapshots over time across revenue, orders, delivered outreach, buyer replies, completed tasks, accepted prospects, delivered samples, and command-card completions using deterministic like-for-like math.

## Milestone 20 — Versioned operating targets

**Status: implementation complete on `main`; production use requires migration `053`.**

Administrators set audited weekly/monthly targets as append-only versions; the operating review shows deterministic actual-versus-target gaps without automatic CRM or outreach actions.

## Milestone 21 — Target-aware immutable snapshots

**Status: implementation complete on `main`; production use requires migration `054`.**

Each new immutable review snapshot preserves the exact active target context and deterministic target scorecard, with a separate SHA-256 target hash and no target-less service-role snapshot path.

## Milestone 22 — Target-attainment trends

**Status: implementation complete on `main`; no new migration required.**

Historical goal performance is calculated only from target context frozen into immutable snapshots so later target changes cannot rewrite old attainment results.

## Milestone 23 — Target-aware command focus

**Status: implementation complete on `main`; no new migration required.**

Below-target weekly metrics produce transparent advisory focus signals linked to existing human-controlled workflows; the goal layer cannot create tasks or mutate CRM state.

## Milestone 24 — Target-change governance

**Status: implementation complete on `main`; no new migration required.**

Target version history remains visible with prior value, delta, effective dates, reason, timestamp, and actor so goal changes cannot silently move the goalposts.

## Milestone 25 — Auditable operating-review annotations

**Status: implementation complete on `main`; production use requires migration `055`.**

Sales/admin users can append Observations, Decisions, and Risks to immutable review snapshots. Annotation writes are explicitly confirmed, role-gated, audit logged, backup-covered, and cannot rewrite snapshot metrics or target evidence.

## Milestone 26 — Decision and risk carry-forward register

**Status: implementation complete on `main`; no new migration required.**

A deterministic read-only register carries forward recorded Decisions and Risks while Observations remain in the complete annotation history.

## Milestone 27 — Review-context summary

**Status: implementation complete on `main`; no new migration required.**

The main operating review surfaces context counts plus the latest recorded decision and risk directly from append-only evidence.

## Milestone 28 — Review-context coverage

**Status: implementation complete on `main`; no new migration required.**

The context workspace identifies immutable snapshots with and without preserved human context without automatically creating reminders or tasks.

## Milestone 29 — Period-aware review context

**Status: implementation complete on `main`; no new migration required.**

Weekly and monthly observations, decisions, and risks are summarized independently so one review cadence cannot inflate the other.

## Milestone 30 — Cadence-specific context headlines

**Status: implementation complete on `main`; no new migration required.**

The main operating review shows the latest weekly decision/risk separately from the latest monthly decision/risk, preserving cadence boundaries.

## Milestone 31 — Context freshness by cadence

**Status: implementation complete on `main`; no new migration required.**

Weekly/monthly context is explicitly marked current, behind, or missing according to whether the newest annotation belongs to the latest immutable snapshot for that cadence.

## Milestone 32 — Snapshot-specific context drilldown

**Status: implementation complete on `main`; no new migration required.**

Each immutable review snapshot displays only the observations, decisions, and risks recorded against that exact snapshot, with no edit/resolve mutation path.

## Milestone 33 — Operating-review evidence export

**Status: implementation complete on `main`; no new migration required.**

Sales users can export immutable review snapshots, target payloads/hashes, and append-only annotations as a no-store JSON evidence package with deterministic evidence hash and counts for archival or audit handoff.

## Milestone 34 — Schema, deployment, and roadmap alignment

**Status: implementation complete on `main`; no new migration required.**

- Extend production smoke verification through migration `055`, including a named Milestone 25 schema check.
- Keep the smoke path read-only and explicitly prohibit annotation writes during verification.
- Update deployment instructions through migrations `053`, `054`, and `055` while preserving earlier milestone validation requirements.
- Align roadmap status with the actual merged implementation through Milestone 33.

**Completion gate:** production operators can follow one current deployment path through migration `055`; production smoke verifies Milestones 20, 21, and 25; the roadmap reflects the actual merged feature sequence; and the full security/test/type/build gate passes without changing CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, or Shopify business state.

## Milestone 35 — Archived operating-review evidence verification

**Status: implementation complete on `main`; no new migration required.**

Authenticated sales users can verify archived Milestone 33 evidence packages by recomputing deterministic SHA-256 integrity, validating manifest counts and format version, enforcing a bounded upload size, and persisting nothing.

## Milestone 36 — Read-only evidence current-state cross-check

**Status: implementation complete on `main`; no new migration required.**

Integrity-verified archived evidence can be compared read-only with current snapshot and annotation evidence, reporting missing or mismatched records without restore, overwrite, RPC, or mutation authority.

## Milestone 37 — Evidence mismatch diagnostics

**Status: implementation complete on `main`; no new migration required.**

Current-state cross-checks report exact differing snapshot and annotation fields while preserving record-level missing/mismatched diagnostics and remaining read-only.

## Milestone 38 — Evidence reconciliation report export

**Status: implementation complete on `main`; no new migration required.**

After evidence verification and current-state comparison, sales users can export a deterministic no-store reconciliation JSON report bound to the archived package evidence hash, with no restore or persistence path.

## Milestone 39 — Archived reconciliation report verification

**Status: implementation complete on `main`; no new migration required.**

Saved reconciliation reports can be independently verified by recomputing their deterministic reconciliation hash through an authenticated, database-free, bounded verification path.

## Milestone 40 — Audit-bound evidence package v2

**Status: implementation complete on `main`; no new migration required.**

New operating-review evidence packages bind matching snapshot-recorded and annotation-added audit events into format v2 and its deterministic evidence hash while historical v1 packages remain integrity-verifiable.

## Milestone 41 — Audit current-state cross-check

**Status: implementation complete on `main`; no new migration required.**

Evidence reconciliation extends to bound audit rows, reporting missing audit events and exact changed audit fields while preserving historical v1 compatibility and read-only behavior.

## Milestone 42 — Authenticated evidence package v3

**Status: implementation complete on `main`; production use requires a server-only signing secret/key ID and live validation.**

New evidence exports use format v3 and authenticate the deterministic evidence hash with HMAC-SHA256. Verification, current-state cross-check, and reconciliation validate origin signatures before trusting a v3 package; v1/v2 remain explicitly legacy and unauthenticated.

## Milestone 43 — Evidence signing-key rotation readiness

**Status: implementation complete on `main`; no new migration required.**

Production rotation requires unique non-reused key IDs, retained prior secret material for the evidence-retention period, post-rotation validation, no silent historical re-signing, and an explicit compromised-key procedure.

## Milestone 44 — Evidence signing-key registry

**Status: implementation complete on `main`; no new migration required.**

Operators maintain a non-secret lifecycle registry for active, retired, and compromised evidence-signing key IDs, while cryptographic verification remains the only origin-authentication authority.

## Milestone 45 — Retained-key evidence verification

**Status: implementation complete on `main`; no new migration required.**

New v3 exports remain locked to the single active signing key while verification, cross-check, and reconciliation can select the package's exact retained historical key ID from server-only retained key material. Malformed, duplicate, unknown, weak, or incorrect key configuration fails closed.

## Milestone 46 — Compromised signing-key enforcement

**Status: implementation complete on `main`; no new migration required.**

The active signing key cannot be marked compromised, and a correctly signed historical v3 package from a compromised retained key is explicitly denied origin authentication across verification, cross-check, and reconciliation. Evidence bytes and deterministic hashes remain immutable.

## Milestone 47 — Roadmap ledger alignment guard

**Status: implementation complete on `main`; no new migration required.**

The roadmap is reconciled against the actual merged PR sequence from Milestones 34 through 46, closes the stale Milestone 34 `in progress` status, and adds regression coverage requiring the post-34 milestone ledger to remain present and complete.

**Completion gate:** the repository roadmap records the actual merged implementation sequence through Milestone 47; Milestone 34 no longer appears active; regression tests detect a missing post-34 milestone entry or stale Milestone 34 status; and the full security/test/type/build gate passes without adding business-state mutation authority.
