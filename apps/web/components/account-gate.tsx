"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AuthActionLink } from "@/components/auth-action-link";
import { Button } from "@/components/ui/button";
import { canGenerateReport, type AccountStatus } from "@/lib/account-sync";

export function AccountGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/account/status", {
          cache: "no-store"
        });
        const body = (await response.json()) as AccountStatus;

        if (isMounted) {
          setStatus(body);
        }
      } catch {
        if (isMounted) {
          setStatus({
            signedIn: false,
            hasAccount: false
          });
        }
      }
    }

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!status) {
    return (
      <div className="rounded-[8px] border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Checking account status...
      </div>
    );
  }

  if (!canGenerateReport(status)) {
    return (
      <div className="rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
        <p className="font-semibold">Sign in to generate this report</p>
        <p className="mt-2">
          Report export, payment, and email delivery require an account so Drift can attach the report to the right user without uploading raw transactions.
        </p>
        <Button className="mt-4 h-10 rounded-[8px]" asChild>
          <AuthActionLink action="login" returnTo="/report">
            Sign in
          </AuthActionLink>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
