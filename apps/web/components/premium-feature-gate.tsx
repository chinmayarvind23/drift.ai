"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AuthActionLink } from "@/components/auth-action-link";
import { PaymentButton } from "@/components/payment-button";
import { Button } from "@/components/ui/button";
import { canGenerateReport, type AccountStatus } from "@/lib/account-sync";
import { getPaymentProofConfig } from "@/lib/payment-proof";

export function PremiumFeatureGate({
  children,
  featureName
}: {
  children: ReactNode;
  featureName: string;
}) {
  const premiumGateEnabled = process.env.NEXT_PUBLIC_PREMIUM_GATE_ENABLED === "true";
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const paymentProof = getPaymentProofConfig();

  useEffect(() => {
    if (!premiumGateEnabled) {
      return;
    }

    const paymentComplete = new URLSearchParams(window.location.search).get("payment") === "complete";

    if (paymentComplete) {
      window.localStorage.setItem("drift.premiumUnlocked", "true");
    }

    queueMicrotask(() => {
      setIsUnlocked(window.localStorage.getItem("drift.premiumUnlocked") === "true" || paymentComplete);
    });

    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/account/status", { cache: "no-store" });
        const body = (await response.json()) as AccountStatus;

        if (isMounted) {
          setStatus(body);
        }
      } catch {
        if (isMounted) {
          setStatus({ signedIn: false, hasAccount: false });
        }
      }
    }

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, [premiumGateEnabled]);

  if (!premiumGateEnabled || isUnlocked) {
    return <>{children}</>;
  }

  const canPay = status ? canGenerateReport(status) : false;

  return (
    <div className="relative overflow-hidden rounded-[8px]">
      <div className="pointer-events-none select-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <div className="max-w-sm rounded-[8px] border border-border bg-card p-4 text-center text-sm shadow-sm">
          <p className="font-semibold">{featureName} is part of the private report.</p>
          <p className="mt-2 text-muted-foreground">
            Sign in and unlock the $1 Drift Scan to reveal this section.
          </p>
          {canPay ? (
            <PaymentButton href={paymentProof.href} label={paymentProof.label} />
          ) : (
            <Button className="mt-4 h-10 rounded-[8px]" asChild>
              <AuthActionLink action="login" returnTo="/report">
                Sign in
              </AuthActionLink>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
