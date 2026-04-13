import { describe, expect, it } from "vitest";
import { buildDemoDriftScan, buildDriftScan } from "../lib/drift-scan";
import { buildReportSummary } from "../lib/report-copy";

describe("buildReportSummary", () => {
  it("summarizes top drift and new patterns for the paid report", () => {
    const scan = buildDemoDriftScan();
    const summary = buildReportSummary(scan);

    expect(summary.executiveSummary).toMatch(/Drift found/i);
    expect(summary.topPatternLabels).toHaveLength(3);
    expect(summary.newPatternLabels).toEqual([]);
  });

  it("calls out new patterns without treating them as Drift", () => {
    const scan = buildDriftScan(
      [
        {
          transactionDate: "2026-03-15",
          merchantName: "Market",
          amountCents: 4000,
          category: "Groceries",
          sourceHash: "groceries-old",
          source: "csv"
        },
        {
          transactionDate: "2026-04-15",
          merchantName: "Night Class",
          amountCents: 6000,
          category: "Education",
          sourceHash: "education-recent",
          source: "csv"
        }
      ],
      "Imported CSV"
    );

    expect(buildReportSummary(scan).newPatternLabels).toEqual([
      "Education started at $60/month in Apr 2026. Review it separately from Drift Score."
    ]);
  });
});
