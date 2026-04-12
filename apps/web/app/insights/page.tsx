"use client";

import { PatternQuestion } from "@/components/audit-ui";
import { useAuditWorkspace } from "@/components/audit-workspace";

export default function InsightsPage() {
  const { scan } = useAuditWorkspace();
  const topPattern = scan.topCategories[0]?.category ?? "your biggest pattern";

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <h1 className="text-3xl font-semibold">Pattern Lab</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Drift should not stop at numbers. The next step is explaining why {topPattern} became part of the new normal.
        </p>
        <div className="surface-card text-sm leading-6 text-muted-foreground">
          Behavior tagging comes next: reward spending, social pressure, habit creep, life event, intentional upgrade, stress convenience, or unknown.
        </div>
      </div>
      <PatternQuestion />
    </section>
  );
}
