# Operating-review evidence signing operations

This runbook governs the production authentication material used by MTE operating-review evidence packages. It complements the general deployment checklist and the immutable evidence workflow. It does not authorize CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, Shopify, or other business-state mutation.

## Configuration model

New v3 evidence exports use exactly one active server-only signing pair:

- `REVIEW_EVIDENCE_SIGNING_SECRET` — secret HMAC material, at least 32 characters and preferably generated from strong random bytes.
- `REVIEW_EVIDENCE_SIGNING_KEY_ID` — non-secret stable identifier matching `^[A-Za-z0-9._-]{1,64}$`.

Historical v3 verification may additionally use:

- `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` — server-only JSON object mapping retired key IDs to retained secrets. Retained keys are verification-only; exports never select them for new signatures.
- `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS` — comma-separated non-secret IDs whose packages must not be trusted as authenticated MTE-origin evidence even if the corresponding secret remains available for forensic verification.

Never place signing secrets or retained-key JSON in `NEXT_PUBLIC_*`, source control, browser state, evidence packages, tickets, chat, screenshots, logs, or the non-secret key registry.

## Initial production enablement

1. Generate a production signing secret and a unique key ID in the approved secret-management system.
2. Configure the active secret and ID together in the hosting provider's encrypted server environment.
3. Leave retained keys empty on first enablement unless approved historical v3 keys already exist.
4. Run `npm run preflight:production`. Deployment must stop on any evidence-signing, retained-key, or compromised-key validation failure.
5. Deploy privately, authenticate as a sales/admin user, and export a fresh operating-review evidence package.
6. Verify the package in the evidence verification workspace. It must report format v3, a valid deterministic evidence hash, and `authenticated: true` for the configured active key ID.
7. Cross-check the same package against current state and export a reconciliation report. Both paths must accept the package only after origin authentication succeeds.
8. Retain the evidence package, its non-secret key ID, deployment/change reference, and verification evidence according to the approved evidence-retention policy. Do not retain or copy the secret into the package.

## Standard key rotation

1. Create a new random signing secret and a new never-before-used key ID.
2. Before changing the active pair, preserve the outgoing key ID and secret in the approved server-side secrets archive for the evidence-retention period.
3. Add the outgoing pair to `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` without removing other still-required historical keys.
4. Replace `REVIEW_EVIDENCE_SIGNING_SECRET` and `REVIEW_EVIDENCE_SIGNING_KEY_ID` together with the new pair.
5. Confirm the outgoing ID is not present in `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS` unless an incident requires it to be distrusted.
6. Run production preflight before deployment. Duplicate IDs, weak retained secrets, malformed JSON, or a compromised active ID must fail closed.
7. Deploy and export a new package. Its manifest must use the new active key ID and verify as authenticated.
8. Verify a package created immediately before rotation. It must authenticate using the exact retained prior key ID.
9. Confirm a pre-rotation package fails origin authentication if its retained key is intentionally removed from a non-production verification configuration. Restore approved production configuration after the test.
10. Never rewrite, re-sign, or regenerate historical packages merely because the active key changed.

## Compromise response

When a signing key is suspected or confirmed compromised:

1. Record the incident and identify the affected key ID and evidence era.
2. If the compromised key is active, generate and deploy a new active secret/key ID pair immediately through the normal rotation procedure. The application and production preflight intentionally reject a configuration where the active key ID is marked compromised.
3. Add the affected retired key ID to `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS`.
4. Retain the old secret only if approved incident-response or forensic policy requires it; retention does not restore trust.
5. Verify a known package from the affected key. Its deterministic evidence hash may still be valid, but the application must return `authenticated: false` with the compromised-key trust reason.
6. Confirm cross-check and reconciliation export refuse to treat the compromised package as trusted origin evidence.
7. Independently reconcile affected evidence against database/audit sources before using it for decisions that require trusted origin.
8. Do not remove the compromised designation simply because the signature is cryptographically valid. Clearing that designation is an explicit incident-management decision outside the verifier.

## Retained-key retirement

A retained key may be removed only after its approved evidence-retention and incident requirements are satisfied. Before removal:

1. Identify packages whose manifests reference the key ID.
2. Confirm policy allows those packages to lose application-level origin authentication after the secret is removed.
3. Preserve the packages themselves unchanged; removal of key material does not permit rewriting their bytes or hashes.
4. Remove only the retired key entry from `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON`; never reuse its key ID with different secret material.
5. Run production preflight and verify a current active-key package after deployment.

## Production verification gate

Every evidence-signing configuration change must pass all of the following before release:

- `npm run security:scan`
- `npm run security:audit`
- `npm run preflight:production`
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

Operational validation must additionally prove the relevant live path: active-key export, retained-key historical verification after rotation, or compromised-key denial after an incident. Credential values must never be printed as proof.

## Evidence to retain

Retain only non-secret operational evidence outside the approved secret store: key ID, lifecycle state, activation/retirement timestamps, deployment/change reference, incident reference when applicable, package evidence hash, verification outcome, and operator/reviewer evidence. The signing secret and retained-key JSON remain solely in the approved secret-management system.
