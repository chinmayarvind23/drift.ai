import { NextResponse } from "next/server";
import { buildInterestLead } from "@/lib/account-sync";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; intent?: "report" | "early_access" };
    const lead = buildInterestLead(body.email ?? "", body.intent ?? "early_access");
    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return NextResponse.json({
        ok: true,
        storage: "local_only",
        lead
      });
    }

    const { error } = await supabase.from("interest_leads").insert(lead);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, storage: "supabase" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not save interest." },
      { status: 400 }
    );
  }
}
