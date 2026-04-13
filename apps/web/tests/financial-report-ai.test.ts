import { describe, expect, it } from "vitest";
import {
  FINANCIAL_TEXT_MODEL_ID,
  buildFinancialReportInsight
} from "../lib/financial-report-ai";

describe("buildFinancialReportInsight", () => {
  it("uses a lightweight financial text classifier when available", async () => {
    const insight = await buildFinancialReportInsight(
      {
        executiveSummary: "Drift found $180/month in repeated overspending.",
        monthlyOverspendLabel: "$180",
        topPatternCount: 2
      },
      async () => async () => [{ label: "negative", score: 0.88 }]
    );

    expect(insight).toMatchObject({
      label: "Financial pressure",
      modelProvider: "huggingface",
      modelName: FINANCIAL_TEXT_MODEL_ID
    });
    expect(insight.summary).toMatch(/repeated monthly pressure/i);
  });

  it("falls back to deterministic report analysis when the model is unavailable", async () => {
    const insight = await buildFinancialReportInsight(
      {
        executiveSummary: "Drift did not find repeated overspending.",
        monthlyOverspendLabel: "$0",
        topPatternCount: 0
      },
      async () => {
        throw new Error("model unavailable");
      }
    );

    expect(insight).toMatchObject({
      label: "Steady",
      modelProvider: "deterministic"
    });
    expect(insight.summary).toMatch(/no repeated overspending/i);
  });
});
