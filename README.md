# Drift.ai

Drift.ai is a private AI lifestyle drift audit. It replaces the manual workflow of downloading bank transactions, building a spreadsheet, comparing old spending to recent spending, guessing what changed, and writing a plan by hand.

The target user is an early-career professional who recently got a raise, new job, moved cities, or changed routines and now wonders why the extra money does not feel visible.

## One Workflow Replaced

**Before Drift**

1. Download bank statements or CSVs.
2. Clean categories manually.
3. Build monthly category totals in a spreadsheet.
4. Compare old months against recent months.
5. Guess which increases are meaningful.
6. Write notes about why the change happened.
7. Decide what to do next.
8. Revisit the same work again after future purchases.

**After Drift**

1. Import a CSV.
2. Drift detects old-normal vs recent-normal category changes.
3. Pattern Lab uses local AI to interview the user about why the pattern started.
4. Drift saves behavior tags and follow-up context.
5. Intercept simulates a future repeat purchase and records intent.
6. The report cites the scan facts, explains behavior, gives a 30-day recovery path, and exports/emails a PDF.

## Why It Matters

Budgeting apps show what someone spent. Drift shows what their spending became.

The value is time saved, clearer behavior insight, and a paid private report that turns financial drift into a specific recovery path. The product is intentionally narrow: it is not a general finance dashboard and not an open-ended advice chatbot.

## AI-Native Loop

Drift uses deterministic math for trust and local AI for the behavior workflow.

1. **Math finds the pattern.** The scan compares old-normal months with recent-normal months.
2. **AI interviews the user.** Pattern Lab asks why a flagged pattern started, then asks a follow-up question based on the answer and behavior tag.
3. **AI classifies behavior.** Tags include reward spending, stress convenience, social pressure, habit creep, life event, and intentional upgrade.
4. **AI writes recovery language.** Local Qwen through Ollama turns category, overspend, tag, answer, and follow-up context into a short recovery path.
5. **AI writes the report.** The report review cites only scan facts, saved behavior notes, and intercept decisions.

Raw transaction rows are not sent to cloud AI. The local demo uses Ollama/Qwen.

## Data Sources And Citations

The demo uses user-provided CSV evidence or Plaid Sandbox transactions. Reports cite the evidence used in the scan:

- Drift Score
- Monthly overspend
- Category old normal
- Category recent normal
- Category monthly overspend
- Behavior tags
- Intercept decisions

No external market data is currently used. The what-if scenario is a user-adjustable calculation, not a prediction or investment recommendation.

## Stack

- Web: Next.js, React, shadcn-style components, Tailwind
- Backend: FastAPI for standalone backend routes, plus Next API routes for deployed web routes
- Database: Supabase for summary-only account backup and email/report interest
- Auth: Auth0
- Finance API: Plaid Sandbox
- Payments: Stripe Checkout / Payment Link
- Email: Resend
- Local AI: Ollama with `qwen2.5:0.5b`
- Tests: Vitest, Pytest, Playwright
- Hosting: Vercel for the web app; FastAPI can be deployed separately if needed

## Required Environment

Create or update both local env files:

```txt
.env.local
apps/web/.env.local
```

Minimum local web variables:

```txt
APP_BASE_URL=http://localhost:3000
AUTH0_BASE_URL=http://localhost:3000
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_SUPABASE_SERVICE_ROLE_KEY=

DRIFT_PLAID_CLIENT_ID=
DRIFT_PLAID_SECRET=
DRIFT_PLAID_ENVIRONMENT=sandbox
DRIFT_PLAID_PRODUCTS=transactions
DRIFT_PLAID_COUNTRY_CODES=US

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL=
DRIFT_SCAN_PRICE_CENTS=100

RESEND_API_KEY=
DRIFT_REPORT_EMAIL_FROM=Drift <onboarding@resend.dev>

OLLAMA_GENERATE_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=qwen2.5:0.5b
NEXT_PUBLIC_PREMIUM_GATE_ENABLED=false
```

For Vercel, add the same production values with `vercel env add`.

## Supabase Setup

Run the SQL schema in:

```txt
supabase/schema.sql
```

Supabase stores:

- account profiles
- scan summaries
- behavior insights
- intercept decisions
- what-if settings
- report email leads

Supabase should not store raw merchant/date/sourceHash transaction rows.

## Run Locally

Install dependencies:

```powershell
npm install
```

Start Ollama:

```powershell
ollama serve
```

Pull the local model:

```powershell
ollama pull qwen2.5:0.5b
```

Start the web app:

```powershell
npm run dev:web
```

Open:

```txt
http://localhost:3000
```

Optional FastAPI backend:

```powershell
npm run dev:api
```

FastAPI runs at:

```txt
http://localhost:8000
```

## Docker Local Run

Browsers cannot start Docker or Ollama when a user logs in. Start the local demo stack before presenting:

```powershell
Copy-Item .env.docker.example .env
notepad .env
docker compose up --build
```

This starts:

- Next.js web
- FastAPI backend
- Ollama
- Qwen model pull helper

Open:

```txt
http://localhost:3000
```

## Test Commands

Run the full automated pass:

```powershell
npm test
npm run test:api
npm run typecheck
npm run lint --workspace @drift/web
npm run build:web
npm run test:e2e --workspace @drift/web
```

Expected: all pass.

## Manual Test Plan

### 1. Clean Start

Run:

```powershell
taskkill /F /IM node.exe
Remove-Item -Recurse -Force apps/web/.next
npm run dev:web
```

Open `/settings` and click `Wipe local data`.

Expected:

- Source shows `No data yet`.
- Drift Score is `0`.
- Overspend is `$0`.
- What-if growth is `$0`.
- No old demo profile controls appear.

### 2. CSV Scan

Import:

```txt
apps/web/tests/fixtures/sample-drift.csv
```

Expected:

- Source says `Imported CSV`.
- Drift Score is non-zero.
- Overspend is non-zero.
- Dining appears as a drift pattern.
- Score guide opens `/methodology`.

### 4. Evidence Edits

Open `/evidence`.

Search:

```txt
2026-03-04
```

Move `Bar Luce` from `Dining` to `Education`.

Expected:

- Scan recalculates immediately.
- Dining overspend drops.
- `/` reflects the new value.
- `Education` appears under `New patterns to review`.

Move it back to `Dining`.

Expected:

- Local edits count returns to `0`.
- Original scan metrics return.

### 5. Pattern Lab AI Interview

Open `/insights`.

Answer:

```txt
I got promoted and felt like I deserved nicer dinners after stressful weeks.
```

Click `Suggest behavior tag`.

Expected:

- Local AI or local rules suggest a behavior tag.
- An AI follow-up question appears.
- Answer the follow-up:

```txt
One planned Friday dinner is worth keeping; random weekday delivery is automatic.
```

Save the insight.

Expected:

- Saved insight includes the behavior tag and follow-up context.
- `/plan` and `/report` use that behavior context.

### 6. Recovery Plan

Open `/plan`.

Expected:

- The page explains where insights come from.
- Recovery steps are based on flagged scan categories.
- If Pattern Lab was completed, the step language reflects the saved behavior tag.

### 7. Intercept

Open `/intercept`.

Manual input:

```txt
Merchant: Bar Luce
Amount: 72
Category: Dining
```

Click `Simulate transaction`.

Expected:

- High-drift category shows an intentionality check.
- Mark intentional or dismiss.
- Saved decision appears.
- Report includes the intercept decision as a result, not as button text.

Voice input:

Click `Voice input` and say:

```txt
Bar Luce 72 dollars dining
```

Expected:

- Merchant, amount, and category fields fill if the browser supports speech recognition.

### 8. What-If

Open `/scenario`.

Set:

```txt
Years: 10
Annual return %: 0
```

Expected:

- What-if growth is `$0`.
- Drift Score does not change.
- Overspend does not change.

Set:

```txt
Years: 20
Annual return %: 9
```

Expected:

- What-if growth increases.
- Drift Score still does not change.

### 9. Report

Open `/report`.

Expected:

- Financial AI review renders as markdown sections.
- It cites source facts such as `[Dining old $13 recent $40]`.
- It does not invent sensors, loans, investments, partners, or unrelated accounts.
- 30-day recovery path renders as bullets.
- Source lines appear below the review.

Click `Export PDF`.

Expected:

- Browser downloads `drift-scan-report.pdf`.

Enter email under `Send me my Drift report`.

Expected:

- Email says `Email sent.`
- Received email contains `drift-scan-report.pdf` as an attachment.
- Email body does not link to `localhost:3000`.

### 10. Stripe $1 Test

On `/report`, click:

```txt
Pay $1 to unlock report
```

Expected:

- Stripe Checkout opens.
- Use test card:

```txt
4242 4242 4242 4242
```

Any future expiration and any CVC.

### 11. Supabase Backup And Restore

Open `/account`.

Click `Sync summary backup`.

Expected:

- App says raw transactions were not uploaded.
- Supabase has summary/tags/intercepts.
- Supabase does not contain raw transaction rows.

Click restore if available.

Expected:

- Summary backup restores scan summary, Pattern Lab notes, intercept decisions, and what-if settings.
