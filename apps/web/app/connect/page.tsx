"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditWorkspace } from "@/components/audit-workspace";
import {
  createSandboxPublicToken,
  exchangePlaidPublicToken,
  normalizePlaidTransactions,
  preparePlaidTransactionsForScan,
  syncPlaidTransactions
} from "@/lib/plaid-api";

export default function ConnectPage() {
  const { lastSyncAt, loadPlaidTransactions } = useAuditWorkspace();
  const [statusMessage, setStatusMessage] = useState("Waiting for sandbox evidence.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncPublicToken = useCallback(
    async (publicToken: string) => {
      setErrorMessage(null);
      setStatusMessage("Exchanging Plaid public token...");
      const exchange = await exchangePlaidPublicToken(publicToken);

      setStatusMessage("Syncing sandbox transactions...");
      const sync = await syncPlaidTransactions(exchange.access_token);
      const prepared = preparePlaidTransactionsForScan(normalizePlaidTransactions(sync.added ?? []));

      loadPlaidTransactions(prepared.transactions, "Plaid sandbox", prepared.message);
      setStatusMessage(prepared.message);
      if (!prepared.hasEnoughHistory) {
        setErrorMessage("Plaid connected, but the returned history is too short for a real Drift Score.");
      }
    },
    [loadPlaidTransactions]
  );

  async function quickConnectSandbox() {
    try {
      setErrorMessage(null);
      setStatusMessage("Creating sandbox public token...");
      const publicToken = await createSandboxPublicToken("local-demo-user");
      await syncPublicToken(publicToken);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not quick-connect sandbox data.");
      setStatusMessage("Sandbox quick connect failed.");
    }
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl items-center px-5 py-8 md:px-8">
      <div className="surface-panel w-full text-center">
        <Badge className="rounded-[8px] border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          Plaid sandbox
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold">Sandbox bank sync</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Pull Plaid sandbox transactions into the local Drift Scan. No real bank login is needed for this demo.
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            className="h-10 rounded-[8px]"
            onClick={quickConnectSandbox}
          >
            Sync sandbox transactions
          </Button>
        </div>
        <div className="mx-auto mt-5 max-w-xl surface-card text-left text-sm leading-6">
          <p className="font-medium">{statusMessage}</p>
          {errorMessage ? <p className="mt-2 text-rose-700 dark:text-rose-300">{errorMessage}</p> : null}
          <p className="mt-2 text-muted-foreground">
            Last local sync: {lastSyncAt ? formatDateTime(lastSyncAt) : "Not synced yet"}.
          </p>
        </div>
      </div>
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
