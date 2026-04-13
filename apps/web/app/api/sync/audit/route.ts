import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: "Supabase backup is not configured."
    }, { status: 503 });
  }

  const session = auth0 ? await auth0.getSession() : null;
  const body = await request.json();
  const userId = session?.user?.sub ?? body.user_id;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in before backup sync." }, { status: 401 });
  }

  const record = {
    user_id: userId,
    scan_summary: body.scan_summary,
    behavior_insights: body.behavior_insights,
    intercept_decisions: body.intercept_decisions,
    projection_scenario: body.projection_scenario
  };
  const { error } = await supabase.from("audit_snapshots").upsert(record, {
    onConflict: "user_id"
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, configured: true });
}
