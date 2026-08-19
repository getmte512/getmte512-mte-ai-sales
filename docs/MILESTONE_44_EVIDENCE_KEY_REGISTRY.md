# Milestone 44 — Evidence signing key registry

Milestones 42 and 43 establish authenticated operating-review evidence and the production rotation contract. Milestone 44 defines the durable, non-secret registry operators use to identify which signing key ID was active for a given evidence era without exposing signing secrets.

## Registry contract

For every production evidence-signing key, retain an operator-controlled record containing:

- the unique `REVIEW_EVIDENCE_SIGNING_KEY_ID`;
- activation timestamp and, once retired, retirement timestamp;
- status: `active`, `retired`, or `compromised`;
- the deployment/change reference that introduced or retired the key;
- the approved location of the corresponding secret material, recorded as a reference only — never the secret itself;
- incident reference when a key is marked compromised.

Exactly one key ID may be active for new evidence exports in an environment at a time. A retired or compromised key ID must never be reused with new secret material.

## Verification behavior

The registry is operational metadata, not authentication authority. A registry entry alone never makes an evidence package valid. v3 evidence still requires cryptographic verification against the correct retained secret, and invalid signatures remain fail-closed.

Historical packages are not rewritten when registry state changes. Marking a key compromised changes the trust interpretation of packages from that key but does not alter their preserved bytes or deterministic integrity hashes.

## Safety boundary

This milestone adds no database migration and grants no CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, or Shopify mutation authority. The registry must never contain signing secrets or other production credentials.

## Completion gate

Operators can identify the lifecycle status and evidence era of every production signing key ID; only one key is active for new exports per environment; retired/compromised IDs cannot be reused; registry records never contain secret material; historical packages remain immutable; and cryptographic verification remains the only origin-authentication authority.