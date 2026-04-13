# Drift Web MVP

Next.js web app for the Drift Scan demo and paid report flow.

## Run Locally

```powershell
npm install
npm run dev:api
npm run dev:web
```

Open `http://localhost:3000` or the port printed by Next.js.

## Test

```powershell
npm test
npm run test:api
npm run typecheck
npm run lint --workspace @drift/web
npm run build:web
npm run test:e2e --workspace @drift/web
```

## Demo Flow

1. Click Bank sync and sync Plaid sandbox transactions, or import `apps/web/tests/fixtures/sample-drift.csv`.
2. Review Scan, Evidence, and Category detail.
3. Answer Pattern Lab.
4. Run Intercept.
5. Open Report and print/export.
6. Open Account to sync or restore summary-only backup.

## Environment

Plaid sandbox uses the FastAPI backend keys in `apps/api/.env`.

Web-only keys:

```txt
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL=
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=
STRIPE_SECRET_KEY=
DRIFT_SCAN_PRICE_CENTS=100
RESEND_API_KEY=
DRIFT_REPORT_EMAIL_FROM=Drift <onboarding@resend.dev>

AUTH0_SECRET=
APP_BASE_URL=http://localhost:3000
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Run `supabase/schema.sql` in Supabase before enabling backup.

## Privacy Contract

Raw transaction rows are local browser data. Supabase sync sends only scan summaries, Pattern Lab notes, intercept decisions, and what-if settings.
