"use client";

import { Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AuthActionLink } from "@/components/auth-action-link";
import { Button } from "@/components/ui/button";
import { canGenerateReport, type AccountStatus } from "@/lib/account-sync";
import { readCachedAccountStatus, writeCachedAccountStatus } from "@/lib/account-status-cache";

export function ReportSectionLock({
  children,
  sectionName
}: {
  children: ReactNode;
  sectionName: string;
}) {
  const [status, setStatus] = useState<AccountStatus | null>(() =>
    typeof window === "undefined" ? null : readCachedAccountStatus(window.localStorage)
  );
  const [hasCheckedStatus, setHasCheckedStatus] = useState(() =>
    typeof window !== "undefined" && Boolean(readCachedAccountStatus(window.localStorage))
  );

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/account/status", { cache: "no-store" });
        const body = (await response.json()) as AccountStatus;

        if (isMounted) {
          setStatus(body);
          setHasCheckedStatus(true);
          writeCachedAccountStatus(window.localStorage, body);
        }
      } catch {
        if (isMounted) {
          setStatus({ signedIn: false, hasAccount: false });
          setHasCheckedStatus(true);
        }
      }
    }

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status && canGenerateReport(status)) {
    return <>{children}</>;
  }

  if (!hasCheckedStatus) {
    return (
      <div className="relative overflow-hidden rounded-[8px]" aria-busy="true">
        <div className="pointer-events-none select-none opacity-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[8px]" data-testid="locked-report-section">
      <div className="pointer-events-none select-none blur-[3px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm">
        <div className="max-w-sm rounded-[8px] border border-border bg-card/95 p-5 text-center text-sm shadow-sm">
          <div className="mx-auto flex size-10 items-center justify-center rounded-[8px] border border-border bg-background">
            <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mt-3 font-semibold">{sectionName} is locked</p>
          <p className="mt-2 leading-6 text-muted-foreground">
            Sign in or create an account to view the private report sections tied to this scan.
          </p>
          <Button className="mt-4 h-10 rounded-[8px]" asChild>
            <AuthActionLink action="signup" returnTo="/report">
              Sign up to unlock
            </AuthActionLink>
          </Button>
        </div>
      </div>
    </div>
  );
}
