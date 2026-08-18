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

**Status: implementation complete pending merge to `main`; production use requires migration `051` and live validation.**

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
