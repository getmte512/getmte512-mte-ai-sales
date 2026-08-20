# Milestone 45 — Retained-key evidence verification

Milestones 42 through 44 established authenticated v3 operating-review evidence, a deliberate signing-key rotation contract, and a non-secret signing-key registry. Milestone 45 closes the rotation gap in the application: evidence created before rotation remains cryptographically verifiable after the active signing key changes, provided the package's exact retired key is still retained and approved.

## Trust model

New evidence exports continue to use exactly one active `REVIEW_EVIDENCE_SIGNING_SECRET` and `REVIEW_EVIDENCE_SIGNING_KEY_ID`. Retained keys are verification-only and are loaded from the server-only `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` setting.

For v3 verification, the server reads `manifest.signingKeyId` and selects the one configured key with that exact ID. It does not silently fall back to the active key, try unrelated keys, rewrite the package, or re-sign historical evidence. Unknown key IDs, malformed signatures, malformed retained-key configuration, duplicate active/retained key IDs, and weak retained secrets all fail closed.

Legacy v1 and v2 packages retain their existing integrity-only behavior because those formats do not contain origin signatures.

## Rotation behavior

1. Preserve the outgoing key ID and secret in the approved server-side secrets store before rotating the active key.
2. Configure the outgoing pair in `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` and deploy the new active key ID/secret pair together.
3. New exports are signed only by the new active key.
4. Pre-rotation v3 evidence is verified by selecting its exact retained key ID from the package manifest.
5. Removing a retained key intentionally makes packages signed by that key no longer origin-authenticatable by the application; package bytes and deterministic integrity hashes remain unchanged.

The retained-key environment value is secret material. It must never be committed, logged, returned to browsers, embedded in evidence packages, or stored in the non-secret key registry.

## Safety boundary

This milestone adds no database migration and grants no CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, Shopify, or other business-state mutation authority. It changes only evidence verification configuration and trust evaluation.

## Completion gate

- New v3 exports continue signing with only the active key.
- A valid package signed immediately before rotation authenticates when its exact retained key is configured.
- The same package fails origin authentication when its retained key is unavailable.
- Unknown key IDs and incorrect secrets fail closed.
- Duplicate active/retained IDs and malformed retained-key JSON are rejected.
- Production preflight validates retained-key configuration without printing credentials.
- Verification, cross-check, and reconciliation routes all use the same retained-key selection path.
- The security, test, type-check, and production-build gates remain green.
