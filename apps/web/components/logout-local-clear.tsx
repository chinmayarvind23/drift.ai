"use client";

import { useEffect } from "react";
import {
  AUDIT_STATE_STORAGE_KEY,
  AUDIT_STORAGE_SECRET_KEY
} from "@/lib/audit-persistence";
import { clearCachedAccountStatus } from "@/lib/account-status-cache";

export function LogoutLocalClear() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("signedOut") !== "1") {
      return;
    }

    window.localStorage.removeItem(AUDIT_STATE_STORAGE_KEY);
    window.localStorage.removeItem(AUDIT_STORAGE_SECRET_KEY);
    clearCachedAccountStatus(window.localStorage);
    window.history.replaceState(null, "", window.location.pathname);
    window.location.reload();
  }, []);

  return null;
}
