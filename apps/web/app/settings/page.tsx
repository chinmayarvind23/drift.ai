"use client";

import { PrivacyStatus } from "@/components/audit-ui";
import { useAuditWorkspace } from "@/components/audit-workspace";

export default function SettingsPage() {
  const { scan, transactionEdits } = useAuditWorkspace();

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <h1 className="text-3xl font-semibold">Privacy and local memory</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Drift stores the working audit locally in this browser. Raw transactions are not sent to cloud AI in this flow.
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
        </dl>
      </div>
      <PrivacyStatus items={scan.privacyItems} />
    </section>
  );
}
