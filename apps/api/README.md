# Drift API

FastAPI service for Plaid sandbox integration and future backup/sync endpoints.

## Run

```powershell
python -m pip install -r requirements.txt
npm run dev:api
```

Open `http://localhost:8000/docs`.

## Plaid Sandbox

Copy `.env.example` to the repo root `.env` or export the variables in your shell:

```powershell
$env:DRIFT_PLAID_CLIENT_ID="your-client-id"
$env:DRIFT_PLAID_SECRET="your-sandbox-secret"
$env:DRIFT_PLAID_ENVIRONMENT="sandbox"
```

Until those are set, Plaid endpoints return `503` with the required env names.
