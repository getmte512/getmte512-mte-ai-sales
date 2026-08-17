# MTE AI Sales Platform

More Than Energy's private retail-sales workspace. It turns retailer contact data into a researched, prioritized, approval-gated sales pipeline.

## Current capabilities

- Authenticated MTE admin access
- CSV validation, preview, normalization, duplicate detection, and suppression handling
- Searchable retail-contact CRM with buyer, company, email, phone, website, LinkedIn, category, territory, and research notes
- Buyer research queue with scoring, outreach-ready status, reviewed verification gaps, and email-risk flags
- Personalized email and LinkedIn drafts with approval controls
- One-click preparation of approved emails without automatic sending
- Explicit sent confirmation followed by an automatically scheduled three-day follow-up
- Prospect, contacted, sample, follow-up, opening-order, and not-interested pipeline stages
- Opening-order value, order date, and reorder follow-up tracking
- Daily action dashboard, sales funnel, territory/category summaries, recommendations, and CSV pipeline export
- Approval-gated Shopify synchronization, reconciliation decisions, exception monitoring, and snapshot verification

## Safety rules

- Messages are never sent automatically.
- A draft must be approved before it can be prepared for sending.
- Marking a draft sent requires confirmation and should happen only after the message was actually sent.
- Suppressed contacts remain excluded from outreach.
- Unverified research is recorded as a verification gap rather than presented as fact.
- Supabase service-role credentials remain server-only and must never be committed.

## Local setup

1. Install Node.js 20 or later.
2. Run `npm install`.
3. Create `.env.local` with the Supabase project URL, anonymous key, and server-only service-role key.
4. Apply the SQL files in `supabase/migrations` in numeric order.
5. Create the admin user in Supabase Authentication.
6. Run `npm run dev -- --port 3001` and open `http://localhost:3001`.

## Verification

- `npm run preflight:local`
- `npm run security:scan`
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

See `DEPLOYMENT.md` before configuring or publishing a hosted environment.

For a new contact list, begin with a small pilot and inspect the preview before importing. Never commit `.env.local`, contact CSV files, local secret-saving scripts, logs, or generated build artifacts.
