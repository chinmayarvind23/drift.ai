"use client";

import { useCallback, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditWorkspace } from "@/components/audit-workspace";
import {
  createPlaidLinkToken,
  createSandboxPublicToken,
  exchangePlaidPublicToken,
  normalizePlaidTransactions,
  preparePlaidTransactionsForScan,
  syncPlaidTransactions
} from "@/lib/plaid-api";
import { getPlaidReadiness } from "@/lib/plaid-readiness";

export default function ConnectPage() {
  const readiness = getPlaidReadiness();
  const { loadPlaidTransactions } = useAuditWorkspace();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Waiting for a Plaid sandbox connection.");
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

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken) => {
      void syncPublicToken(publicToken).catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Could not sync Plaid transactions.");
        setStatusMessage("Plaid sync failed.");
      });
    }
  });

  async function startPlaidLink() {
    if (linkToken && ready) {
      open();
      return;
    }

    try {
      setErrorMessage(null);
      setStatusMessage("Creating Plaid Link token...");
      const token = await createPlaidLinkToken("local-demo-user");
      setLinkToken(token);
      setStatusMessage("Plaid Link token is ready. Click again to open Plaid Link.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not start Plaid Link.");
      setStatusMessage("Plaid Link is not ready.");
    }
  }

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
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <Badge className="rounded-[8px] border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          Plaid {readiness.mode}
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold">Bank connection</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Connect with Plaid Link or generate a sandbox public token for demo data. Synced
          transactions flow into the same local Drift Scan as CSV imports.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="h-10 rounded-[8px]" onClick={startPlaidLink}>
            {linkToken && ready ? "Open Plaid Link" : "Prepare Plaid Link"}
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-[8px] border-border bg-background"
            onClick={quickConnectSandbox}
          >
            Quick-connect sandbox
          </Button>
        </div>
        <div className="mt-5 surface-card text-sm leading-6">
          <p className="font-medium">{statusMessage}</p>
          {errorMessage ? <p className="mt-2 text-rose-700 dark:text-rose-300">{errorMessage}</p> : null}
        </div>
      </div>

      <div className="surface-panel">
        <h2 className="text-xl font-semibold">Backend routes ready</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{readiness.nextStep}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {readiness.requiredEnv.map((envName) => (
            <span key={envName} className="rounded-[8px] border border-border bg-background px-3 py-2 font-mono text-xs">
              {envName}
            </span>
          ))}
        </div>
        <div className="mt-5 divide-y divide-border overflow-hidden rounded-[8px] border border-border">
          {readiness.endpoints.map((endpoint) => (
            <div key={endpoint.path} className="grid gap-2 bg-background p-4 text-sm md:grid-cols-[92px_1fr]">
              <span className="font-mono text-xs text-muted-foreground">{endpoint.method}</span>
              <div>
                <p className="font-mono font-semibold">{endpoint.path}</p>
                <p className="mt-1 text-muted-foreground">{endpoint.purpose}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
