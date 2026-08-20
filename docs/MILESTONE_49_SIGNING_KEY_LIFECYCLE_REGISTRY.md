# Milestone 49 — Machine-validated signing-key lifecycle registry

Milestones 44 through 48 defined the evidence key registry contract, retained-key verification, compromised-key denial, and the production operations runbook. Milestone 49 turns the non-secret lifecycle registry from operator guidance into machine-validated application configuration.

## Lifecycle registry

`REVIEW_EVIDENCE_KEY_LIFECYCLE_JSON` is an optional non-secret server-side JSON object keyed by signing key ID. When configured, it becomes authoritative for lifecycle state.

Each entry contains:

- `status`: `active`, `retired`, or `compromised`;
- `activatedAt`: a valid timestamp;
- `changeRef`: a non-empty deployment/change reference;
- `retiredAt`: required for `retired` and `compromised` entries and forbidden for the active entry;
- `incidentRef`: required for `compromised` entries.

The registry must contain exactly one active key. Its ID must match `REVIEW_EVIDENCE_SIGNING_KEY_ID`. Registry entries may never contain `secret` or `signingSecret` material.

## Cross-configuration consistency

When lifecycle JSON is configured:

- every non-active lifecycle key must have matching secret material in `REVIEW_EVIDENCE_RETAINED_SIGNING_KEYS_JSON` so historical verification does not silently lose required key material;
- every retained key must exist in lifecycle metadata as `retired` or `compromised`;
- compromised trust state is derived from lifecycle entries marked `compromised`;
- legacy `REVIEW_EVIDENCE_COMPROMISED_SIGNING_KEY_IDS` may be empty, or if still populated during transition it must exactly match lifecycle-compromised IDs;
- the active signing key can never be a compromised entry.

Invalid lifecycle JSON, multiple or missing active keys, invalid timestamps/statuses, missing change/incident references, secret fields in the registry, active-ID drift, retained-material drift, or compromise-list drift fail closed.

Deployments without lifecycle JSON retain the Milestone 46 legacy behavior so existing environments can migrate deliberately rather than failing solely because the new metadata source has not yet been configured.

## Safety boundary

Lifecycle data is operational trust metadata only. This milestone adds no database migration and grants no CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, Shopify, or other business-state mutation authority. Signing secrets remain server-only and outside the lifecycle registry.

## Completion gate

The application parses and validates lifecycle metadata; exactly one active registry key matches the active signing configuration; non-active metadata and retained secrets cannot drift; compromised state is registry-derived when configured; legacy compromise configuration can transition without ambiguity; production preflight enforces the same consistency rules without printing credentials; the runbook explains the authoritative lifecycle model; and the full security/test/type/build gate remains green.
