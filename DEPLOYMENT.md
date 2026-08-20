# MTE CRM deployment checklist

No production deployment should proceed until the in-app **Launch Checklist** has no required blockers. The checklist fails closed: configuring an application URL or having code paths present is not treated as proof that a real workflow succeeded.

## 1. Choose the application address

Create the private Next.js project with the chosen host, then set `NEXT_PUBLIC_APP_URL` to its final HTTPS origin, for example `https://crm.example.com`. Do not include a path or trailing callback parameters.

## 2. Configure environment settings

Use `.env.example` as the field list. Enter real values only in the hosting provider's encrypted environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `REVIEW_EVIDENCE_SIGNING_SECRET`, and `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` server-only. Never paste them into issues, commits, build logs, chat, screenshots, evidence packages, or browser-visible configuration.

Web prospect discovery and conversation intelligence remain disabled unless `OPENAI_API_KEY` is configured. Their model and usage controls are server-side settings. Keep default limits until real usage is reviewed; raising them is an explicit operational decision, not a requirement for launch.

Provider-backed outbound email and reply tracking remain disabled unless `RESEND_API_KEY`, a verified `OUTREACH_FROM_EMAIL`, and `RESEND_WEBHOOK_SECRET` are configured together. `OUTREACH_FROM_NAME` is optional. Register `<NEXT_PUBLIC_APP_URL>/api/webhooks/resend` in Resend and enable at least `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, and `email.received`. Keep the signing secret server-only. Manual approved-email delivery remains available when provider delivery is disabled.

Authenticated operating-review evidence requires one active server-only `REVIEW_EVIDENCE_SIGNING_SECRET` plus its non-secret `REVIEW_EVIDENCE_SIGNING_KEY_ID`. Historical v3 verification may use server-only `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON`; known-compromised historical key IDs belong in the non-secret `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS` list. New exports always use only the active key. Retained keys are verification-only, compromised keys never authenticate evidence, key IDs must never be reused for different secret material, and historical packages must never be silently re-signed. Follow `docs/EVIDENCE_SIGNING_OPERATIONS.md` for initial enablement, rotation, compromise response, retained-key retirement, and live verification.

Legacy `LAUNCH_*_VERIFIED_AT` settings remain supported as fallback evidence markers. New production verification should be recorded through the authenticated Launch Checklist after the corresponding live check succeeds so the verifier, timestamp, note, and audit event are retained without requiring a redeploy.

## 3. Apply database migrations

Apply every Supabase migration in order through `055_operating_review_annotations.sql` before deploying the current application build. The Milestone 18 baseline remains `052_sales_operating_review_snapshots.sql`; the current operating-review feature set additionally requires migrations `053` through `055`.

Milestone 11 requires discovery migrations through `041_prospect_discovery_budget_guard.sql` for the discovery queue, search-run provenance, saved profiles, profile analytics, structured review reasons, and transactional provider-usage guardrails. Do not enable web prospect discovery against a database missing any of those migrations.

Milestone 12 requires `042_outreach_delivery_intents.sql` through `045_outreach_delivery_events_and_replies.sql` for immutable delivery, provider-attempt safety, stable idempotency, signed event evidence, and inbound reply capture.

Milestone 13 requires all migrations `046` through `050`: `046_conversation_recommendations.sql` stores AI recommendations separately from CRM state; `047_apply_conversation_recommendation.sql` provides the explicit audited pipeline action; `048_conversation_recommendation_tasks.sql` provides idempotent human-created follow-up tasks; `049_manual_reply_matching.sql` records explicit human resolution of otherwise unmatched inbound email; and `050_conversation_response_draft_handoff.sql` copies an accepted suggested response into the normal outreach workflow as `draft` only. Do not enable conversation intelligence against a database missing any of these migrations.

Milestone 16 requires `051_sales_command_decisions.sql` for audited command-center card outcomes. The migration stores complete, dismiss, and defer decisions separately from source CRM state and exposes only the service-role decision RPC. Do not enable command-center outcome controls against a database missing migration `051`.

Milestone 18 requires `052_sales_operating_review_snapshots.sql`. It stores immutable weekly/monthly operating-review evidence separately from live CRM state. Snapshot creation is service-role only, requires sales/admin authorization, records an audit event, is idempotent when the same period/date hash is repeated, and refuses to replace an existing historical period with different evidence.

Milestone 20 requires `053_sales_operating_targets.sql` for versioned weekly/monthly operating targets. Target changes are administrator-only, append historical versions instead of overwriting them, and create audit evidence.

Milestone 21 requires `054_operating_review_target_context.sql`. New review snapshots preserve the exact target set and deterministic scorecard in force when the snapshot is recorded; the legacy service-role snapshot signature is revoked so target context cannot be bypassed.

Milestone 25 requires `055_operating_review_annotations.sql` for append-only observations, decisions, and risks attached to immutable review snapshots. Annotation writes are sales/admin authorized, service-role mediated, audited, and cannot rewrite snapshot or target evidence.

Milestones 19, 22 through 24, and 26 through 48 are read-only, configuration/trust hardening, documentation alignment, or reuse the migrations above; they do not add additional database migrations.

## 4. Configure Supabase authentication URLs

In Supabase Authentication URL settings:

- Set the Site URL to the final `NEXT_PUBLIC_APP_URL` value.
- Add `<NEXT_PUBLIC_APP_URL>/auth/confirm` to the allowed redirect URLs.
- Keep `http://localhost:3001/auth/confirm` only for local development.

## 5. Run verification

Use Node.js 22 or later. Run `npm run preflight:production`, `npm run security:scan`, `npm run security:audit`, `npm test`, `npx tsc --noEmit`, and `npm run build`. The preflight command reports only presence and safety status; it never prints credential values. The production dependency audit fails on high- or critical-severity production advisories. When Resend delivery is enabled, preflight requires the API key, From address, and webhook signing secret together, validates the From-address shape, and checks the expected `whsec_` secret format without printing values. Evidence-signing preflight additionally validates the active signing pair, retained-key JSON, unique key IDs, minimum secret strength, and the compromised-key policy; a compromised active key ID, malformed retained-key JSON, duplicate IDs, or weak retained secret must block deployment.

## 6. Controlled release and evidence

Deploy to a private preview first. Sign in as an administrator, run **System Health** and **Launch Checklist**, and complete these live checks before recording their evidence:

- Invite a designated internal test account and complete `/auth/confirm` and account setup.
- Exercise approval-required outreach, Shopify reconciliation (when configured), retailer checkout confirmation, and reorder-request decisions; confirm the expected audit events persist.
- Export an authenticated production backup and run it through **Backup recovery drill**. A launch-eligible drill must pass structure validation, SHA-256 integrity verification, use backup format v2, have zero validation errors, and be no more than seven days old.
- Run the production smoke check and confirm the latest clean result is no more than 24 hours old. The smoke test must report **Milestone 13 schema** as passing before conversation intelligence is used, **Milestone 16 schema** before command-center outcomes, **Milestone 18 schema** before immutable reviews, **Milestone 20 schema** before operating targets, **Milestone 21 schema** before target-aware snapshots, and **Milestone 25 schema** before review annotations.
- If authenticated operating-review evidence is enabled, export a fresh v3 package and verify both deterministic integrity and MTE origin authentication using the active key ID before relying on evidence archival, cross-check, or reconciliation workflows.

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
18. Apply migration `053`, set one internal/test weekly and monthly operating target, confirm a new target version and `sales_operating_target_set` audit event are recorded, and confirm prior target history remains visible rather than overwritten.
19. Apply migration `054`, record a fresh internal/test operating-review snapshot, and verify both the business-evidence hash and target-context hash are present and immutable. Confirm the legacy target-less service-role snapshot function cannot be executed.
20. Apply migration `055`, add an Observation, Decision, and Risk to an internal/test immutable snapshot, and verify each creates `sales_operating_review_annotation_added` audit evidence without changing the snapshot payload or target hash.
21. Open Review Context and verify weekly/monthly context separation, cadence freshness, context coverage, snapshot-specific drilldown, and decision/risk carry-forward are all read-only views over the stored evidence.
22. Use **Export Evidence** and retain the downloaded JSON with the launch evidence package. Confirm new exports use format v3, manifest counts match the exported arrays, the 64-character evidence hash remains the same if the exact evidence is exported again later, the manifest carries the expected active signing key ID, and verification reports `authenticated: true`.
23. Re-run the production smoke test after migration `055` and confirm **Milestone 20 schema**, **Milestone 21 schema**, and **Milestone 25 schema** all pass.
24. Before the first production signing-key rotation, retain the outgoing key ID/secret only in the approved secret-management system, configure it in `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON`, deploy a new never-reused active key ID/secret pair, and verify both a post-rotation package with the new key and a pre-rotation package with the retained prior key.
25. Confirm the application never rewrites or re-signs historical packages during rotation and that new exports never use a retained key.
26. In an approved incident-response validation, mark a retired test key ID compromised and verify a correctly signed package from that key keeps its deterministic integrity result but returns `authenticated: false`; cross-check and reconciliation must refuse to trust its origin.
27. Confirm production preflight and export configuration fail closed if the active signing key ID is listed as compromised. Follow `docs/EVIDENCE_SIGNING_OPERATIONS.md` for the complete rotation, compromise, and retained-key retirement procedure.

Do not enable autonomous sending, autonomous pipeline mutation, autonomous task completion, automatic reply review, or Shopify Admin API order creation as part of this milestone.
