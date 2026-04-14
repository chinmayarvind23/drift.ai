import { describe, expect, it } from "vitest";
import { buildDemoDriftScan, buildDriftScan } from "../lib/drift-scan";
import { buildReportSummary } from "../lib/report-copy";
import type { InterceptDecision } from "../lib/spend-intercept";

describe("buildReportSummary", () => {
  it("summarizes top drift and new patterns for the paid report", () => {
    const scan = buildDemoDriftScan();
    const summary = buildReportSummary(scan);

    expect(summary.executiveSummary).toMatch(/Drift found/i);
    expect(summary.topPatternLabels).toHaveLength(3);
    expect(summary.newPatternLabels).toEqual([]);
  });

  it("includes dismissed intercept choices without changing the scan math", () => {
    const scan = buildDemoDriftScan();
    const decision: InterceptDecision = {
      id: "intercept-1",
      category: "Dining",
      merchantName: "Bar Luce",
      amountLabel: "$72",
      amountCents: 7200,
      decision: "dismissed",
      createdAt: "2026-04-12T10:00:00.000Z",
      flagged: true,
      reason: "reason",
      ahaMessage: "message",
      nextMove: "next",
      driftPercentLabel: "200%",
      monthlyOverspendLabel: "$40",
      insightLabel: "Reward spending"
    };
    const summary = buildReportSummary(scan, [decision]);

    expect(summary.executiveSummary).toContain("Drift found");
    expect(summary.executiveSummary).toContain("You reviewed 1 intercept choice");
    expect(summary.executiveSummary).toContain("1 dismissed from the pattern");
    expect(summary.executiveSummary).toContain(scan.monthlyOverspendLabel);
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
