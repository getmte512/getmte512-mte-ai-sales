# MTE CRM deployment checklist

No production deployment should proceed until the in-app **Launch Checklist** has no required blockers. The checklist fails closed: configuring an application URL or having code paths present is not treated as proof that a real workflow succeeded.

## 1. Choose the application address

Create the private Next.js project with the chosen host, then set `NEXT_PUBLIC_APP_URL` to its final HTTPS origin, for example `https://crm.example.com`. Do not include a path or trailing callback parameters.

## 2. Configure environment settings

Use `.env.example` as the field list. Enter real values only in the hosting provider's encrypted environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `OPENAI_API_KEY`, `RESEND_API_KEY`, and `RESEND_WEBHOOK_SECRET` server-only. Never paste them into issues, commits, build logs, or chat.

Web prospect discovery and conversation intelligence remain disabled unless `OPENAI_API_KEY` is configured. Their model and usage controls are server-side settings. Keep default limits until real usage is reviewed; raising them is an explicit operational decision, not a requirement for launch.

Provider-backed outbound email and reply tracking remain disabled unless `RESEND_API_KEY`, a verified `OUTREACH_FROM_EMAIL`, and `RESEND_WEBHOOK_SECRET` are configured together. `OUTREACH_FROM_NAME` is optional. Register `<NEXT_PUBLIC_APP_URL>/api/webhooks/resend` in Resend and enable at least `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, and `email.received`. Keep the signing secret server-only. Manual approved-email delivery remains available when provider delivery is disabled.

Legacy `LAUNCH_*_VERIFIED_AT` settings remain supported as fallback evidence markers. New production verification should be recorded through the authenticated Launch Checklist after the corresponding live check succeeds so the verifier, timestamp, note, and audit event are retained without requiring a redeploy.

## 3. Apply database migrations

Apply every Supabase migration in order through `050_conversation_response_draft_handoff.sql` before deploying the matching application build.

Milestone 11 requires discovery migrations through `041_prospect_discovery_budget_guard.sql`. Milestone 12 requires `042_outreach_delivery_intents.sql` through `045_outreach_delivery_events_and_replies.sql` for immutable delivery, provider-attempt safety, stable idempotency, signed event evidence, and inbound reply capture.

Milestone 13 requires all migrations `046` through `050`: `046_conversation_recommendations.sql` stores AI recommendations separately from CRM state; `047_apply_conversation_recommendation.sql` provides the explicit audited pipeline action; `048_conversation_recommendation_tasks.sql` provides idempotent human-created follow-up tasks; `049_manual_reply_matching.sql` records explicit human resolution of otherwise unmatched inbound email; and `050_conversation_response_draft_handoff.sql` copies an accepted suggested response into the normal outreach workflow as `draft` only. Do not enable conversation intelligence against a database missing any of these migrations.

## 4. Configure Supabase authentication URLs

In Supabase Authentication URL settings:

- Set the Site URL to the final `NEXT_PUBLIC_APP_URL` value.
- Add `<NEXT_PUBLIC_APP_URL>/auth/confirm` to the allowed redirect URLs.
- Keep `http://localhost:3001/auth/confirm` only for local development.

## 5. Run verification

Use Node.js 22 or later. Run `npm run preflight:production`, `npm run security:scan`, `npm run security:audit`, `npm test`, `npx tsc --noEmit`, and `npm run build`. The preflight command reports only presence and safety status; it never prints credential values. When Resend delivery is enabled, preflight requires the API key, From address, and webhook signing secret together, validates the From-address shape, and checks the expected `whsec_` secret format without printing values.

## 6. Controlled release and evidence

Deploy to a private preview first. Sign in as an administrator, run **System Health** and **Launch Checklist**, and complete these live checks before recording their evidence:

- Invite a designated internal test account and complete `/auth/confirm` and account setup.
- Exercise approval-required outreach, Shopify reconciliation (when configured), retailer checkout confirmation, and reorder-request decisions; confirm the expected audit events persist.
- Export an authenticated production backup and run it through **Backup recovery drill**. A launch-eligible drill must pass structure validation, SHA-256 integrity verification, use backup format v2, have zero validation errors, and be no more than seven days old.
- Run the production smoke check and confirm the latest clean result is no more than 24 hours old. The smoke test must report **Milestone 13 schema** as passing before conversation intelligence is used.

## 7. Final launch ceremony

1. Re-run **System Health** and **Launch Checklist** against the final production deployment. Resolve every required blocker.
2. Confirm the latest recovery drill is passed, integrity-verified, zero-error, format v2, and within the seven-day freshness window.
3. Confirm the latest production smoke test is clean and within the 24-hour freshness window.
4. Confirm the invitation, approval-flow, and backup/recovery live verifications are recorded.
5. Confirm there are no failed Shopify sync runs and review any approved-but-unsent outreach drafts. No autonomous-send gate should be enabled.
6. Record the **Launch sign-off** only after the server independently rechecks all required launch conditions.
7. If enabling Milestone 11 web discovery, run a small user-triggered search and verify source evidence, review gating, and budget enforcement.
8. For Milestone 12, validate immutable delivery intent creation, stable provider idempotency, signed webhook evidence, RFC reply matching, bounce/complaint suppression, and exactly-once delivery behavior with an internal recipient.
9. For Milestone 13, use an internal/test buyer conversation. Confirm a proven RFC match can be analyzed and an unrelated inbound email cannot. Manually match the unrelated test email to a specific delivered intent and verify reviewer/note/timestamp evidence is retained before analysis becomes available.
10. Review a generated recommendation. Confirm accepting or dismissing it changes no pipeline state and sends no response. Then separately create a follow-up task and, when a suggested stage exists, separately apply the pipeline move; repeat each action and confirm no duplicate task or duplicate state mutation occurs.
11. For a recommendation containing a response suggestion, create the response outreach draft. Verify it enters `outreach_drafts` with `purpose='conversation_reply'`, a recommendation-specific `thread_key`, and `status='draft'`. Confirm it is not approved or sent by the handoff and must pass through the normal administrator approval/delivery workflow.
12. Re-run the production smoke test after migration `050` and confirm the Milestone 13 schema check passes. Retain recommendation reviews, manual-match evidence, created task IDs, pipeline-apply timestamps, response-draft IDs, and audit events with the launch evidence package.

Do not enable autonomous sending, autonomous pipeline mutation, or Shopify Admin API order creation as part of this milestone.
