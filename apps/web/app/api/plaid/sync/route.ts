import { NextResponse } from "next/server";
import { PlaidServerNotConfiguredError, syncPlaidServerTransactions } from "@/lib/plaid-server";

export async function POST(request: Request) {
  const body = await request.json() as { access_token?: string; cursor?: string };

  if (!body.access_token) {
    return NextResponse.json({ message: "Missing access token." }, { status: 400 });
  }

  try {
    const response = await syncPlaidServerTransactions(body.access_token, body.cursor);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PlaidServerNotConfiguredError) {
      return NextResponse.json({
        message: "Set DRIFT_PLAID_CLIENT_ID and DRIFT_PLAID_SECRET in Vercel to enable Plaid sync.",
        required_env: ["DRIFT_PLAID_CLIENT_ID", "DRIFT_PLAID_SECRET"]
      }, { status: 503 });
    }

    return NextResponse.json({
      message: error instanceof Error ? error.message : "Plaid sync failed."
    }, { status: 502 });
  }
}
