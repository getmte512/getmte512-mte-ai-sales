# MTE AI Sales Platform

Milestone 1 is a secure retail contact importer and searchable CRM for More Than Energy.

## Current scope

- Authenticated MTE admin access
- CSV file validation and preview
- Automatic mapping for MTE and common contact headers
- Contact cleaning and normalization
- Missing-information warnings
- Exact email duplicate detection within an upload
- Email suppression handling for unsubscribes, complaints, hard bounces, and previous suppressions
- Transactional import into Supabase PostgreSQL
- Searchable contact CRM

Research, personas, scoring, AI generation, and outreach sending are intentionally not included in this milestone.

## Platform roadmap

Future approval-gated milestones will add retailer research, buyer personas, prospect scoring, personalized outreach drafts, follow-up management, sample tracking, sales reporting, and daily strategy recommendations. No message will ever be sent automatically without Scott's approval.

## Local setup

1. Install Node.js 20 or later and run `pnpm install`.
2. Create a Supabase project.
3. Run `supabase/migrations/001_contact_importer.sql` in the Supabase SQL editor.
4. Create Scott's user in Supabase Authentication.
5. Copy `.env.example` to `.env.local` and add the Supabase project URL, anonymous key, and server-only service-role key.
6. Run `pnpm dev` and open `http://localhost:3000`.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser or commit `.env.local`.

## Testing

- Run automated tests with `pnpm test` after dependencies are installed.
- Run the dependency-free MTE pilot check with:

  `node --experimental-strip-types scripts/pilot-validation.mjs "C:\path\to\mte-contacts.csv"`

## Pilot procedure

Use 10–20 MTE contacts first. Confirm the preview counts, warnings, duplicates, and suppressions before selecting **Import contacts**. Then search for several imported buyers in the Contact CRM.

## Approval gate

After Milestone 1 testing, development stops for Scott's approval. No research or outreach functionality should begin before approval.
