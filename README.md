# MTE AI Sales Platform

Internal sales operating platform for More Than Energy.

## Current status

Repository engineering and production database schema are complete through migration `055`. The remaining launch work is operational: provision the production Vercel project, configure production environment variables, deploy `main`, and complete the live launch-validation ceremonies documented in `docs/PRODUCTION_READINESS.md`.

## Production gates

Before launch:

- `npm run security:scan`
- `npm run security:audit`
- `npm run preflight:production`
- `npm run config:production`
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

After deployment, use the manually dispatched GitHub Actions **Production Closure** workflow or run:

```bash
MTE_PRODUCTION_URL=https://your-production-host.example \
MTE_PRODUCTION_COOKIE='authenticated admin Cookie header value' \
npm run closure:production
```

The closure runner is read-only. It does not create launch evidence or mutate CRM, outreach, pipeline, task, Shopify, or operating-review state.

## Product safety rule

AI may research, organize, score, recommend, and draft. No email, text message, LinkedIn message, or customer notification is sent without explicit human approval. Customer orders are never placed until the customer explicitly confirms them.

See `PROJECT_ROADMAP.md`, `DEPLOYMENT.md`, and `docs/PRODUCTION_READINESS.md` for the full implementation and launch contract.
