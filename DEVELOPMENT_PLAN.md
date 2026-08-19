# Development Plan

The detailed product sequence and completion gates are maintained in `PROJECT_ROADMAP.md`.

The platform has progressed through the CRM, research, outreach, pipeline, Shopify evidence, command-center, operating-review, immutable snapshot, operating-target, target-attainment, goal-focus, and target-governance layers. Milestone 25 adds append-only human operating context to immutable review snapshots: observations, decisions, and risks are attached without changing the underlying metrics or target evidence.

Current engineering rules remain unchanged: human-controlled sales actions stay explicit; historical evidence is append-only or immutable; privileged mutations are authenticated, role-gated, and audited; required evidence fails closed rather than showing partial guidance; and each milestone must pass security scan, production dependency audit, production preflight, tests, TypeScript, and production build before merge.
