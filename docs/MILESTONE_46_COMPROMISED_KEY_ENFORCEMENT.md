# Milestone 46 — Compromised signing-key enforcement

Milestone 45 made pre-rotation v3 evidence verifiable with retained signing keys. Milestone 46 adds the incident-response trust boundary: retaining an old secret must never cause evidence from a key known to be compromised to authenticate as trusted MTE-origin evidence.

## Enforcement contract

Operators may list compromised historical signing key IDs in the non-secret, server-side `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS` setting.

- The active signing key ID may never be marked compromised. If it is, active signing configuration fails closed so new exports cannot be produced under a key the operator has declared untrusted.
- Compromised IDs must be valid, unique signing key IDs.
- A retained secret may remain available for forensic or integrity workflows, but a v3 package whose manifest identifies a compromised key returns `authenticated: false` even when its HMAC is otherwise correct.
- Verification, current-state cross-check, and reconciliation export all apply the same compromised-key policy before trusting package origin.
- Removing a compromised ID is an explicit operational trust decision; the application never clears or changes incident status automatically.

Package bytes and deterministic evidence hashes are never rewritten when a key is marked compromised. Legacy v1/v2 integrity-only verification behavior is unchanged.

## Safety boundary

This milestone changes authentication trust evaluation only. It adds no database migration and grants no CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, Shopify, or other business-state mutation authority.

## Completion gate

- New exports fail closed if the configured active key ID is listed as compromised.
- Correctly signed historical v3 evidence from a compromised retained key is not origin-authenticated.
- Unknown, malformed, and duplicate compromised key IDs fail configuration validation.
- Verification, cross-check, and reconciliation enforce the same compromised-key list.
- Production preflight validates compromised-key configuration without printing secrets.
- Evidence bytes and deterministic hashes remain immutable.
- Security scan, dependency audit, production preflight, tests, TypeScript, and production build remain green.
