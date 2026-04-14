import { NextResponse } from "next/server";
import {
  createPlaidServerSandboxPublicToken,
  PlaidServerNotConfiguredError
} from "@/lib/plaid-server";

export async function POST() {
  try {
    const response = await createPlaidServerSandboxPublicToken();
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PlaidServerNotConfiguredError) {
      return NextResponse.json({
        message: "Set DRIFT_PLAID_CLIENT_ID and DRIFT_PLAID_SECRET in Vercel to enable Plaid sandbox public tokens.",
        required_env: ["DRIFT_PLAID_CLIENT_ID", "DRIFT_PLAID_SECRET"]
      }, { status: 503 });
    }

    return NextResponse.json({
      message: error instanceof Error ? error.message : "Plaid sandbox request failed."
    }, { status: 502 });
  }
}
