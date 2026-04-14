import { NextResponse } from "next/server";
import { exchangePlaidServerPublicToken, PlaidServerNotConfiguredError } from "@/lib/plaid-server";

export async function POST(request: Request) {
  const body = await request.json() as { public_token?: string };

  if (!body.public_token) {
    return NextResponse.json({ message: "Missing public token." }, { status: 400 });
  }

  try {
    const response = await exchangePlaidServerPublicToken(body.public_token);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PlaidServerNotConfiguredError) {
      return NextResponse.json({
        message: "Set DRIFT_PLAID_CLIENT_ID and DRIFT_PLAID_SECRET in Vercel to enable Plaid token exchange.",
        required_env: ["DRIFT_PLAID_CLIENT_ID", "DRIFT_PLAID_SECRET"]
      }, { status: 503 });
    }

    return NextResponse.json({
      message: error instanceof Error ? error.message : "Plaid token exchange failed."
    }, { status: 502 });
  }
}
