"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { buildAccountSyncPayload } from "@/lib/account-sync";

export function AccountSyncCard() {
  const {
    behaviorInsights,
    interceptDecisions,
    projectionScenario,
    scan
  } = useAuditWorkspace();
  const [message, setMessage] = useState("Backup sync is off until you sign in and add Supabase keys.");

  async function syncAuditSummary() {
    setMessage("Syncing summary...");
    const payload = buildAccountSyncPayload({
      userId: "local-demo-user",
      scan,
      behaviorInsights,
      interceptDecisions,
      projectionScenario
    });
    const response = await fetch("/api/sync/audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json() as { ok: boolean; configured?: boolean; error?: string };

    if (!body.ok) {
      setMessage(body.error ?? "Backup sync is not ready.");
      return;
    }

    setMessage("Summary synced. Raw transactions were not uploaded.");
  }

  return (
    <div className="surface-card">
      <p className="text-sm font-semibold">Account backup</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Backup stores summaries, Pattern Lab notes, intercept decisions, and what-if settings. It does not upload raw transactions.
      </p>
      <Button className="mt-4 h-10 rounded-[8px]" onClick={syncAuditSummary}>
        Sync summary backup
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
