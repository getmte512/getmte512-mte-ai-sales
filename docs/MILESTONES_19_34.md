# Milestones 19–34

This file supplements `PROJECT_ROADMAP.md` with the operating-review and governance work implemented after Milestone 18. The product rule is unchanged: AI may research, organize, score, recommend, and draft, but human approval remains required for outreach and customer confirmation remains required for orders.

- **Milestone 19 — Historical operating trends:** compare immutable weekly/monthly review snapshots over time with deterministic like-for-like metrics.
- **Milestone 20 — Operating targets and variance:** versioned admin-set weekly/monthly targets with auditable reasons and deterministic variance-to-goal scorecards. Requires migration `053_sales_operating_targets.sql`.
- **Milestone 21 — Target-aware immutable snapshots:** bind the active target context and target hash into each review snapshot; close the legacy snapshot RPC. Requires migration `054_operating_review_target_context.sql`.
- **Milestone 22 — Target-attainment trends:** compare historical goal attainment only from immutable target-aware snapshots.
- **Milestone 23 — Goal focus:** translate below-target weekly metrics into transparent read-only focus guidance without creating tasks or changing CRM state.
- **Milestone 24 — Target-change history:** show prior target values, reasons, effective dates, timestamps, and actors as a read-only governance timeline.
- **Milestone 25 — Operating-review annotations:** append-only observations, decisions, and risks tied to immutable snapshots with audited server-side creation and backup coverage. Requires migration `055_operating_review_annotations.sql`.
- **Milestone 26 — Decision/risk register:** derive a read-only carry-forward register from append-only review context.
- **Milestone 27 — Review context summary:** surface preserved decisions, risks, and context counts on the main operating review.
- **Milestone 28 — Context coverage:** identify recorded snapshots that still lack preserved human context without automatically creating reminders or tasks.
- **Milestone 29 — Period-aware context:** keep weekly and monthly observations, decisions, and risks separated by the cadence of their immutable snapshot.
- **Milestone 30 — Cadence-specific headlines:** show the latest weekly decision/risk separately from the latest monthly decision/risk.
- **Milestone 31 — Context freshness by cadence:** report whether weekly/monthly context is current with the newest snapshot, behind it, or missing.
- **Milestone 32 — Snapshot-specific context drilldown:** group observations, decisions, and risks under the exact immutable review snapshot they belong to.
- **Milestone 33 — Review evidence export:** provide an authenticated read-only JSON export of immutable snapshots, target evidence, append-only annotations, and a deterministic export evidence hash.
- **Milestone 34 — Schema and roadmap alignment:** production smoke, deployment instructions, and roadmap documentation are aligned to the actual schema ceiling through migration `055` and the implemented Milestone 33 operating-review surface.

All milestones in this range preserve the existing safety boundaries: no autonomous sending, reply review, task completion, prospect acceptance, pipeline mutation, target self-modification, historical-evidence rewrite, or Shopify order creation.
