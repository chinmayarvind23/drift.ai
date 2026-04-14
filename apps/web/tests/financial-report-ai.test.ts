import { describe, expect, it } from "vitest";
import { buildBehaviorInsight } from "../lib/behavior-insights";
import { buildDemoDriftScan } from "../lib/drift-scan";
import {
  buildFinancialReportInsight,
  buildFinancialReportSources,
  cleanFinancialReportSummary
} from "../lib/financial-report-ai";

describe("buildFinancialReportInsight", () => {
  it("uses local Ollama report output and cites scan sources", async () => {
    const scan = buildDemoDriftScan();
    let requestBody = "";
    const insight = await buildFinancialReportInsight(
      {
        executiveSummary: "Drift found repeated overspending.",
        monthlyOverspendLabel: scan.monthlyOverspendLabel,
        scan,
        behaviorInsights: {
          Dining: buildBehaviorInsight(
            "Dining",
            "I felt like I deserved it.",
            "2026-04-12T10:00:00.000Z",
            {
              tag: "reward_spending",
              confidence: null,
              modelProvider: "ollama",
              modelName: "qwen",
              followUpAnswer: "Friday dinners are the reward I want to keep."
            }
          )
        },
        interceptDecisions: []
      },
      async (_url, init) => {
        requestBody = String(init?.body ?? "");

        return new Response(JSON.stringify({
          summary: "Dining is the clearest repeat pressure [Dining old $20 recent $60].",
          model: "qwen2.5:0.5b"
        }), { status: 200 }) as Response;
      }
    );

    expect(insight).toMatchObject({
      label: "Financial pressure",
      modelProvider: "ollama",
      modelName: "qwen2.5:0.5b"
    });
    expect(insight.summary).toMatch(/\[Dining old/i);
    expect(insight.sources.join("\n")).toMatch(/Dining pattern label: Reward spending/);
    expect(requestBody).toContain("Friday dinners are the reward I want to keep.");
  });

  it("returns an unavailable state when local Ollama is not running", async () => {
    const scan = buildDemoDriftScan();
    const insight = await buildFinancialReportInsight(
      {
        executiveSummary: "Drift found repeated overspending.",
        monthlyOverspendLabel: scan.monthlyOverspendLabel,
        scan
      },
      async () => new Response(JSON.stringify({ message: "unavailable" }), { status: 503 }) as Response
    );

    expect(insight.modelProvider).toBe("unavailable");
    expect(insight.summary).toMatch(/Local AI is not running/i);
  });

  it("replaces prompt-echoing AI output with a grounded user-facing review", async () => {
    const scan = buildDemoDriftScan();
    const insight = await buildFinancialReportInsight(
      {
        executiveSummary: "Drift found repeated overspending.",
        monthlyOverspendLabel: "$80",
        scan,
        topPatterns: [{
          ...scan.topCategories[0],
          category: "Dining",
          baselineLabel: "$30",
          recentLabel: "$110",
          monthlyOverspendLabel: "$80",
          monthlyOverspendCents: 8000
        }],
        behaviorInsights: {
          Dining: buildBehaviorInsight(
            "Dining",
            "got promoted",
            "2026-04-12T10:00:00.000Z",
            {
              tag: "reward_spending",
              confidence: null,
              modelProvider: "ollama",
              modelName: "qwen",
              followUpAnswer: "reward"
            }
          )
        },
        interceptDecisions: [{
          id: "intercept-1",
          category: "Dining",
          merchantName: "Bar",
          amountLabel: "$50",
          amountCents: 5000,
          decision: "intentional",
          createdAt: "2026-04-12T10:00:00.000Z",
          flagged: true,
          reason: "reason",
          ahaMessage: "message",
          nextMove: "next",
          driftPercentLabel: "267%",
          monthlyOverspendLabel: "$80",
          insightLabel: "Reward spending"
        }]
      },
      async () => new Response(JSON.stringify({
        summary: [
          "### What changed",
          "Compare old normal to recent normal with a bracketed scan citation.",
          "you changed their consumption habits and now spends an additional $80 daily above the old normal.",
          "### What to do next",
          "Give one friction-removal step for the next 7 days."
        ].join("\n"),
        model: "qwen2.5:0.5b"
      }), { status: 200 }) as Response
    );

    expect(insight.summary).toContain("Dining rose from $30 to $110 per month");
    expect(insight.summary).toContain("[Dining old $30 recent $110]");
    expect(insight.summary).toContain("got promoted");
    expect(insight.summary).not.toMatch(/Compare old normal|Give one friction|their|daily/i);
  });
});

describe("cleanFinancialReportSummary", () => {
  it("removes echoed prompt instructions and speaks directly to the person", () => {
    const cleaned = cleanFinancialReportSummary([
      "### What changed",
      "One bullet comparing old normal to recent normal with a bracketed scan citation.",
      "- The user's Dining changed [Dining old $30 recent $110].",
      "### What to do next",
      "One concrete friction-removal step for the next 7 days.",
      "- The user can choose one planned dinner."
    ].join("\n"));

    expect(cleaned).not.toMatch(/One bullet|One concrete/i);
    expect(cleaned).not.toMatch(/the user/i);
    expect(cleaned).toMatch(/your Dining|you can/i);
  });
});

describe("buildFinancialReportSources", () => {
  it("builds explicit source lines from scan facts, behavior tags, and intercept decisions", () => {
    const scan = buildDemoDriftScan();
    const sources = buildFinancialReportSources({
      executiveSummary: "summary",
      monthlyOverspendLabel: scan.monthlyOverspendLabel,
      scan,
      behaviorInsights: {
        Dining: buildBehaviorInsight("Dining", "I felt like I deserved it.", "2026-04-12T10:00:00.000Z")
      },
      interceptDecisions: [{
        id: "intercept-1",
        category: "Dining",
        merchantName: "Bar Luce",
        amountLabel: "$72",
        amountCents: 7200,
        decision: "intentional",
        createdAt: "2026-04-12T10:00:00.000Z",
        flagged: true,
        reason: "reason",
        ahaMessage: "message",
        nextMove: "next",
        driftPercentLabel: "200%",
        monthlyOverspendLabel: "$40",
        insightLabel: "Reward spending"
      }]
    });

    expect(sources).toContain("Drift Score 79");
    expect(sources.join("\n")).toMatch(/Dining: old normal/);
    expect(sources).toContain("Dining pattern label: Reward spending");
    expect(sources).toContain("Dining intercept: Bar Luce marked intentional");
  });
});
