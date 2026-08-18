# MTE AI Sales Platform Roadmap

## Product rule

AI may research, organize, score, recommend, and draft. No email, text message,
LinkedIn message, or customer notification is sent without Scott's approval.
Customer orders are never placed until the customer explicitly confirms them.

## Milestones 1–10 — Foundation through production launch

Milestones 1–10 established the contact CRM, research and scoring, approval-only outreach, follow-ups and pipeline management, reporting, Shopify synchronization, retailer reorder portal, reorder intelligence, and production hardening. Their original product rules remain in force.

## Milestone 11 — Evidence-backed prospect discovery

**Status: implementation complete on `main`; production use still requires real credentials and live validation.**

Discovery is source-backed, deduplicated, budget-guarded, review-gated, and cannot create active CRM contacts or send outreach without explicit human action.

## Milestone 12 — Approval-gated outbound delivery and response tracking

**Status: implementation complete on `main`; production use still requires migrations through 045, signed Resend webhook configuration, and live validation.**

Approved delivery is immutable and idempotent; reply correlation requires RFC evidence; unmatched inbound mail stays unmatched; permanent bounces/complaints suppress delivery; no response is sent automatically.

## Milestone 13 — Conversation intelligence and assisted follow-up

**Status: implementation complete on `main`; production use still requires migrations through 050, server-only OpenAI configuration, and live validation.**

Buyer replies are untrusted model input. Recommendations remain separate from CRM state, require explicit review, and expose task creation, pipeline application, and response-draft handoff only as separate human actions. No autonomous CRM mutation or response sending is allowed.

## Milestone 14 — Unified daily sales command center

**Status: implementation complete on `main`; no new credentials or database migration are required.**

The command center deterministically ranks replies, tasks, prospect reviews, and account strategy into Act now / Today / Up next lanes, fails closed on missing sources, and has no direct mutation authority.

## Milestone 15 — Framework and dependency security hardening

**Status: implementation complete on `main`; no new credentials or database migration are required.**

Next.js is pinned to 16.3.0, the npm lockfile was regenerated, the production audit fails at high severity, and the full install/security/preflight/test/type/build gate is required.

## Milestone 16 — Audited command-center outcomes

**Status: implementation complete on `main`; production use requires migration `051` and live validation.**

Command-center cards can be completed, dismissed, or deferred with audited evidence stored separately from source CRM state. Fingerprints allow materially changed recommendations to reappear. Outcomes never review replies, complete underlying tasks, mutate pipeline/prospect state, approve/send outreach, or create orders.

## Milestone 17 — Weekly and monthly sales operating review

**Status: implementation complete on `main`; no new credentials or database migration are required beyond the Milestone 16 decision table.**

- Provide a read-only Sales Operating Review comparing current seven-day and 30-day windows with immediately preceding equal periods.
- Report Shopify revenue/orders, confirmed outreach deliveries, buyer replies, completed sales tasks, accepted prospects, delivered samples, and completed command-center cards.
- Show dismissals/deferrals as workload context and reply-to-delivery activity as descriptive evidence rather than causal attribution.
- Use deterministic rules, Pacific/Honolulu operating dates, and fail closed on missing required sources.

**Completion gate:** weekly and monthly performance is comparable with explicit windows and prior values, zero baselines do not invent percentage growth, missing sources block the report, and the full security/test/type/build gate passes without mutation authority.

## Milestone 18 — Immutable operating-review snapshots

**Status: implementation complete pending merge to `main`; production use requires migration `052` and live validation.**

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
