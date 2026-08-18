# MTE AI Sales Platform

More Than Energy's private retail-sales workspace. It turns retailer contact data into a researched, prioritized, approval-gated sales pipeline.

## Current capabilities

- Authenticated MTE admin and sales access
- CSV validation, preview, normalization, duplicate detection, and suppression handling
- Searchable retail-contact CRM with buyer, company, email, phone, website, LinkedIn, category, territory, and research notes
- Evidence-backed web prospect discovery with source validation, dedupe, human review, saved profiles, analytics, and cost/usage guardrails
- Buyer research queue with scoring, outreach-ready status, reviewed verification gaps, and email-risk flags
- Personalized email and LinkedIn drafts with administrator approval controls
- Immutable delivery snapshots for approved outreach, with manual email/LinkedIn sent confirmation and durable audit evidence
- Optional Resend-backed approved-email delivery through a separate **Outbound Delivery** workspace; every external send requires a deliberate user confirmation, stable idempotency key, and immediate suppression/recipient recheck
- Explicit sent confirmation followed by an automatically scheduled three-day follow-up
- Prospect, contacted, sample, follow-up, opening-order, and not-interested pipeline stages
- Opening-order value, order date, and reorder follow-up tracking
- Daily action dashboard, sales funnel, territory/category summaries, recommendations, and CSV pipeline export
- Approval-gated Shopify synchronization, reconciliation decisions, exception monitoring, and snapshot verification

## Safety rules

- Messages are never sent autonomously. Provider email delivery happens only after a draft has been approved, frozen into the delivery ledger, and a user explicitly confirms **Send approved email now**.
- A draft must be approved before it can be prepared for sending, and approved/sent content cannot be overwritten in place.
- Suppression and the frozen approved recipient are rechecked immediately before provider delivery.
- Provider retries reuse the same immutable-intent idempotency key; ambiguous retries outside the provider safety window are blocked for manual reconciliation.
- Manual email and LinkedIn delivery remain available; text delivery remains consent-gated and manual.
- Suppressed contacts remain excluded from outreach.
- Unverified research is recorded as a verification gap rather than presented as fact.
- Supabase service-role, OpenAI, Resend, and Shopify credentials remain server-only and must never be committed.

## Local setup

1. Install Node.js 22 or later.
2. Run `npm install`.
3. Create `.env.local` with the Supabase project URL, anonymous key, and server-only service-role key.
4. Apply the SQL files in `supabase/migrations` in numeric order.
5. Create the admin user in Supabase Authentication.
6. Run `npm run dev -- --port 3001` and open `http://localhost:3001`.

Web prospect discovery and provider email delivery are optional. Leave their server-only credentials unset to keep those integrations disabled during local development.

## Verification

- `npm run preflight:local`
- `npm run security:scan`
- `npm run security:audit`
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

See `DEPLOYMENT.md` before configuring or publishing a hosted environment.

For a new contact list, begin with a small pilot and inspect the preview before importing. Never commit `.env.local`, contact CSV files, local secret-saving scripts, logs, or generated build artifacts.
