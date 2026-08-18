# MTE CRM deployment checklist

No production deployment should proceed until the in-app **Launch Checklist** has no required blockers. The checklist fails closed: configuring an application URL or having code paths present is not treated as proof that a real workflow succeeded.

## 1. Choose the application address

Create the private Next.js project with the chosen host, then set `NEXT_PUBLIC_APP_URL` to its final HTTPS origin, for example `https://crm.example.com`. Do not include a path or trailing callback parameters.

## 2. Configure environment settings

Use `.env.example` as the field list. Enter real values only in the hosting provider's encrypted environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `OPENAI_API_KEY`, `RESEND_API_KEY`, and `RESEND_WEBHOOK_SECRET` server-only. Never paste them into issues, commits, build logs, or chat.

Web prospect discovery remains disabled unless `OPENAI_API_KEY` is configured. Its model and per-user search/candidate/cooldown limits are server-side settings. Keep the default limits until real usage is reviewed; raising them is an explicit operational decision, not a requirement for launch.

Provider-backed outbound email and reply tracking remain disabled unless `RESEND_API_KEY`, a verified `OUTREACH_FROM_EMAIL`, and `RESEND_WEBHOOK_SECRET` are configured together. `OUTREACH_FROM_NAME` is optional. Register `<NEXT_PUBLIC_APP_URL>/api/webhooks/resend` in Resend and enable at least `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, and `email.received`. Keep the signing secret server-only. Manual approved-email delivery remains available when provider delivery is disabled.

Legacy `LAUNCH_*_VERIFIED_AT` settings remain supported as fallback evidence markers. New production verification should be recorded through the authenticated Launch Checklist after the corresponding live check succeeds so the verifier, timestamp, note, and audit event are retained without requiring a redeploy.

## 3. Apply database migrations

Apply every Supabase migration in order through `045_outreach_delivery_events_and_replies.sql` before deploying the matching application build. Milestone 11 specifically requires every discovery migration through `041_prospect_discovery_budget_guard.sql` for the discovery queue, search-run provenance, saved profiles, profile analytics, structured review reasons, and transactional provider-usage guardrails. Do not enable web prospect discovery against a database missing any of those migrations. Milestone 12 uses `042_outreach_delivery_intents.sql` for immutable delivery snapshots, `043_outreach_delivery_attempts.sql` for atomic provider attempt claims/reconciliation, `044_stable_outreach_provider_idempotency.sql` so every retry of one immutable email uses the same provider idempotency key, and `045_outreach_delivery_events_and_replies.sql` for signed delivery-event evidence, outbound RFC Message-ID correlation, and human-reviewed inbound replies. Do not enable provider-backed outreach delivery or reply tracking against a database missing any Milestone 12 migration.

## 4. Configure Supabase authentication URLs

In Supabase Authentication URL settings:

- Set the Site URL to the final `NEXT_PUBLIC_APP_URL` value.
- Add `<NEXT_PUBLIC_APP_URL>/auth/confirm` to the allowed redirect URLs.
- Keep `http://localhost:3001/auth/confirm` only for local development.

## 5. Run verification

Use Node.js 22 or later. Run `npm run preflight:production`, `npm run security:scan`, `npm run security:audit`, `npm test`, `npx tsc --noEmit`, and `npm run build`. The preflight command reports only presence and safety status; it never prints credential values. When Resend delivery is enabled, preflight requires the API key, From address, and webhook signing secret together, validates the From-address shape, and checks the expected `whsec_` secret format without printing values.

## 6. Controlled release and evidence

Deploy to a private preview first. Sign in as an administrator, run **System Health** and **Launch Checklist**, and complete these live checks before recording their evidence:

- Invite a designated internal test account and complete `/auth/confirm` and account setup. Record the `invitation` verification with a concise note describing the account used and result.
- Exercise approval-required outreach, Shopify reconciliation (when configured), retailer checkout confirmation, and reorder-request decisions; confirm the expected audit events persist. Record the `approval_flow` verification with a concise result note.
- Export an authenticated production backup and run it through **Backup recovery drill**. A launch-eligible drill must pass structure validation, SHA-256 integrity verification, use backup format v2, have zero validation errors, and be no more than seven days old. Inspect the record counts and recovery-drill history, then record the `backup_restore` live verification.
- Run the production smoke check and confirm the latest clean result is no more than 24 hours old.

Recording live verification requires an administrator, explicit `RECORD_LIVE_VERIFICATION` confirmation, and an 8–1000 character note. Evidence and its audit event are committed together.

## 7. Final launch ceremony

1. Re-run **System Health** and **Launch Checklist** against the final production deployment. Resolve every required blocker; do not treat optional Shopify configuration as required when Shopify is intentionally not connected.
2. Confirm the latest recovery drill shown on the Launch Checklist is passed, integrity-verified, zero-error, format v2, and still within the seven-day freshness window.
3. Confirm the latest production smoke test is clean and within the 24-hour freshness window.
4. Confirm the invitation, approval-flow, and backup/recovery live verifications are recorded.
5. Confirm there are no failed Shopify sync runs and review any approved-but-unsent outreach drafts. No autonomous-send gate should be enabled.
6. Record the **Launch sign-off** with a concise note identifying the production deployment and review. The server independently rechecks all required launch conditions and refuses sign-off if any are blocked. Sign-off is evidence only; it does not authorize outreach, create Shopify orders, or bypass pilot-transition guards.
7. Select the retailer pilot only after sign-off, then transition pilot accounts through the existing guarded workflow. Invited/active transitions independently require the current smoke, recovery, and verification evidence.
8. If enabling Milestone 11 web discovery, run a small user-triggered search, verify the consulted source on every queued candidate, confirm no CRM contact is created before review, confirm the budget meter decrements, and confirm a reviewed acceptance stores research evidence without sending outreach.
9. For Milestone 12 delivery-ledger validation, approve a test email, prepare it through the existing outreach workflow, confirm it sent only after the manual send is actually completed, then verify exactly one `outreach_delivery_intents` row exists for the draft with the frozen recipient/subject/body hash and that a repeated confirmation does not create a second delivery.
10. Before enabling provider delivery, claim the prepared test intent twice and verify both calls return the same live attempt/idempotency key. Reconcile one failed attempt and verify the intent remains prepared/retryable; reconcile a later successful attempt and verify the intent/draft become delivered/sent exactly once with provider message evidence.
11. After configuring Resend, use **Outbound Delivery & Replies** with an internal/test recipient first. Prepare an already approved test email, verify the frozen recipient and subject, choose **Send approved email now**, and confirm exactly one provider message ID is stored. Retry the same action and confirm no second external email is created. Then temporarily suppress a test contact and verify provider sending is blocked even if the email was approved earlier.
12. Confirm the signed `email.sent` webhook stores the RFC Message-ID on the delivery intent, replay the same webhook and verify no duplicate delivery-event row is created, and confirm an invalid or stale signature is rejected.
13. Reply from the test recipient. Confirm `email.received` retrieves the full received email server-side, matches the reply only through `In-Reply-To` or `References`, and surfaces the text in the human reply queue. Mark it reviewed and confirm no outbound response is generated. Send an unrelated inbound message and confirm it remains explicitly unmatched.
14. Exercise a test permanent bounce or complaint where practical and verify the contact becomes email-suppressed before another provider send is allowed.

Retain the resulting launch sign-off, smoke history, recovery-drill history, live verifications, delivery intents, delivery attempts, delivery events, reply review records, provider/RFC message IDs, and audit events as the launch evidence package. These records are included in authenticated production backups. Do not enable autonomous sending or Shopify Admin API order creation as part of this milestone.
