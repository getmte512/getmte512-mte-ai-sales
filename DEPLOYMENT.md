# MTE CRM deployment checklist

No production deployment should proceed until the in-app **Launch Checklist** has no required blockers. The checklist fails closed: configuring an application URL or having code paths present is not treated as proof that a real workflow succeeded.

## 1. Choose the application address

Create the private Next.js project with the chosen host, then set `NEXT_PUBLIC_APP_URL` to its final HTTPS origin, for example `https://crm.example.com`. Do not include a path or trailing callback parameters.

## 2. Configure environment settings

Use `.env.example` as the field list. Enter real values only in the hosting provider's encrypted environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY` and `SHOPIFY_ADMIN_ACCESS_TOKEN` server-only. Never paste them into issues, commits, build logs, or chat.

Legacy `LAUNCH_*_VERIFIED_AT` settings remain supported as fallback evidence markers. New production verification should be recorded through the authenticated launch-readiness endpoint after the corresponding live check succeeds so the verifier, timestamp, note, and audit event are retained without requiring a redeploy.

## 3. Configure Supabase authentication URLs

In Supabase Authentication URL settings:

- Set the Site URL to the final `NEXT_PUBLIC_APP_URL` value.
- Add `<NEXT_PUBLIC_APP_URL>/auth/confirm` to the allowed redirect URLs.
- Keep `http://localhost:3001/auth/confirm` only for local development.

## 4. Run verification

Use Node.js 22 or later. Run `npm run preflight:production`, `npm run security:scan`, `npm run security:audit`, `npm test`, `npx tsc --noEmit`, and `npm run build`. The preflight command reports only presence and safety status; it never prints credential values.

## 5. Controlled release and evidence

Deploy to a private preview first. Sign in as an administrator, run **System Health** and **Launch Checklist**, and complete these live checks before recording their evidence:

- Invite a designated internal test account and complete `/auth/confirm` and account setup. Record the `invitation` verification with a concise note describing the account used and result.
- Exercise approval-required outreach, Shopify reconciliation (when configured), retailer checkout confirmation, and reorder-request decisions; confirm the expected audit events persist. Record the `approval_flow` verification with a concise result note.
- Export an authenticated backup, validate the exported file through the recovery validator, and inspect the record counts. Record the `backup_restore` verification with the validation result.

Recording evidence requires an administrator, explicit `RECORD_LIVE_VERIFICATION` confirmation, and an 8–1000 character note. The database update and audit event are committed together.

Finally select the retailer pilot and re-run the Launch Checklist. Shopify remains an optional pilot gate until real Shopify credentials are configured, but failed sync runs are a required operational blocker. Do not enable automated sending or Shopify Admin API order creation.
