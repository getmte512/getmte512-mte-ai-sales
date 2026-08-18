# MTE CRM deployment checklist

No production deployment should proceed until the in-app **Launch Checklist** has no required blockers. The checklist fails closed: configuring an application URL or having code paths present is not treated as proof that a real workflow succeeded.

## 1. Choose the application address

Create the private Next.js project with the chosen host, then set `NEXT_PUBLIC_APP_URL` to its final HTTPS origin, for example `https://crm.example.com`. Do not include a path or trailing callback parameters.

## 2. Configure environment settings

Use `.env.example` as the field list. Enter real values only in the hosting provider's encrypted environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY` and `SHOPIFY_ADMIN_ACCESS_TOKEN` server-only. Never paste them into issues, commits, build logs, or chat.

Legacy `LAUNCH_*_VERIFIED_AT` settings remain supported as fallback evidence markers. New production verification should be recorded through the authenticated Launch Checklist after the corresponding live check succeeds so the verifier, timestamp, note, and audit event are retained without requiring a redeploy.

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
- Export an authenticated production backup and run it through **Backup recovery drill**. A launch-eligible drill must pass structure validation, SHA-256 integrity verification, use backup format v2, have zero validation errors, and be no more than seven days old. Inspect the record counts and recovery-drill history, then record the `backup_restore` live verification.
- Run the production smoke check and confirm the latest clean result is no more than 24 hours old.

Recording live verification requires an administrator, explicit `RECORD_LIVE_VERIFICATION` confirmation, and an 8–1000 character note. Evidence and its audit event are committed together.

## 6. Final launch ceremony

1. Re-run **System Health** and **Launch Checklist** against the final production deployment. Resolve every required blocker; do not treat optional Shopify configuration as required when Shopify is intentionally not connected.
2. Confirm the latest recovery drill shown on the Launch Checklist is passed, integrity-verified, zero-error, format v2, and still within the seven-day freshness window.
3. Confirm the latest production smoke test is clean and within the 24-hour freshness window.
4. Confirm the invitation, approval-flow, and backup/recovery live verifications are recorded.
5. Confirm there are no failed Shopify sync runs and review any approved-but-unsent outreach drafts. No autonomous-send gate should be enabled.
6. Record the **Launch sign-off** with a concise note identifying the production deployment and review. The server independently rechecks all required launch conditions and refuses sign-off if any are blocked. Sign-off is evidence only; it does not authorize outreach, create Shopify orders, or bypass pilot-transition guards.
7. Select the retailer pilot only after sign-off, then transition pilot accounts through the existing guarded workflow. Invited/active transitions independently require the current smoke, recovery, and verification evidence.

Retain the resulting launch sign-off, smoke history, recovery-drill history, live verifications, and audit events as the launch evidence package. These records are included in authenticated production backups. Do not enable automated sending or Shopify Admin API order creation as part of this milestone.
