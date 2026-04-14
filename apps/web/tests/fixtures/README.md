# Drift CSV Test Fixtures

Use these from the Scan page CSV importer.

## sample-drift.csv

Expected:
- Drift Score: `65`
- Overspend: `$40`
- If saved and invested: non-zero with the default 10 years at 7%
- Top drift: `Dining`
- Pattern Lab question targets `Dining`

## reward-dining-drift.csv

Expected:
- Drift Score: `71`
- Overspend: `$80`
- Top drift: `Dining`
- Good Pattern Lab answer: `I got promoted and felt like I deserved nicer dinners after long weeks.`
- Expected tag: `Reward spending`
- Report should show a 30-day recovery path for Dining.

## multi-drift-stress.csv

Expected:
- Drift Score: `73`
- Overspend: `$180`
- Top drifts: `Delivery` and `Rides`
- Good Pattern Lab answer: `Work got busy and I was too tired to cook or plan rides home.`
- Expected tag: `Stress convenience`
- Intercept should flag a repeat high-drift category.

## income-spend-drift.csv

Expected:
- Drift Score: `61`
- Overspend: `$94`
- Top drift: `Dining`
- `Rides` appears under `New patterns to review`
- Cash flow map shows income rising from `$4,200` to `$5,200`
- Cash flow map shows spending rising from `$1,860` to `$2,020`
- Positive income rows are graphed as income and excluded from Drift Score.

## new-pattern-education.csv

Expected:
- Drift Score: `0`
- Overspend: `$0`
- `Education` appears under `New patterns to review`
- `Education` is labeled `New pattern, not Drift`
- Pattern Lab stays inactive because there is no repeated overspend.

## healthy-zero-drift.csv

Expected:
- Drift Score: `0`
- Overspend: `$0`
- Healthy scan state
- No recovery path needed
