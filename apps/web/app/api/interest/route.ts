import { NextResponse } from "next/server";
import { buildInterestLead } from "@/lib/account-sync";
import { getReportEmailConfig, sendReportReminderEmail } from "@/lib/report-email";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; intent?: "report" | "early_access" };
    const lead = buildInterestLead(body.email ?? "", body.intent ?? "early_access");
    const supabase = createSupabaseServiceClient();
    const emailConfig = body.intent === "report" ? getReportEmailConfig() : null;
    const emailResult = emailConfig
      ? await sendReportReminderEmail(lead, emailConfig)
      : { sent: false };

    if (!supabase) {
      return NextResponse.json({
        ok: true,
        storage: "local_only",
        lead,
        emailSent: emailResult.sent,
        emailError: emailResult.error
      });
    }

    const { error } = await supabase.from("interest_leads").insert(lead);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      storage: "supabase",
      emailSent: emailResult.sent,
      emailError: emailResult.error
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not save interest." },
      { status: 400 }
    );
  }
}
