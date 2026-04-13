import { describe, expect, it } from "vitest";
import { getPaymentProofConfig } from "../lib/payment-proof";

describe("getPaymentProofConfig", () => {
  it("enables payment proof when a Stripe Payment Link is configured", () => {
    expect(
      getPaymentProofConfig({
        NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL: "https://buy.stripe.com/test_123"
      })
    ).toMatchObject({
      enabled: true,
      href: "https://buy.stripe.com/test_123",
      label: "Pay $1 to unlock report"
    });
  });

  it("accepts the shorter payment link env name", () => {
    expect(
      getPaymentProofConfig({
        NEXT_PUBLIC_STRIPE_PAYMENT_LINK: "https://buy.stripe.com/test_456"
      })
    ).toMatchObject({
      enabled: true,
      href: "https://buy.stripe.com/test_456"
    });
  });

  it("keeps the app demoable without a payment key", () => {
    expect(getPaymentProofConfig({})).toMatchObject({
      enabled: false,
      setupHint: "Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL to enable the $1 checkout."
    });
  });
});
