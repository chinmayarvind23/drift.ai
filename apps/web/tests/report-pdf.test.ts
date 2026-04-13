import { describe, expect, it, vi } from "vitest";
import { exportReportPdf } from "../lib/report-pdf";

describe("exportReportPdf", () => {
  it("builds a named PDF with report sections", async () => {
    const text = vi.fn();
    const save = vi.fn();

    await exportReportPdf(
      {
        scoreLabel: "65",
        monthlyOverspendLabel: "$40",
        investmentGainLabel: "$13",
        executiveSummary: "Drift found one repeated spending pattern.",
        recoverySteps: ["Dining: keep one planned dinner."],
        interceptSummaries: ["Intentional: Bar Luce was reviewed."],
        privacyNote: "Raw transactions stayed local."
      },
      async () => ({
        jsPDF: class {
          setFontSize = vi.fn();
          text(...args: unknown[]) {
            text(...args);
          }
          splitTextToSize(value: string) {
            return [value];
          }
          save(...args: unknown[]) {
            save(...args);
          }
        }
      })
    );

    expect(text).toHaveBeenCalledWith("Drift Scan Report", 20, 20);
    expect(save).toHaveBeenCalledWith("drift-scan-report.pdf");
  });
});
