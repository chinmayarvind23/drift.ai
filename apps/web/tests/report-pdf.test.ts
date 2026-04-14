import { describe, expect, it, vi } from "vitest";
import { createReportPdfBase64, exportReportPdf } from "../lib/report-pdf";

describe("exportReportPdf", () => {
  it("builds a branded PDF with report sections", async () => {
    const text = vi.fn();
    const save = vi.fn();
    const addImage = vi.fn();
    const roundedRect = vi.fn();

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
          setFont = vi.fn();
          setTextColor = vi.fn();
          setFillColor = vi.fn();
          setDrawColor = vi.fn();
          setLineWidth = vi.fn();
          line = vi.fn();
          roundedRect(...args: unknown[]) {
            roundedRect(...args);
          }
          addImage(...args: unknown[]) {
            addImage(...args);
          }
          text(...args: unknown[]) {
            text(...args);
          }
          splitTextToSize(value: string) {
            return [value];
          }
          save(...args: unknown[]) {
            save(...args);
          }
          output() {
            return new Uint8Array([1, 2, 3]).buffer;
          }
        }
      })
    );

    expect(addImage).toHaveBeenCalled();
    expect(roundedRect).toHaveBeenCalled();
    expect(text).toHaveBeenCalledWith("Drift Scan Report", 42, 22);
    expect(save).toHaveBeenCalledWith("drift-scan-report.pdf");
  });

  it("formats markdown recovery text into clean PDF bullets", async () => {
    const text = vi.fn();

    await exportReportPdf(
      {
        scoreLabel: "64",
        monthlyOverspendLabel: "$27",
        investmentGainLabel: "$1,416",
        executiveSummary: "Drift found one repeated spending pattern.",
        recoverySteps: [
          "Dining: ### Dining\n#### Behavior Tag:\n- **Dining**\n---\n### Recovery Path\n- Keep one planned dinner before Friday."
        ],
        interceptSummaries: [],
        privacyNote: "Raw transactions stayed local."
      },
      async () => ({
        jsPDF: class {
          setFontSize = vi.fn();
          setFont = vi.fn();
          setTextColor = vi.fn();
          setFillColor = vi.fn();
          setDrawColor = vi.fn();
          setLineWidth = vi.fn();
          line = vi.fn();
          roundedRect = vi.fn();
          addImage = vi.fn();
          text(...args: unknown[]) {
            text(...args);
          }
          splitTextToSize(value: string) {
            return [value];
          }
          save = vi.fn();
          output() {
            return new Uint8Array([1, 2, 3]).buffer;
          }
        }
      })
    );

    const writtenText = text.mock.calls.map((call) => call[0]).flat().join("\n");

    expect(writtenText).not.toContain("###");
    expect(writtenText).not.toContain("####");
    expect(writtenText).not.toContain("---");
    expect(writtenText).toContain("Keep one planned dinner before Friday.");
  });

  it("creates a base64 PDF attachment", async () => {
    const attachment = await createReportPdfBase64(
      {
        scoreLabel: "65",
        monthlyOverspendLabel: "$40",
        investmentGainLabel: "$13",
        executiveSummary: "Drift found one repeated spending pattern.",
        recoverySteps: ["Dining: keep one planned dinner."],
        interceptSummaries: [],
        privacyNote: "Raw transactions stayed local."
      },
      async () => ({
        jsPDF: class {
          setFontSize = vi.fn();
          setFont = vi.fn();
          setTextColor = vi.fn();
          setFillColor = vi.fn();
          setDrawColor = vi.fn();
          setLineWidth = vi.fn();
          line = vi.fn();
          roundedRect = vi.fn();
          addImage = vi.fn();
          text = vi.fn();
          splitTextToSize(value: string) {
            return [value];
          }
          save = vi.fn();
          output() {
            return new Uint8Array([1, 2, 3]).buffer;
          }
        }
      })
    );

    expect(attachment).toBe("AQID");
  });
});
