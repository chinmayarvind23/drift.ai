import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  buildStripeCheckoutBody,
  getStripeCheckoutConfig,
  getStripeCheckoutMissingReasons
} from "@/lib/stripe-checkout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const config = getStripeCheckoutConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        error: `Stripe checkout is not configured. ${getStripeCheckoutMissingReasons().join(" ")}`
      },
      { status: 503 }
    );
  }

  const session = auth0 ? await auth0.getSession() : null;
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(config.managedPaymentsEnabled ? { "Stripe-Version": "2026-02-25.preview" } : {})
    },
    body: buildStripeCheckoutBody(config, {
      email: session?.user?.email ?? null
    })
  });
  const body = (await response.json()) as { url?: string; error?: { message?: string } };

  if (!response.ok || !body.url) {
    return NextResponse.json(
      {
        ok: false,
        error: body.error?.message ?? "Could not create Stripe checkout."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    url: body.url
  });
}
