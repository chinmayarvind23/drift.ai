"use client";

import { PrivacyStatus } from "@/components/audit-ui";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const {
    behaviorInsights,
    clearLocalAuditState,
    interceptDecisions,
    lastSyncAt,
    scan,
    transactionEdits
  } = useAuditWorkspace();

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <h1 className="text-3xl font-semibold">Privacy and local memory</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Drift stores the working audit locally in this browser. Raw transactions are not sent to cloud AI in this web flow.
        </p>
        <dl className="mt-5 grid gap-3 text-sm">
          <div className="surface-card">
            <dt className="text-muted-foreground">Local edits</dt>
            <dd className="mt-1 font-semibold">{Object.keys(transactionEdits).length}</dd>
          </div>
          <div className="surface-card">
            <dt className="text-muted-foreground">Saved scenario</dt>
            <dd className="mt-1 font-semibold">{scan.projectionScenarioLabel}</dd>
          </div>
          <div className="surface-card">
            <dt className="text-muted-foreground">Behavior notes</dt>
            <dd className="mt-1 font-semibold">{Object.keys(behaviorInsights).length}</dd>
          </div>
          <div className="surface-card">
            <dt className="text-muted-foreground">Intercept decisions</dt>
            <dd className="mt-1 font-semibold">{interceptDecisions.length}</dd>
          </div>
          <div className="surface-card">
            <dt className="text-muted-foreground">Last sync/import</dt>
            <dd className="mt-1 font-semibold">{lastSyncAt ? formatDateTime(lastSyncAt) : "Not synced yet"}</dd>
          </div>
        </dl>
        <div className="mt-6 grid gap-3 text-sm">
          <div className="surface-card">
            <p className="font-semibold">Local and encrypted</p>
            <p className="mt-2 leading-6 text-muted-foreground">
              Transactions, notes, Pattern Lab tags, intercept decisions, and scenario settings are encrypted in this browser.
            </p>
          </div>
          <div className="surface-card">
            <p className="font-semibold">Backup sync</p>
            <p className="mt-2 leading-6 text-muted-foreground">
              Account backup is managed from the Account page. It syncs scan summaries, tags, intercept decisions, and what-if settings only.
            </p>
          </div>
          <div className="surface-card">
            <p className="font-semibold">Local AI</p>
            <p className="mt-2 leading-6 text-muted-foreground">
              Pattern Lab uses a local browser classifier, the report can use local Qwen through Ollama, and fallback rules keep everything working offline.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-[8px] border border-rose-200 bg-rose-50 p-4 dark:border-rose-400/30 dark:bg-rose-400/10">
          <p className="text-sm font-semibold text-rose-950 dark:text-rose-100">Wipe local audit</p>
          <p className="mt-2 text-sm leading-6 text-rose-900/75 dark:text-rose-100/75">
            Clears local transactions, notes, behavior tags, intercept decisions, and the browser encryption key.
          </p>
          <Button variant="destructive" className="mt-4 h-10 rounded-[8px]" onClick={clearLocalAuditState}>
            Wipe local data
          </Button>
        </div>
      </div>
      <PrivacyStatus items={scan.privacyItems} />
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
