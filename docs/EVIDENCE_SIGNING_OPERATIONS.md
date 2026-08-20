# Operating-review evidence signing operations

This runbook governs the production authentication material used by MTE operating-review evidence packages. It complements the general deployment checklist and the immutable evidence workflow. It does not authorize CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, Shopify, or other business-state mutation.

## Configuration model

New v3 evidence exports use exactly one active server-only signing pair:

- `REVIEW_EVIDENCE_SIGNING_SECRET` — secret HMAC material, at least 32 characters and preferably generated from strong random bytes.
- `REVIEW_EVIDENCE_SIGNING_KEY_ID` — non-secret stable identifier matching `^[A-Za-z0-9._-]{1,64}$`.

Historical v3 verification may additionally use:

- `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` — server-only JSON object mapping retired key IDs to retained secrets. Retained keys are verification-only; exports never select them for new signatures.
- `REVIEW_EVIDENCE_KEY_LIFECYCLE_JSON` — non-secret server-side registry keyed by signing key ID. When configured it is authoritative for lifecycle status and must contain exactly one `active` key plus any `retired` or `compromised` historical keys. Every entry records `activatedAt` and `changeRef`; retired/compromised entries also record `retiredAt`; compromised entries additionally require `incidentRef`.
- `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS` — legacy/transition compatibility list. When lifecycle JSON is configured, leave this empty or keep it exactly equal to the registry's compromised IDs.

The lifecycle registry must never contain `secret` or `signingSecret` fields. When configured, its active key ID must equal `REVIEW_EVIDENCE_SIGNING_KEY_ID`, and every non-active lifecycle key must have corresponding retained verification material. This prevents lifecycle metadata, secret retention, and trust policy from silently drifting apart.

Never place signing secrets or retained-key JSON in `NEXT_PUBLIC_*`, source control, browser state, evidence packages, tickets, chat, screenshots, logs, or the non-secret lifecycle registry.

## Initial production enablement

1. Generate a production signing secret and a unique key ID in the approved secret-management system.
2. Configure the active secret and ID together in the hosting provider's encrypted server environment.
3. Configure `REVIEW_EVIDENCE_KEY_LIFECYCLE_JSON` with exactly one active entry for that key ID, including its activation timestamp and deployment/change reference. Do not put secret material in the registry.
4. Leave retained keys empty on first enablement unless approved historical v3 keys already exist. If historical keys exist, every non-active lifecycle entry must have matching retained secret material.
5. Run `npm run preflight:production`. Deployment must stop on any evidence-signing, retained-key, lifecycle, or compromised-key validation failure.
6. Deploy privately, authenticate as a sales/admin user, and export a fresh operating-review evidence package.
7. Verify the package in the evidence verification workspace. It must report format v3, a valid deterministic evidence hash, and `authenticated: true` for the configured active key ID.
8. Cross-check the same package against current state and export a reconciliation report. Both paths must accept the package only after origin authentication succeeds.
9. Retain the evidence package, its non-secret key ID, lifecycle metadata, deployment/change reference, and verification evidence according to the approved evidence-retention policy. Do not retain or copy the secret into the package or lifecycle registry.

## Standard key rotation

1. Create a new random signing secret and a new never-before-used key ID.
2. Before changing the active pair, preserve the outgoing key ID and secret in the approved server-side secrets archive for the evidence-retention period.
3. Add the outgoing pair to `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` without removing other still-required historical keys.
4. Update `REVIEW_EVIDENCE_KEY_LIFECYCLE_JSON` atomically with the planned rotation: mark the outgoing key `retired` with `retiredAt` and its change reference, add the new key as the single `active` entry with `activatedAt` and change reference, and retain all still-required historical entries.
5. Replace `REVIEW_EVIDENCE_SIGNING_SECRET` and `REVIEW_EVIDENCE_SIGNING_KEY_ID` together with the new pair.
6. Keep `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS` empty when the lifecycle registry is authoritative, or make it exactly equal to lifecycle entries marked `compromised` during transition.
7. Run production preflight before deployment. Duplicate IDs, weak retained secrets, malformed JSON, multiple/missing active lifecycle keys, registry/secret drift, missing retained material, or a compromised active ID must fail closed.
8. Deploy and export a new package. Its manifest must use the new active key ID and verify as authenticated.
9. Verify a package created immediately before rotation. It must authenticate using the exact retained prior key ID.
10. Confirm a pre-rotation package fails origin authentication if its retained key is intentionally removed from a non-production verification configuration. Restore approved production configuration after the test.
11. Never rewrite, re-sign, or regenerate historical packages merely because the active key changed.

## Compromise response

When a signing key is suspected or confirmed compromised:

1. Record the incident and identify the affected key ID and evidence era.
2. If the compromised key is active, generate and deploy a new active secret/key ID pair immediately through the normal rotation procedure. The application and production preflight intentionally reject a lifecycle registry where the configured active key does not match the single `active` entry.
3. Mark the affected historical key `compromised` in `REVIEW_EVIDENCE_KEY_LIFECYCLE_JSON`, preserve its `retiredAt`, and add the required `incidentRef`.
4. During transition, leave `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS` empty or make it exactly match the lifecycle registry's compromised IDs. A disagreeing legacy list is rejected.
5. Retain the old secret only if approved incident-response or forensic policy requires it; retention does not restore trust.
6. Verify a known package from the affected key. Its deterministic evidence hash may still be valid, but the application must return `authenticated: false` with the compromised-key trust reason.
7. Confirm cross-check and reconciliation export refuse to treat the compromised package as trusted origin evidence.
8. Independently reconcile affected evidence against database/audit sources before using it for decisions that require trusted origin.
9. Do not remove the compromised designation simply because the signature is cryptographically valid. Clearing that designation is an explicit incident-management decision outside the verifier.

## Retained-key retirement

A retained key may be removed only after its approved evidence-retention and incident requirements are satisfied. Before removal:

1. Identify packages whose manifests reference the key ID.
2. Confirm policy allows those packages to lose application-level origin authentication after the secret is removed.
3. Preserve the packages themselves unchanged; removal of key material does not permit rewriting their bytes or hashes.
4. Remove the retired key entry from `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` and the matching non-active lifecycle entry in the same controlled configuration change; never reuse its key ID with different secret material.
5. Run production preflight and verify a current active-key package after deployment.

## Production verification gate

Every evidence-signing configuration change must pass all of the following before release:

- `npm run security:scan`
- `npm run security:audit`
- `npm run preflight:production`
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

Operational validation must additionally prove the relevant live path: active-key export, retained-key historical verification after rotation, lifecycle/retained-material consistency, or compromised-key denial after an incident. Credential values must never be printed as proof.

## Evidence to retain

Retain only non-secret operational evidence outside the approved secret store: key ID, lifecycle state, activation/retirement timestamps, deployment/change reference, incident reference when applicable, package evidence hash, verification outcome, and operator/reviewer evidence. The signing secret and retained-key JSON remain solely in the approved secret-management system; the lifecycle registry contains metadata only.
