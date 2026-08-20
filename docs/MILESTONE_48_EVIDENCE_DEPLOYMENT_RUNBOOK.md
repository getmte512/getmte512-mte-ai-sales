# Milestone 48 — Evidence deployment and incident runbook

Milestones 42 through 46 hardened operating-review evidence from deterministic integrity into authenticated, rotation-safe, compromise-aware v3 packages. Milestone 48 closes the production-operations gap by making those controls deployable and testable from one operator path.

## What changed

- `DEPLOYMENT.md` now treats the active evidence signing secret and retained signing secrets as server-only credentials.
- Production environment guidance names the active key ID, retained-key JSON, and compromised-key ID list and points to the dedicated signing operations runbook.
- Production preflight expectations explicitly include active signing configuration, retained-key validation, unique IDs, secret strength, and compromised-key denial.
- Controlled release requires a fresh v3 export to pass deterministic integrity and origin authentication before evidence archival, cross-check, or reconciliation is trusted.
- The final ceremony now covers first enablement, normal key rotation, retained-key historical verification, no historical re-signing, compromised-key denial, and fail-closed active-key compromise handling.
- `docs/EVIDENCE_SIGNING_OPERATIONS.md` is the durable runbook for initial enablement, rotation, compromise response, retained-key retirement, and evidence retention.

## Safety boundary

This milestone changes deployment and incident-response guidance only. It adds no database migration and grants no CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, Shopify, or other business-state mutation authority. Credential values remain prohibited from source control, logs, chat, screenshots, browser-visible configuration, and evidence packages.

## Completion gate

Production operators have one documented evidence-signing procedure; the deployment checklist names every signing/rotation/compromise configuration surface; a live release ceremony proves active-key v3 authentication; a rotation ceremony proves both new-key exports and retained-key historical verification; a compromise drill proves a cryptographically valid package from a compromised key is not origin-authenticated; active compromised configuration fails closed; historical packages remain immutable; and the full security/test/type/build gate remains green.
