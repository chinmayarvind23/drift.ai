import { describe, expect, it } from "vitest";
import { buildReportReminderHtml, getReportEmailConfig } from "../lib/report-email";

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
  it("links back to the report without including raw transactions", () => {
    const html = buildReportReminderHtml(
      {
        email: "maya@example.com",
        intent: "report",
        created_at: "2026-04-13T00:00:00.000Z"
      },
      "http://localhost:3000"
    );

    expect(html).toMatch(/Open your report/);
    expect(html).toMatch(/http:\/\/localhost:3000\/report/);
    expect(html).toMatch(/Raw transaction rows are not included/);
  });
});
