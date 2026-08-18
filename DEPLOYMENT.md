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

Apply every Supabase migration in order through `052_sales_operating_review_snapshots.sql` before deploying the matching application build.

Milestone 11 requires discovery migrations through `041_prospect_discovery_budget_guard.sql` for the discovery queue, search-run provenance, saved profiles, profile analytics, structured review reasons, and transactional provider-usage guardrails. Do not enable web prospect discovery against a database missing any of those migrations.

Milestone 12 requires `042_outreach_delivery_intents.sql` through `045_outreach_delivery_events_and_replies.sql` for immutable delivery, provider-attempt safety, stable idempotency, signed event evidence, and inbound reply capture.

Milestone 13 requires all migrations `046` through `050`: `046_conversation_recommendations.sql` stores AI recommendations separately from CRM state; `047_apply_conversation_recommendation.sql` provides the explicit audited pipeline action; `048_conversation_recommendation_tasks.sql` provides idempotent human-created follow-up tasks; `049_manual_reply_matching.sql` records explicit human resolution of otherwise unmatched inbound email; and `050_conversation_response_draft_handoff.sql` copies an accepted suggested response into the normal outreach workflow as `draft` only. Do not enable conversation intelligence against a database missing any of these migrations.

Milestone 16 requires `051_sales_command_decisions.sql` for audited command-center card outcomes. The migration stores complete, dismiss, and defer decisions separately from source CRM state and exposes only the service-role decision RPC. Do not enable command-center outcome controls against a database missing migration `051`.

Milestone 18 requires `052_sales_operating_review_snapshots.sql`. It stores immutable weekly/monthly operating-review evidence separately from live CRM state. Snapshot creation is service-role only, requires sales/admin authorization, records an audit event, is idempotent when the same period/date hash is repeated, and refuses to replace an existing historical period with different evidence.

## 4. Configure Supabase authentication URLs

In Supabase Authentication URL settings:

- Set the Site URL to the final `NEXT_PUBLIC_APP_URL` value.
- Add `<NEXT_PUBLIC_APP_URL>/auth/confirm` to the allowed redirect URLs.
- Keep `http://localhost:3001/auth/confirm` only for local development.

## 5. Run verification

Use Node.js 22 or later. Run `npm run preflight:production`, `npm run security:scan`, `npm run security:audit`, `npm test`, `npx tsc --noEmit`, and `npm run build`. The preflight command reports only presence and safety status; it never prints credential values. The production dependency audit fails on high- or critical-severity production advisories. When Resend delivery is enabled, preflight requires the API key, From address, and webhook signing secret together, validates the From-address shape, and checks the expected `whsec_` secret format without printing values.

## 6. Controlled release and evidence

Deploy to a private preview first. Sign in as an administrator, run **System Health** and **Launch Checklist**, and complete these live checks before recording their evidence:

- Invite a designated internal test account and complete `/auth/confirm` and account setup.
- Exercise approval-required outreach, Shopify reconciliation (when configured), retailer checkout confirmation, and reorder-request decisions; confirm the expected audit events persist.
- Export an authenticated production backup and run it through **Backup recovery drill**. A launch-eligible drill must pass structure validation, SHA-256 integrity verification, use backup format v2, have zero validation errors, and be no more than seven days old.
- Run the production smoke check and confirm the latest clean result is no more than 24 hours old. The smoke test must report **Milestone 13 schema** as passing before conversation intelligence is used, **Milestone 16 schema** as passing before command-center outcomes are used, and **Milestone 18 schema** as passing before immutable operating-review snapshots are recorded.

## 7. Final launch ceremony

1. Re-run **System Health** and **Launch Checklist** against the final production deployment. Resolve every required blocker.
2. Confirm the latest recovery drill is passed, integrity-verified, zero-error, format v2, and within the seven-day freshness window.
3. Confirm the latest production smoke test is clean and within the 24-hour freshness window.
4. Confirm the invitation, approval-flow, and backup/recovery live verifications are recorded.
5. Confirm there are no failed Shopify sync runs and review any approved-but-unsent outreach drafts. No autonomous-send gate should be enabled.
6. Record the **Launch sign-off** only after the server independently rechecks all required launch conditions.
7. If enabling Milestone 11 web discovery, run a small user-triggered search, verify the consulted source on every queued candidate, confirm no CRM contact is created before review, confirm the budget meter decrements, and confirm a reviewed acceptance stores research evidence without sending outreach.
8. For Milestone 12, validate immutable delivery intent creation, stable provider idempotency, signed webhook evidence, RFC reply matching, bounce/complaint suppression, and exactly-once delivery behavior with an internal recipient.
9. For Milestone 13, use an internal/test buyer conversation. Confirm a proven RFC match can be analyzed and an unrelated inbound email cannot. Manually match the unrelated test email to a specific delivered intent and verify reviewer/note/timestamp evidence is retained before analysis becomes available.
10. Review a generated recommendation. Confirm accepting or dismissing it changes no pipeline state and sends no response. Then separately create a follow-up task and, when a suggested stage exists, separately apply the pipeline move; repeat each action and confirm no duplicate task or duplicate state mutation occurs.
11. For a recommendation containing a response suggestion, create the response outreach draft. Verify it enters `outreach_drafts` with `purpose='conversation_reply'`, a recommendation-specific `thread_key`, and `status='draft'`. Confirm it is not approved or sent by the handoff and must pass through the normal administrator approval/delivery workflow.
12. Review **Conversation recommendation quality** after enough explicit decisions exist. Treat the acceptance-rate and confidence-calibration output as advisory evidence only; changing a prompt or model remains a separate human development decision.
13. Re-run the production smoke test after migration `050` and confirm the Milestone 13 schema check passes. Retain recommendation reviews, manual-match evidence, created task IDs, pipeline-apply timestamps, response-draft IDs, and audit events with the launch evidence package.
14. For Milestone 16, open the Daily Sales Command Center with test data and exercise complete, dismiss, and defer on recommendation cards. Confirm dismiss/defer require notes, defer requires a future date, an active deferral hides the card until its date expires, and a materially changed recommendation can reappear with a new fingerprint. Confirm each decision creates `sales_command_decision_recorded` audit evidence while the underlying reply review status, sales task completion state, pipeline stage, prospect review state, outreach approval/delivery state, and Shopify order state remain unchanged.
15. Re-run the production smoke test after migration `051` and confirm **Milestone 16 schema** passes before enabling command-center outcome controls for production users.
16. For Milestone 18, open Sales Operating Review and record the current weekly and monthly snapshots. Confirm the server recomputes each review, each stored row has a 64-character SHA-256 payload hash, and `sales_operating_review_snapshot_recorded` audit evidence identifies the actor, period, date, and hash. Repeat the same snapshot and confirm it is idempotent. Do not attempt to alter source business records as part of snapshot recording.
17. Re-run the production smoke test after migration `052` and confirm **Milestone 18 schema** passes before relying on retained operating-review history.

Do not enable autonomous sending, autonomous pipeline mutation, autonomous task completion, automatic reply review, or Shopify Admin API order creation as part of this milestone.
