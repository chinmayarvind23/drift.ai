import { afterEach, describe, expect, it, vi } from "vitest";
import { buildReportReminderHtml, getReportEmailConfig, sendReportReminderEmail } from "../lib/report-email";

vi.mock("../lib/report-pdf", () => ({
  createReportPdfBase64: vi.fn(async () => "pdf-base64")
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getReportEmailConfig", () => {
  it("enables report email when Resend is configured", () => {
    expect(
      getReportEmailConfig({
        RESEND_API_KEY: "re_123",
        APP_BASE_URL: "http://localhost:3000",
        DRIFT_REPORT_EMAIL_FROM: "Drift <report@example.com>"
      })
    ).toMatchObject({
      apiKey: "re_123",
      appBaseUrl: "http://localhost:3000",
      from: "Drift <report@example.com>"
    });
  });

  it("stays disabled without an email provider key", () => {
    expect(getReportEmailConfig({ APP_BASE_URL: "http://localhost:3000" })).toBeNull();
  });
});

describe("buildReportReminderHtml", () => {
  it("explains that the PDF is attached without linking to localhost", () => {
    const html = buildReportReminderHtml(
      {
        email: "maya@example.com",
        intent: "report",
        created_at: "2026-04-13T00:00:00.000Z"
      }
    );

    expect(html).toMatch(/PDF is attached/);
    expect(html).not.toMatch(/localhost:3000/);
    expect(html).toMatch(/Raw transaction rows are not included/);
  });
});

describe("sendReportReminderEmail", () => {
  it("attaches the generated report PDF through Resend", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
    );

    const result = await sendReportReminderEmail(
      {
        email: "maya@example.com",
        intent: "report",
        created_at: "2026-04-13T00:00:00.000Z"
      },
      {
        apiKey: "re_123",
        appBaseUrl: "http://localhost:3000",
        from: "Drift <report@example.com>"
      },
      {
        scoreLabel: "64",
        monthlyOverspendLabel: "$27",
        investmentGainLabel: "$9",
        executiveSummary: "Drift found one pattern.",
        recoverySteps: ["Dining: keep one planned dinner."],
        interceptSummaries: ["Intentional: Bar Luce was reviewed."],
        privacyNote: "Raw transactions stayed local."
      }
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string) as {
      attachments: Array<{ filename: string; content: string }>;
      html: string;
    };

    expect(result.sent).toBe(true);
    expect(body.attachments).toEqual([
      {
        filename: "drift-scan-report.pdf",
        content: "pdf-base64"
      }
    ]);
    expect(body.html).not.toContain("localhost:3000/report");
  });
});
