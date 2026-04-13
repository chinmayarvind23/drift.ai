export interface PaymentProofConfig {
  enabled: boolean;
  href: string | null;
  label: string;
  setupHint: string | null;
}

export function getPaymentProofConfig(
  env: Record<string, string | undefined> = process.env
): PaymentProofConfig {
  const href =
    env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL?.trim() ||
    env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim() ||
    null;

  if (!href) {
    return {
      enabled: false,
      href: null,
      label: "Pay $1 to unlock report",
      setupHint: "Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL to enable the $1 checkout."
    };
  }

  return {
    enabled: true,
    href,
    label: "Pay $1 to unlock report",
    setupHint: null
  };
}
