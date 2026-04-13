import { describe, expect, it } from "vitest";
import { buildStripeCheckoutBody, getStripeCheckoutConfig } from "../lib/stripe-checkout";

describe("getStripeCheckoutConfig", () => {
  it("uses the server Stripe key to enable Checkout without a payment link", () => {
    expect(
      getStripeCheckoutConfig({
        STRIPE_SECRET_KEY: "sk_test_123",
        APP_BASE_URL: "http://localhost:3000",
        DRIFT_SCAN_PRICE_CENTS: "100"
      })
    ).toMatchObject({
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

describe("buildStripeCheckoutBody", () => {
  it("creates a one-time Drift Scan checkout body", () => {
    const body = buildStripeCheckoutBody(
      {
        secretKey: "sk_test_123",
        appBaseUrl: "http://localhost:3000",
        priceCents: 100
      },
      { email: "maya@example.com" }
    );

    expect(body.get("mode")).toBe("payment");
    expect(body.get("customer_email")).toBe("maya@example.com");
    expect(body.get("success_url")).toBe("http://localhost:3000/report?payment=complete");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("100");
    expect(body.get("line_items[0][price_data][product_data][name]")).toBe("Drift Scan report");
  });
});
