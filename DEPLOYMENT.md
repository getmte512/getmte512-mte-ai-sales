# MTE CRM deployment checklist

No production deployment should proceed until the in-app **Launch Checklist** has no required blockers.

## 1. Choose the application address

Create the private Next.js project with the chosen host, then set `NEXT_PUBLIC_APP_URL` to its final HTTPS origin, for example `https://crm.example.com`. Do not include a path or trailing callback parameters.

## 2. Configure environment settings

Use `.env.example` as the field list. Enter real values only in the hosting provider's encrypted environment settings. Keep `SUPABASE_SERVICE_ROLE_KEY` and `SHOPIFY_ADMIN_ACCESS_TOKEN` server-only. Never paste them into issues, commits, build logs, or chat.

## 3. Configure Supabase authentication URLs

In Supabase Authentication URL settings:

- Set the Site URL to the final `NEXT_PUBLIC_APP_URL` value.
- Add `<NEXT_PUBLIC_APP_URL>/auth/confirm` to the allowed redirect URLs.
- Keep `http://localhost:3001/auth/confirm` only for local development.

## 4. Run verification

Run `npm run preflight:production`, `npm test`, `npx tsc --noEmit`, and `npm run build`. The preflight command reports only presence and safety status; it never prints credential values.

## 5. Controlled release

Deploy to a private preview first. Sign in as an administrator, run **System Health** and **Launch Checklist**, verify invitation acceptance with a designated internal test account, and then test the selected retailer pilot. Do not enable automated sending or Shopify write permissions.
