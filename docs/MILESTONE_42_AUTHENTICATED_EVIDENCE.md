# Milestone 42 — Authenticated operating-review evidence

New operating-review evidence exports use package format v3. The server computes the existing deterministic SHA-256 evidence hash and signs that hash with HMAC-SHA256 using a server-only secret. The manifest records the algorithm, a non-secret signing key ID, and the signature.

Production requires `REVIEW_EVIDENCE_SIGNING_SECRET` with at least 32 random characters and `REVIEW_EVIDENCE_SIGNING_KEY_ID`. Keep the secret in encrypted server environment configuration and never prefix it with `NEXT_PUBLIC_`. The key ID is intentionally included in evidence packages so a deliberate future rotation can be identified.

Verification behavior is fail-closed for v3 packages: integrity must pass, the configured key ID must match, and the HMAC signature must verify before current-state cross-checking or reconciliation is allowed. Historical v1/v2 packages remain supported as integrity-only legacy evidence and are explicitly reported as not origin-authenticated.

Live validation should export a v3 package, verify it successfully, confirm the UI reports authenticated MTE evidence and the expected key ID, alter one evidence field and confirm verification fails, then test the same package under a different signing secret and confirm origin authentication fails. Cross-check/reconciliation must remain unavailable for an invalid v3 package.

This milestone adds no database migration and no CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, or Shopify mutation authority.
