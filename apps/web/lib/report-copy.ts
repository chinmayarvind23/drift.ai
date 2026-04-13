import type { DriftScan } from "./drift-scan";

export interface ReportSummary {
  executiveSummary: string;
  topPatternLabels: string[];
  newPatternLabels: string[];
}

export function buildReportSummary(scan: DriftScan): ReportSummary {
  const topPatterns = scan.topCategories
    .filter((category) => category.monthlyOverspendCents > 0)
    .slice(0, 3);

  return {
    executiveSummary:
      topPatterns.length > 0
        ? `Drift found ${topPatterns.length} repeated spending pattern${topPatterns.length === 1 ? "" : "s"} adding ${scan.monthlyOverspendLabel}/month above the old normal.`
        : "Drift did not find repeated overspending in this scan window.",
    topPatternLabels: topPatterns.map(
      (category) =>
        `${category.category}: ${category.monthlyOverspendLabel}/month above old normal.`
    ),
    newPatternLabels: scan.newPatterns.map(
      (pattern) =>
        `${pattern.category} started at ${pattern.recentMonthlyLabel}/month in ${pattern.recentWindowLabel}. Review it separately from Drift Score.`
    )
  };
}
