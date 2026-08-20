# Milestone 50 — Admin evidence signing-key health

Milestone 49 made lifecycle metadata machine-validatable. Milestone 50 gives administrators a read-only operational view of that trust state without creating a secret-disclosure path.

## Health summary

`getReviewEvidenceKeyHealth()` evaluates the same active, retained, lifecycle, and compromised-key configuration used by evidence signing and verification. Its output contains only non-secret operational facts:

- healthy/unhealthy state and a safe validation reason;
- whether lifecycle metadata is configured;
- active key ID;
- retained key IDs;
- compromised key IDs;
- lifecycle status, activation/retirement timestamps, change reference, incident reference, and retained-material presence for registered key eras.

The summary never returns active or retained signing secrets. Invalid configuration also returns no secret material.

## Admin workspace

`/review/evidence-key-health` is server-rendered and requires administrator authorization. It displays lifecycle metadata and retained-material presence only. Sales users retain access to the evidence verification workspace but only administrators see the Key Health navigation link.

The workspace is intentionally read-only. It does not edit environment configuration, rotate keys, mark keys compromised, upload evidence, write database rows, or mutate CRM/business state.

## Safety boundary

This milestone adds no database migration and grants no CRM, outreach, pipeline, task, prospect, target, snapshot, annotation, command-center, Shopify, evidence-signing configuration, or other business-state mutation authority. Secret values are never sent to the browser.

## Completion gate

Administrators can see whether evidence signing configuration is healthy, which non-secret key eras are active/retired/compromised, and whether retained verification material is present; sales users do not receive the admin link; serialized health output cannot contain active or retained secret values; unhealthy configuration reports a safe non-secret reason; and the full security/test/type/build gate remains green.
