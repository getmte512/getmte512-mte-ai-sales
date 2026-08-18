# MTE AI Sales Platform Roadmap

## Product rule

AI may research, organize, score, recommend, and draft. No email, text message,
LinkedIn message, or customer notification is sent without Scott's approval.
Customer orders are never placed until the customer explicitly confirms them.

## Milestone 1 — Contact importer, CRM foundation, and Shopify readiness

- Securely import, clean, validate, deduplicate, and store retail contact CSVs.
- Flag missing fields, invalid records, unsubscribes, and suppressed contacts.
- Display contacts in a searchable lightweight CRM.
- Establish account and contact identifiers that can later link to Shopify
  customers and orders without rebuilding the contact database.
- Document the future Shopify customer, product, order, and inventory connection.
- Do not research prospects, generate outreach, send messages, or build the
  customer reorder portal in this milestone.

**Completion gate:** the importer works with MTE's real CSV, contacts are saved
and searchable, suppression rules are verified, and the database design has
been reviewed for future Shopify integration.

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
- Show order and shipment status and provide a route to request sales help.
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
- Require a reviewable company website or LinkedIn source, confidence, and research note for every candidate.
- Deduplicate candidates against existing CRM contacts before creating anything new.
- Require a sales/admin review before a discovered prospect becomes a CRM contact.
- Preserve the discovery source as contact research evidence and audit every accept/reject decision.
- Keep outreach approval, consent, suppression, and channel eligibility rules unchanged; discovery never sends a message.
- Support user-triggered external web discovery with consulted-source validation and server-only credentials.
- Preserve search provenance, saved prospecting profiles, profile performance analytics, structured reviewer feedback, and advisory profile-improvement insights.
- Enforce per-user transactional search/candidate budgets and cooldowns before calling the external search provider.

**Completion gate:** source-backed candidates can be queued, reviewed, deduplicated, accepted or rejected transactionally, and accepted candidates enter the CRM with durable research evidence and audit history. Automated web discovery feeds only the review queue, is source-validated and budget-guarded, and cannot create active CRM contacts or send outreach without the existing human controls.
