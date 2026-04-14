import { describe, expect, it } from "vitest";
import {
  buildStripeCheckoutBody,
  getStripeCheckoutConfig,
  getStripeCheckoutMissingReasons
} from "../lib/stripe-checkout";

describe("getStripeCheckoutConfig", () => {
  it("uses the server Stripe key to enable Checkout without a payment link", () => {
    expect(
      getStripeCheckoutConfig({
        STRIPE_SECRET_KEY: "sk_test_123",
        APP_BASE_URL: "http://localhost:3000",
        DRIFT_SCAN_PRICE_CENTS: "100",
        DRIFT_STRIPE_MANAGED_PAYMENTS_ENABLED: "true"
      })
    ).toMatchObject({
      managedPaymentsEnabled: true,
      secretKey: "sk_test_123",
      appBaseUrl: "http://localhost:3000",
      priceCents: 100
    });
  });

  it("requires a real minimum payment amount", () => {
    expect(
      getStripeCheckoutConfig({
        STRIPE_SECRET_KEY: "sk_test_123",
        APP_BASE_URL: "http://localhost:3000",
        DRIFT_SCAN_PRICE_CENTS: "50"
      })
    ).toBeNull();
  });
});

describe("getStripeCheckoutMissingReasons", () => {
  it("explains missing checkout env vars", () => {
    expect(getStripeCheckoutMissingReasons({})).toEqual([
      "STRIPE_SECRET_KEY is missing.",
      "APP_BASE_URL or AUTH0_BASE_URL is missing."
    ]);
  });
});

describe("buildStripeCheckoutBody", () => {
  it("creates a one-time Drift Scan checkout body", () => {
    const body = buildStripeCheckoutBody(
      {
        secretKey: "sk_test_123",
        appBaseUrl: "http://localhost:3000",
        priceCents: 100,
        managedPaymentsEnabled: true
      },
      { email: "maya@example.com" }
    );

    expect(body.get("mode")).toBe("payment");
    expect(body.get("customer_email")).toBe("maya@example.com");
    expect(body.get("success_url")).toBe("http://localhost:3000/report?payment=complete");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("100");
    expect(body.get("line_items[0][price_data][product_data][name]")).toBe("Drift Scan report");
    expect(body.get("managed_payments[enabled]")).toBe("true");
  });
});
