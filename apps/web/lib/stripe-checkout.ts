export interface StripeCheckoutConfig {
  managedPaymentsEnabled: boolean;
  secretKey: string;
  priceCents: number;
  appBaseUrl: string;
}

export interface StripeCheckoutInput {
  email?: string | null;
}

export function getStripeCheckoutConfig(
  env: Record<string, string | undefined> = process.env
): StripeCheckoutConfig | null {
  const secretKey = env.STRIPE_SECRET_KEY;
  const appBaseUrl = env.APP_BASE_URL ?? env.AUTH0_BASE_URL;
  const priceCents = Number(env.DRIFT_SCAN_PRICE_CENTS ?? "100");

  if (!secretKey || !appBaseUrl || !Number.isFinite(priceCents) || priceCents < 100) {
    return null;
  }

  return {
    managedPaymentsEnabled: env.DRIFT_STRIPE_MANAGED_PAYMENTS_ENABLED === "true",
    secretKey,
    appBaseUrl,
    priceCents: Math.round(priceCents)
  };
}

export function getStripeCheckoutMissingReasons(
  env: Record<string, string | undefined> = process.env
): string[] {
  const reasons: string[] = [];
  const priceCents = Number(env.DRIFT_SCAN_PRICE_CENTS ?? "100");

  if (!env.STRIPE_SECRET_KEY) {
    reasons.push("STRIPE_SECRET_KEY is missing.");
  }

  if (!(env.APP_BASE_URL ?? env.AUTH0_BASE_URL)) {
    reasons.push("APP_BASE_URL or AUTH0_BASE_URL is missing.");
  }

  if (!Number.isFinite(priceCents) || priceCents < 100) {
    reasons.push("DRIFT_SCAN_PRICE_CENTS must be at least 100.");
  }

  return reasons;
}

export function buildStripeCheckoutBody(
  config: StripeCheckoutConfig,
  input: StripeCheckoutInput = {}
): URLSearchParams {
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${config.appBaseUrl}/report?payment=complete`,
    cancel_url: `${config.appBaseUrl}/report?payment=cancelled`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(config.priceCents),
    "line_items[0][price_data][product_data][name]": "Drift Scan report"
  });

  if (config.managedPaymentsEnabled) {
    body.set("managed_payments[enabled]", "true");
  }

  if (input.email) {
    body.set("customer_email", input.email);
  }

  return body;
}
