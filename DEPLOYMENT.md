# MTE CRM deployment checklist

No production deployment should proceed until the in-app **Launch Checklist** has no required blockers. The checklist fails closed: configuring an application URL or having code paths present is not treated as proof that a real workflow succeeded.

## 1. Choose the application address

Create the private Next.js project with the chosen host, then set `NEXT_PUBLIC_APP_URL` to its final HTTPS origin, for example `https://crm.example.com`. Do not include a path or trailing callback parameters.

## 2. Configure environment settings

Use `.env.example` as the field list. Enter real values only in the hosting provider's encrypted environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY` and `SHOPIFY_ADMIN_ACCESS_TOKEN` server-only. Never paste them into issues, commits, build logs, or chat.

The `LAUNCH_*_VERIFIED_AT` settings are evidence markers, not configuration shortcuts. Leave each one unset until its corresponding live verification in step 5 succeeds. Use an ISO timestamp for the completed verification; future or invalid timestamps are rejected.

## 3. Configure Supabase authentication URLs

In Supabase Authentication URL settings:

- Set the Site URL to the final `NEXT_PUBLIC_APP_URL` value.
- Add `<NEXT_PUBLIC_APP_URL>/auth/confirm` to the allowed redirect URLs.
- Keep `http://localhost:3001/auth/confirm` only for local development.

## 4. Run verification

Run `npm run preflight:production`, `npm test`, `npx tsc --noEmit`, and `npm run build`. The preflight command reports only presence and safety status; it never prints credential values.

## 5. Controlled release and evidence

Deploy to a private preview first. Sign in as an administrator, run **System Health** and **Launch Checklist**, and complete these live checks before setting their evidence markers:

- Invite a designated internal test account, complete `/auth/confirm` and account setup, then set `LAUNCH_INVITATION_VERIFIED_AT`.
- Exercise approval-required outreach, Shopify reconciliation (when configured), and reorder-request decisions; confirm the expected audit events persist, then set `LAUNCH_APPROVAL_FLOW_VERIFIED_AT`.
- Export an authenticated backup, validate the exported file through the recovery validator, and inspect the record counts before setting `LAUNCH_BACKUP_RESTORE_VERIFIED_AT`.

Finally select the retailer pilot and re-run the Launch Checklist. Shopify remains an optional pilot gate until real Shopify credentials are configured, but failed sync runs are a required operational blocker. Do not enable automated sending or Shopify write permissions.
