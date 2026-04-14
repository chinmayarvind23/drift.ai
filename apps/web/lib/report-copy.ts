import type { DriftScan } from "./drift-scan";
import type { InterceptDecision } from "./spend-intercept";

export interface ReportSummary {
  executiveSummary: string;
  topPatternLabels: string[];
  newPatternLabels: string[];
}

export function buildReportSummary(
  scan: DriftScan,
  interceptDecisions: InterceptDecision[] = []
): ReportSummary {
  const topPatterns = scan.topCategories
    .filter((category) => category.monthlyOverspendCents > 0)
    .slice(0, 3);
  const interceptLine = buildInterceptExecutiveLine(interceptDecisions);

  return {
    executiveSummary:
      topPatterns.length > 0
        ? [
          `Drift found ${topPatterns.length} repeated spending pattern${topPatterns.length === 1 ? "" : "s"} adding ${scan.monthlyOverspendLabel}/month above the old normal.`,
          interceptLine
        ].filter(Boolean).join(" ")
        : [
          "Drift did not find repeated overspending in this scan window.",
          interceptLine
        ].filter(Boolean).join(" "),
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

function buildInterceptExecutiveLine(interceptDecisions: InterceptDecision[]): string {
  if (interceptDecisions.length === 0) {
    return "";
  }

  const intentionalCount = interceptDecisions.filter((decision) => decision.decision === "intentional").length;
  const dismissedCount = interceptDecisions.filter((decision) => decision.decision === "dismissed").length;
  const parts = [
    intentionalCount > 0 ? `${intentionalCount} kept on purpose` : "",
    dismissedCount > 0 ? `${dismissedCount} dismissed from the pattern` : ""
  ].filter(Boolean);

  return `You reviewed ${interceptDecisions.length} intercept choice${interceptDecisions.length === 1 ? "" : "s"}: ${parts.join(", ")}.`;
}
