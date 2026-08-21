# MTE AI Sales Platform — Production Readiness Closure

This document is the final engineering closure matrix. It separates repository-complete work from live production evidence that can only be collected against the deployed MTE environment.

## Repository-complete gates

The current application must pass the repository verification gate before release:

- `npm run preflight:production`
- `npm run config:production`
- `npm run security:scan`
- `npm run security:audit`
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

The current schema baseline is migrations `001` through `055`. No post-055 migration is required by Milestones 26–51.

## Read-only live closure runner

After an administrator signs into the deployed application, the live closure status can be aggregated without recording or mutating evidence:

```bash
MTE_PRODUCTION_URL=https://your-production-host.example \
MTE_PRODUCTION_COOKIE='your authenticated admin Cookie header value' \
npm run closure:production
```

`NEXT_PUBLIC_APP_URL` may be used instead of `MTE_PRODUCTION_URL`. The runner performs authenticated `GET` requests only to `/api/health`, `/api/smoke-test`, and `/api/launch-readiness`; it never calls a `POST` endpoint, never records a smoke run or launch verification, never persists the cookie, and never prints the cookie. A nonzero exit status means a required production gate is blocked or one of the live checks could not be read.

The same read-only check can be run from GitHub Actions with the manually dispatched `Production Closure` workflow. Configure repository secrets `PRODUCTION_APP_URL` and `PRODUCTION_ADMIN_COOKIE`, then dispatch `.github/workflows/production-closure.yml`. The workflow validates a non-local HTTPS target and passes those values only as runtime environment variables; it does not print them or create launch evidence.

The runner does not replace any ceremony below. Missing invitation, approval-flow, backup/recovery, signing-key, provider, or launch-signoff evidence must still be completed through the real production workflows.

## Live production gates

Production launch is complete only after the deployed environment supplies fresh evidence for every required item below. Repository tests cannot substitute for these checks.

| Gate | Required production evidence | Freshness / acceptance |
| --- | --- | --- |
| Authentication | designated internal account completes invite, `/auth/confirm`, and setup | successful live flow |
| Authorization | approved users can access intended workspaces; unauthorized roles are denied | successful live role checks |
| Database | migrations through `055_operating_review_annotations.sql` applied | schema checks pass |
| Backup recovery | authenticated production backup passes recovery drill | format v2, SHA-256 verified, zero errors, <= 7 days old |
| Production smoke | deployed smoke suite passes | clean result <= 24 hours old |
| Outreach safety | approval-required internal delivery succeeds; no autonomous send path enabled | audit/provider evidence retained |
| Shopify safety | configured reconciliation/checkout/reorder workflows complete without unauthorized order creation | audit evidence retained |
| Conversation intelligence | RFC match, manual-match evidence, recommendation review, task/pipeline actions, and response-draft handoff validated | Milestone 13 schema passes |
| Command center | complete/dismiss/defer behavior and audit evidence validated without source-state mutation | Milestone 16 schema passes |
| Operating review | weekly/monthly snapshots, targets, target context, annotations, context drilldown, and evidence export validated | Milestones 18/20/21/25 schema passes |
| Evidence authentication | fresh v3 package verifies deterministic integrity and MTE origin | `authenticated: true` with active key ID |
| Key rotation | new active package and pre-rotation retained-key package both verify | unique non-reused key IDs |
| Compromise response | retired test key marked compromised is denied origin authentication | integrity preserved; `authenticated: false` |
| Key health | admin key-health view reports expected lifecycle state without secret material | healthy lifecycle/config state |
| Launch checklist | all required in-app blockers cleared and launch sign-off recorded | server recheck succeeds |

## Stop-ship conditions

Do not declare production complete when any required gate is missing, stale, failing, or represented only by documentation/configuration rather than live evidence. In particular, a successful repository build is not proof of production authentication, provider delivery, database migration state, backup recovery, smoke health, or signing-key operations.

Do not enable autonomous sending, autonomous pipeline mutation, autonomous task completion, automatic reply review, or Shopify Admin API order creation as part of launch closure.

## Closure rule

Engineering implementation is complete when the repository gate is green and this matrix is present and aligned with `DEPLOYMENT.md`. Production launch is complete only when the in-app Launch Checklist and the live evidence above are green in the deployed environment. Any remaining failed live gate is an operational launch blocker, not a reason to invent another implementation milestone.
