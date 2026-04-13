import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { buildAccountProfile } from "@/lib/account-sync";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: "Supabase backup is not configured."
    }, { status: 503 });
  }

  const session = auth0 ? await auth0.getSession() : null;
  const userId = session?.user?.sub;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in before backup restore." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("audit_snapshots")
    .select("scan_summary, behavior_insights, intercept_decisions, projection_scenario, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "No backup found for this account." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    snapshot: {
      scan_summary: data.scan_summary,
      behavior_insights: data.behavior_insights ?? {},
      intercept_decisions: data.intercept_decisions ?? [],
      projection_scenario: data.projection_scenario,
      updated_at: data.updated_at
    }
  });
}

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
  const userId = session?.user?.sub;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sign in before backup sync." }, { status: 401 });
  }

  const profile = buildAccountProfile(session.user);
  const { error: profileError } = await supabase.from("profiles").upsert(profile, {
    onConflict: "user_id"
  });

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
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
