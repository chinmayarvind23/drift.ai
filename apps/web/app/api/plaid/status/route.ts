import { NextResponse } from "next/server";
import { getPlaidServerConfig, plaidIsConfigured } from "@/lib/plaid-server";

const PLAID_ROUTES = [
  "/plaid/status",
  "/plaid/link-token",
  "/plaid/exchange-token",
  "/plaid/sandbox/public-token",
  "/plaid/sync"
];

export function GET() {
  const config = getPlaidServerConfig();

  return NextResponse.json({
    configured: plaidIsConfigured(config),
    mode: process.env.DRIFT_PLAID_ENVIRONMENT ?? "sandbox",
    routes: PLAID_ROUTES
  });
}
