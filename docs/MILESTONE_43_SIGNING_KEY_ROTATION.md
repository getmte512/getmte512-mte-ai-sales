# Milestone 43 — Evidence signing key rotation readiness

Milestone 42 authenticates new operating-review evidence packages with HMAC-SHA256 and records a non-secret signing key ID in every v3 manifest. Milestone 43 defines the production rotation contract so operators can change signing credentials deliberately without weakening evidence verification.

## Rotation contract

1. Generate a new server-only `REVIEW_EVIDENCE_SIGNING_SECRET` with at least 32 random characters.
2. Assign a new, stable `REVIEW_EVIDENCE_SIGNING_KEY_ID`; never reuse a key ID for different secret material.
3. Preserve the previous secret/key-ID pair in the approved secrets archive for the evidence-retention period before changing production configuration.
4. Deploy the new secret and key ID together. Never expose either secret through `NEXT_PUBLIC_*`, logs, evidence packages, browser state, or client-side code.
5. Export a new v3 evidence package after deployment and verify that its manifest carries the new key ID and passes origin authentication.
6. Verify a package created immediately before rotation using the retained prior key in an isolated verification procedure. Do not rewrite or re-sign historical packages.
7. If the old secret is suspected compromised, mark its key ID as compromised in the incident record and treat packages signed by that key as integrity evidence only until independently reconciled.

## Safety boundary

Rotation changes authentication material only. It adds no database migration and grants no CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, or Shopify mutation authority. Verification remains fail-closed for v3 packages when the configured key ID or signature does not match.

## Completion gate

Production operators have a documented rotation procedure; key IDs are never reused across different secrets; historical evidence is never silently re-signed; a post-rotation v3 export authenticates with the new key; pre-rotation evidence remains independently verifiable with retained approved key material; and the full security/test/type/build gate remains green.
