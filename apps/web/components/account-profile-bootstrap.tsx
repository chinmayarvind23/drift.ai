"use client";

import { useEffect } from "react";
import { shouldCacheAccountStatus, shouldClearAccountStatus } from "@/lib/account-bootstrap";
import { clearCachedAccountStatus, writeCachedAccountStatus } from "@/lib/account-status-cache";
import type { AccountStatus } from "@/lib/account-sync";

export function AccountProfileBootstrap() {
  useEffect(() => {
    let isMounted = true;

    async function syncAccountProfile() {
      try {
        const response = await fetch("/api/account/status", { cache: "no-store" });
        const status = (await response.json()) as AccountStatus;

        if (!isMounted) {
          return;
        }

        if (shouldCacheAccountStatus(status)) {
          writeCachedAccountStatus(window.localStorage, status);
          return;
        }

        if (shouldClearAccountStatus(status)) {
          clearCachedAccountStatus(window.localStorage);
        }
      } catch {
        // Keep the current UI usable if account status is temporarily unavailable.
      }
    }

    void syncAccountProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
