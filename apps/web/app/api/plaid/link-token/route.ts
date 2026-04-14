import { NextResponse } from "next/server";
import { createPlaidServerLinkToken, PlaidServerNotConfiguredError } from "@/lib/plaid-server";

export async function POST(request: Request) {
  const body = await request.json() as { user_id?: string };

  try {
    const response = await createPlaidServerLinkToken(body.user_id ?? "drift-demo-user");
    return NextResponse.json(response);
  } catch (error) {
    return plaidError(error);
  }
}

function plaidError(error: unknown) {
  if (error instanceof PlaidServerNotConfiguredError) {
    return NextResponse.json({
      message: "Set DRIFT_PLAID_CLIENT_ID and DRIFT_PLAID_SECRET in Vercel to enable Plaid sandbox.",
      required_env: ["DRIFT_PLAID_CLIENT_ID", "DRIFT_PLAID_SECRET"]
    }, { status: 503 });
  }

  return NextResponse.json({
    message: error instanceof Error ? error.message : "Plaid request failed."
  }, { status: 502 });
}
