# Drift Product PRD

**Version:** 0.2
**Goal:** Build a demo-ready web-first app that replaces the manual "where did my money go after my income changed?" workflow with a private AI-powered Drift Scan. Mobile is the next phase after the web MVP proves the value.
**Source reference:** `resources/drift_ai/drift_prd.md`

## One-Line Pitch

Drift is a private AI lifestyle inflation audit that shows when your spending quietly became your new normal, explains why it happened, and shows what that drift may have cost you.

## Why This Matters

Most people do not notice lifestyle inflation while it is happening. A raise, a new job, a relationship, social pressure, stress, convenience, or subscriptions can slowly turn into a higher monthly baseline. No single purchase feels dangerous, but the pattern becomes expensive.

Budgeting apps show what users spent. Drift shows what their spending became.

The product should make users feel three things quickly:

- "I did not realize this category changed that much."
- "Now I understand why it changed."
- "This is private enough that I would trust it with my financial data."

That is what makes Drift sellable. The user is not paying for charts. They are paying for a private diagnosis of hidden spending drift, counterfactual wealth impact, and a clear next action.

## Target User

**Primary user:** A 25-40 year old professional who recently got a raise, promotion, new job, moved cities, or started earning more, but feels like they are not saving as much as they should.

**Secondary user:** A personal finance power user who already tracks spending but wants behavior-level insight, not just category totals.

## Core Problem

Users do not need another budget. They need to know:

- Which spending categories quietly increased?
- When did the increase start?
- What life event or behavior caused it?
- How much has it cost them?
- What should they do now that the pattern is visible?

Drift answers those questions in one private mobile experience.

## Product Promise

After setup, Drift gives the user a clear lifestyle inflation report:

- Overall Drift Score
- Top drifting categories
- Monthly overspend versus baseline
- Counterfactual wealth lost
- Behavioral reason behind each drift
- Counterfactual reasoning that shows what the drift could have become if saved or invested
- Private spend intercept when a future transaction matches the same pattern

## MVP User Journey

1. User opens Drift.
2. User connects a bank account with Plaid or imports a CSV.
3. Drift stores transaction data locally and privately.
4. Drift builds a baseline from earlier spending.
5. Drift identifies categories that increased above the user's old normal.
6. User sees a simple dashboard with their Drift Score and top drifting categories.
7. User taps a category to see when the drift started and what it has cost.
8. Drift asks a short question to understand the behavior behind the increase.
9. User answers in plain language.
10. Drift tags the pattern and turns it into a short private insight.
11. When a future transaction matches a risky drift category, Drift sends a private local alert.
12. User marks the purchase as intentional, dismisses it, or reviews the impact.

## Web MVP Screens Implemented

- Scan dashboard with empty default state, CSV import, Plaid sandbox sync path, adaptive comparison windows, Drift Score, overspend, what-if value, healthy zero state, and new patterns to review.
- Evidence review with search, filtering, pagination, category overrides, private notes, and immediate recalculation.
- Category detail with monthly timeline, transactions, behavior note, and states for drift, stable, new, or no longer active.
- Pattern Lab with local Hugging Face behavior classification, editable behavior tag, and saved summary.
- Recovery plan that uses the behavior tag and answer to make the next step specific.
- Spend intercept demo that flags repeat high-drift categories and lets the user mark intentional or dismiss.
- Paid report with executive summary, top 3 drift patterns, new patterns, AI behavior explanation, 30-day recovery path, intercept result, privacy note, export/print, payment proof, and email capture.
- Account page with Auth0 sign-in and Supabase summary backup when keys are configured.

## Feature Requirements

### 1. Transaction Setup

Drift must support two setup paths:

- Connect with Plaid.
- Import a transaction CSV.

The app should make setup feel fast and low-risk. The user should understand that raw transaction data stays private and local.

Required product behavior:

- First launch asks the user to connect Plaid or import CSV.
- User can refresh transactions manually.
- App shows last sync/import time.
- App still works offline with existing local data.
- User can manually edit categories or notes.
- Local edits always take priority over future sync data.

### 2. Private Local Storage

Financial trust is part of the product. Drift must communicate that sensitive data is stored locally and protected.

Required product behavior:

- Transaction data is stored on the device.
- Storage is encrypted.
- App explains that raw transactions are not sent to cloud AI.
- Settings includes a privacy status section.
- User can see what data is local, backed up, or never uploaded.

### 3. Drift Score

The Drift Score is the main product moment. It must be understandable in seconds.

Required product behavior:

- Show one top-level Drift Score.
- Show category drift bars sorted by largest increase.
- Use simple states: stable, watch, high drift.
- Let users tap a category for deeper detail.
- Let users mark unusual periods as not representative.

Basic logic:

- Establish a spending baseline from the user's earlier data.
- Compare recent spending against the baseline.
- Flag meaningful increases.
- Combine category increases into an overall Drift Score.

### 4. Counterfactual Wealth

The app must translate drift into money the user emotionally understands.

Required product behavior:

- Show estimated monthly overspend.
- Show estimated wealth impact if the drift had been avoided.
- Explain this in plain language, not financial jargon.
- Example: "Dining is costing about $180 more per month than your old normal. If that drift had stayed invested, it could represent $14,820 over time."

This is important because it turns an abstract chart into a financial consequence.

### 5. Behavioral AI Insight

Drift should not only detect drift. It should ask why.

Required product behavior:

- For each major drift, Drift asks one short question.
- User can answer in free text.
- Drift tags the behavior behind the drift.
- Tags include:
  - reward spending
  - social pressure
  - habit creep
  - life event
  - intentional upgrade
  - unknown
- Drift stores the tag and a short summary.
- Drift uses the answer to explain the current drift and improve future intercepts.

Example:

> "Dining jumped after March 2023. Did something change around then?"

User:

> "I started a new job and felt like I deserved nicer dinners."

Drift:

> "Tagged as reward spending after income increase."

### 6. On-Device AI

On-device AI is a product trust feature, not just a technical feature.

Required product behavior:

- The app should clearly state that AI analysis happens on the phone.
- No raw transaction data should be sent to a cloud AI model.
- AI should be used for behavioral tagging, summaries, and private insight language.
- If AI is loading, paused, or unavailable, the user should see a clear state.

The user-facing value:

> "Your financial behavior is analyzed privately on your device."

### 7. Context and Memory

Drift should remember useful user explanations without overwhelming the user.

Required product behavior:

- Drift remembers prior answers and behavioral tags.
- Drift should not ask the same question repeatedly.
- Older context can be summarized into short memory notes.
- Relevant past answers should improve future drift explanations and spend intercepts.

Example:

> "You previously said Friday dining is linked to stressful work weeks."

### 8. Smart Model Management

Model behavior should feel smooth and respectful of the user's phone.

Required product behavior:

- AI should load only when needed.
- App should show a simple model status when relevant.
- App should avoid heavy AI work during low battery unless the phone is charging.
- App should pause non-urgent AI work when needed.
- App should recover gracefully if memory is limited.

This should be visible enough for judges to understand the product is serious, without making the main user experience feel technical.

### 9. Spend Intercept

Drift should help at the moment a pattern repeats.

Required product behavior:

- When new transactions sync, Drift checks whether they match a high-drift category.
- If they do, Drift sends a local notification.
- Opening the notification shows:
  - merchant
  - amount
  - category
  - drift percentage
  - behavioral tag
  - impact of the purchase
- User can mark the purchase as intentional.
- User can dismiss the alert.
- User can view or stub a "cancel it" action.
- Alerts should be rate-limited so the app does not become annoying.

The product goal is not shame or open-ended advice. The goal is a quick intentionality check tied to a pattern the user already chose to understand.

### 10. Backup and Sync

Backup is allowed, but privacy must remain the selling point.

Required product behavior:

- Backup is opt-in.
- Raw transactions are not backed up.
- Backup may include drift scores, tags, and category summaries.
- User can restore insights on a new device.
- Settings explains exactly what is and is not backed up.

### 11. Account and Backend Support

The backend exists only to support product setup and optional backup. It should not become the center of the product.

Required product behavior:

- User can create or use an account if needed.
- Plaid connection works through a secure backend flow.
- Optional backup can sync private summaries.
- The app should remain useful without cloud AI.

## Main Screens

### Dashboard

Purpose: Show the user's financial drift in under 10 seconds.

Must show:

- Drift Score
- Category drift list
- Counterfactual wealth
- Last sync/import time
- Privacy/local status

### Insights

Purpose: Explain why the drift happened.

Must show:

- Pending AI question
- User answers
- Behavioral tags
- Short summaries
- Timeline of major drifts

### Transactions

Purpose: Let users inspect and correct the source data.

Must show:

- Searchable transactions
- Category filters
- Manual category override
- Notes
- Sync/import status

### Settings

Purpose: Build trust.

Must show:

- Bank connection
- CSV import
- Privacy status
- Local AI status
- Backup toggle
- Notification preferences
- Model status

## Hackathon Workflow Replacement

Drift replaces this specific manual workflow:

1. Export bank or card transactions.
2. Put them into a spreadsheet.
3. Categorize or clean the transactions.
4. Compare older spending to recent spending.
5. Guess which categories inflated after a raise, move, new job, or life change.
6. Estimate what the drift cost.
7. Try to explain the behavior behind the increase.

Drift should collapse that workflow into one paid Drift Scan:

1. Connect Plaid or import CSV.
2. Run local/private analysis.
3. Show top drifting categories.
4. Show counterfactual wealth impact.
5. Ask one behavioral question.
6. Save the tag and insight.
7. Trigger a private local intercept when the pattern appears again.

## Demo Flow

The demo should tell a story, not list features.

1. Start with a user who got a new job in 2023.
2. Connect/import transaction history.
3. Show Drift Score.
4. Reveal top category: dining drifted sharply.
5. Show counterfactual wealth lost.
6. Drift asks what changed.
7. User says they started a new job and rewarded themselves.
8. Drift tags it as reward spending.
9. A new dining transaction appears.
10. Drift sends a local spend intercept.
11. User marks it intentional or reviews impact.
12. Close with privacy: the analysis happened on-device.

## Why Users Would Pay

Users pay because Drift gives them a specific financial diagnosis:

- It finds hidden lifestyle inflation.
- It shows the real cost.
- It explains the behavior behind the change.
- It helps catch repeat patterns at the moment they happen.
- It protects sensitive financial data.

Possible first paid offer:

**$1-$5 Drift Scan:** "Upload or connect your transactions and get a private lifestyle inflation report."

This works because the value is immediate. The user does not have to commit to a full budgeting system before seeing insight.

## Success Metrics

Product success:

- User completes setup.
- Drift Score is generated.
- User opens at least one category detail.
- User answers at least one AI question.
- User understands the counterfactual wealth card.
- User keeps notifications enabled.
- User says they would pay for a private Drift Scan.

Technical trust success:

- App works offline after setup.
- User can see local/private status.
- AI status is understandable.
- No raw transaction data is sent to cloud AI.
- App handles low battery or limited memory gracefully.

## Build Priority

Build in this order:

1. Mobile app shell and main screens.
2. Seed data demo.
3. Drift Score and category calculations.
4. Counterfactual wealth card.
5. CSV import.
6. Plaid sandbox setup.
7. Local encrypted storage.
8. Behavioral AI question and tagging.
9. On-device AI provider.
10. Model status and paused states.
11. Spend intercept notification.
12. Opt-in backup and account support.
13. Pitch polish and payment proof.

## Product Principles

- Make the money pain obvious.
- Make privacy visible.
- Keep charts simple.
- Ask fewer, better questions.
- Intercept without shaming.
- Show the product value before explaining the technology.
- Treat on-device AI as trust, not decoration.
- Every screen should answer: "What changed, why did it change, and what should I do now?"

## Non-Negotiables

- Drift must feel like a real finance product.
- The main demo must work end-to-end.
- No raw financial data should be sent to cloud AI.
- The product must explain lifestyle inflation better than a normal budget chart.
- The user should understand why this is worth paying for within the first minute.
