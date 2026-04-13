# Drift Implementation Plan

**Source PRD:** `drift_prd.md`  
**V1 goal:** Build a web-first Drift Scan that replaces the manual spreadsheet workflow of finding where lifestyle inflation happened after income or life changes. Mobile remains the next product surface after the web MVP is complete.

Drift stays narrow: it is not a general budget app. It connects or imports transactions, detects spending drift, explains the behavioral cause, shows counterfactual wealth impact, and creates a private local spend intercept for repeat patterns.

## Product Commitments

1. Counterfactual reasoning is core, not optional.
2. Plaid is core, with CSV import as the reliable fallback.
3. Local encrypted storage, local AI classification, and opt-in backup/sync are part of the web MVP.
4. The mobile app follows after the web MVP and should reuse the same core logic.
5. No raw transaction data should be sent to a cloud AI model.
6. Drift produces audits, insights, and intercepts. It should not become an open-ended advice product.

## Hackathon Fit

| Criteria | Drift V1 Answer |
| --- | --- |
| Workflow replacement | Replaces manual transaction export, spreadsheet cleanup, category comparison, and behavior guessing |
| $1 test | Sell a `$1-$5 Drift Scan` that produces a private lifestyle inflation report |
| Working MVP | Demo Plaid sandbox or CSV import, local analysis, Drift Score, new-pattern review, counterfactual card, Pattern Lab, intercept, and paid report |
| AI depth | Local Hugging Face classification tags the behavior and shapes the recovery path from user context |
| Focus | One workflow: "Where did my raise/new income disappear?" |

## Stack

| Area | Choice | Notes |
| --- | --- | --- |
| Mobile app | React Native / Expo | Primary product surface for local storage, notifications, and on-device AI |
| Web frontend | Next.js, shadcn/ui, Tailwind | Demo site, report view, payment flow, optional account settings |
| Backend | FastAPI, Pydantic | Plaid token exchange, account support, backup/sync APIs |
| Database | Supabase Postgres | Accounts, backup metadata, encrypted summaries, payment state |
| Auth | Auth0 | Account login for backup/sync and web access |
| Finance API | Plaid | Required V1 integration, sandbox first |
| Fallback import | CSV | Required for demos and users without Plaid support |
| On-device AI | Local model runtime | Behavior tagging, summary, insight text; cloud AI only for dev fallback if explicitly enabled |
| Optional API | FRED or Alpha Vantage | Growth-rate assumptions for counterfactual wealth |
| Hosting | Vercel + AWS Lambda | Vercel for Next.js, Lambda/FastAPI for backend |

## Repo Structure

```txt
drift.ai/
  apps/
    mobile/
      app/
      components/
      lib/
      storage/
      tests/
      package.json

    web/
      app/
      components/
      lib/
      tests/
      package.json
      components.json

    api/
      app/
        main.py
        api/
        core/
        db/
        integrations/
        schemas/
        services/
      tests/
      pyproject.toml

  packages/
    drift-core/
      src/
      tests/

    shared/
      fixtures/
      contracts/

  supabase/
    migrations/
    seed.sql

  docs/
    architecture.md
    testing.md
    deployment.md

  drift_prd.md
  IMPLEMENTATION.md
  README.md
```

## V1 Features

### Web MVP Status

- `/` Scan: CSV import, adaptive windows, Drift Score, overspend, what-if, healthy zero state, new patterns to review.
- `/evidence`: searchable/paginated evidence review, category edits, private notes, recalculated scan.
- `/category/[name]`: category timeline, transactions, behavior note, no-longer-active state.
- `/insights`: Pattern Lab question, local Hugging Face behavior tag suggestion, editable tag, saved summary.
- `/plan`: behavior-aware 30-day recovery plan.
- `/intercept`: simulated new transaction intentionality check.
- `/report`: paid-report surface with executive summary, top drift patterns, new patterns, AI behavior explanation, recovery path, intercept result, privacy note, export/print, signup, and Stripe payment link support.
- `/account`: Auth0 sign-in and Supabase summary backup surface.

### Remaining After Web MVP

- Deploy frontend to Vercel and FastAPI to a public host after live environment variables are provided.
- Build mobile app after the web product flow is stable.
- Add full Stripe Checkout/webhook if payment link proof is not enough.

### 1. Mobile Shell and Privacy Status

- Main tabs: Dashboard, Insights, Transactions, Settings.
- Local/private status visible on Dashboard and Settings.
- Offline mode after setup.
- Model status and backup status visible without technical clutter.

### 2. Plaid and CSV Setup

- Plaid Link flow through FastAPI token exchange.
- Plaid sandbox support for demo.
- CSV fallback with required fields: `date`, `merchant`, `amount`, `category`.
- Manual refresh.
- Last sync/import time.
- Local category overrides always beat synced categories.

### 3. Local Encrypted Storage

- Store raw transactions on device.
- Encrypt local transaction storage.
- Save user edits, notes, behavioral tags, and generated insights locally.
- Sync only opt-in summaries/metadata, never raw transactions by default.

### 4. Drift Score

- Build baseline from older valid months.
- Compare recent months against baseline.
- Calculate category drift percent and monthly overspend.
- Produce one 0-100 Drift Score.
- States: `stable`, `watch`, `high_drift`.

### 5. Counterfactual Wealth

- Show estimated monthly overspend.
- Show what the drift could represent if saved or invested over time.
- Keep assumptions visible and editable later.
- Use a fixed default assumption first; add FRED/Alpha Vantage only if it improves the pitch without slowing the build.

### 6. Behavioral AI Insight

- Ask one short question for each major drift.
- Run behavior tagging on-device.
- Tags: `reward_spending`, `social_pressure`, `habit_creep`, `life_event`, `intentional_upgrade`, `unknown`.
- Store a short local summary and insight.
- No open-ended advice thread.

### 7. Spend Intercept

- On new synced/imported transactions, check high-drift categories.
- Send local notification when a repeat pattern appears.
- User can mark intentional, dismiss, or view impact.
- Rate-limit alerts.

### 8. Backup and Sync

- Auth0 account for backup/sync.
- Backup is opt-in.
- Raw transactions are not backed up by default.
- Sync allowed data: Drift Score, category summaries, behavior tags, generated insights, settings.
- Settings must explain what is local, synced, and never uploaded.

### 9. Payment Proof

- Add a `$1-$5 Drift Scan` checkout or payment link.
- Unlock full report/export after payment.
- Keep payment proof available for the pitch.

## Data Model

Local mobile storage owns raw transactions. Supabase owns account and opt-in sync data.

```txt
local_transactions
  id, transaction_date, merchant_name, amount_cents, category,
  user_category_override, note, source_hash, source

local_drift_snapshots
  id, category, baseline_monthly_cents, recent_monthly_cents,
  monthly_overspend_cents, drift_percent, drift_state, window_start,
  window_end, created_at

local_behavior_insights
  id, category, drift_snapshot_id, user_explanation,
  behavior_tag, summary, insight_text, created_at

supabase_users
  id, auth0_subject, email, created_at

synced_summaries
  id, user_id, encrypted_payload, payload_type, created_at

import_batches
  id, user_id, source, imported_at, status

payments
  id, user_id, provider, amount_cents, status, created_at
```

## Backend API

```txt
POST /plaid/link-token
POST /plaid/exchange-token
POST /plaid/sync
POST /backup/summaries
GET  /backup/summaries
POST /payments/checkout
POST /payments/webhook
GET  /settings/privacy
```

CSV import, drift scoring, counterfactual calculations, and AI insight generation should run in app-local code first. FastAPI supports secure integrations and opt-in sync.

## Drift Algorithm V1

1. Group transactions by month and category.
2. Use older valid months as the baseline window.
3. Use recent valid months as the comparison window.
4. Ignore categories with too little data.
5. Calculate baseline spend, recent spend, monthly overspend, and drift percent.
6. Assign state:
   - `stable`: less than 15% increase
   - `watch`: 15-35% increase
   - `high_drift`: more than 35% increase
7. Combine category drift into one Drift Score.
8. Feed only category summaries into the local AI insight step.

The math must stay explainable. Trust comes from clear reasoning, not a black box.

## Counterfactual V1

Start with a simple projection:

```txt
future_value = monthly_overspend * monthly_compounding_factor over N years
```

Defaults:

- Time horizon: 10 years.
- Annual return assumption: 7%.
- Show this as an estimate, not a promise.

Later, an external finance API can update assumptions, but the first version should not depend on that API to work.

## On-Device AI Workflow

Use a narrow workflow:

```txt
drift snapshot
  -> ask one behavior question
  -> classify answer locally
  -> generate short insight locally
  -> save local insight
  -> update intercept rule
```

Guardrails:

- No raw transaction histories go to cloud AI.
- Store short summaries and tags, not long transcripts.
- If local AI is unavailable, save the user answer and tag it as `unknown`.
- Cloud model fallback is development-only unless the user explicitly opts in.

## TDD Plan

Build each feature test-first.

Mobile/core:

- CSV parser tests.
- Transaction normalization tests.
- Local storage encryption smoke test.
- Drift scoring fixture tests.
- Counterfactual calculation tests.
- Behavior tagger tests with deterministic local/fake model responses.
- Notification/intercept rule tests.

Backend:

- Plaid token exchange tests with mocked Plaid responses.
- Plaid sync tests with sandbox fixtures.
- Backup/sync API tests.
- Auth0-protected route tests with mocked JWT claims.
- Payment webhook tests.

Frontend/web:

- Checkout/report page tests.
- README/demo flow smoke test where practical.
- Playwright happy path for payment/report if web report is built.

## Build Order

1. Scaffold monorepo.
2. Build shared `drift-core` tests for CSV, scoring, and counterfactual math.
3. Implement mobile shell with seed data.
4. Add Drift Score and category detail.
5. Add counterfactual wealth card.
6. Add CSV import.
7. Add local encrypted storage.
8. Add Plaid sandbox via FastAPI.
9. Add on-device behavior tagging and insight generation.
10. Add spend intercept notification.
11. Add Auth0 and opt-in backup/sync.
12. Add `$1-$5 Drift Scan` payment proof.
13. Polish README, demo script, and pitch deck support.

## V1 Done Means

- User can run Drift on mobile.
- User can connect Plaid sandbox or import CSV.
- Raw transactions are stored locally and encrypted.
- Drift Score is calculated locally.
- Top drifting categories are shown.
- Counterfactual wealth impact is shown.
- User answers one behavior question.
- On-device AI saves a behavior tag and insight.
- Repeat-pattern local notification works in demo.
- Backup/sync is opt-in and explains what is uploaded.
- A non-team member can pay at least `$1` for a Drift Scan.
- Core logic and main user flow are covered by tests.

## Required Secrets

```txt
AUTH0_DOMAIN
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET
AUTH0_SECRET
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PLAID_CLIENT_ID
PLAID_SECRET
PLAID_ENV
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_API_BASE_URL
```

## Open Decisions

1. Which mobile stack do we commit to first: Expo React Native or native iOS?
2. Which on-device model/runtime is realistic for the demo device?
3. Should payment unlock a mobile report, a web report, or both?
4. Which CSV format should we optimize first: generic, Mint, Monarch, Apple Card, Chase, or another bank export?
