import type { InterestLead } from "./account-sync";
import { createReportPdfBase64, type ReportPdfInput } from "./report-pdf";

export interface ReportEmailConfig {
  apiKey: string;
  from: string;
  appBaseUrl: string;
}

export function getReportEmailConfig(
  env: Record<string, string | undefined> = process.env
): ReportEmailConfig | null {
  const apiKey = env.RESEND_API_KEY;
  const appBaseUrl = env.APP_BASE_URL ?? env.AUTH0_BASE_URL;

  if (!apiKey || !appBaseUrl) {
    return null;
  }

  return {
    apiKey,
    appBaseUrl,
    from: env.DRIFT_REPORT_EMAIL_FROM ?? "Drift <onboarding@resend.dev>"
  };
}

export function buildReportReminderHtml(lead: InterestLead): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827">
      <h1 style="font-size:22px;margin:0 0 12px">Your Drift Scan is ready</h1>
      <p>Your private Drift Scan PDF is attached to this email.</p>
      <p>Use it to revisit the drift patterns, behavior note, recovery path, and what-if estimate you created.</p>
      <p style="font-size:12px;color:#6b7280">Sent to ${lead.email}. Raw transaction rows are not included in this email.</p>
    </div>
  `;
}

export async function sendReportReminderEmail(
  lead: InterestLead,
  config: ReportEmailConfig,
  report?: ReportPdfInput
): Promise<{ sent: boolean; error?: string }> {
  const attachments = report
    ? [
        {
          filename: "drift-scan-report.pdf",
          content: await createReportPdfBase64(report)
        }
      ]
    : undefined;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.from,
      to: lead.email,
      subject: "Your Drift Scan report",
      html: buildReportReminderHtml(lead),
      ...(attachments ? { attachments } : {})
    })
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    return {
      sent: false,
      error: body.message ?? "Could not send report email."
    };
  }

  return {
    sent: true
  };
}
