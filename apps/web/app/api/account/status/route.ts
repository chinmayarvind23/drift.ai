import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { buildAccountProfile } from "@/lib/account-sync";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = auth0 ? await auth0.getSession() : null;

  if (!session?.user?.sub) {
    return NextResponse.json({
      signedIn: false,
      hasAccount: false,
      email: null
    });
  }

  const supabase = createSupabaseServiceClient();
  const profile = buildAccountProfile(session.user);

  if (supabase) {
    const { error } = await supabase.from("profiles").upsert(profile, {
      onConflict: "user_id"
    });

    if (error) {
      return NextResponse.json(
        {
          signedIn: true,
          hasAccount: false,
          email: session.user.email ?? null,
          error: error.message
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    signedIn: true,
    hasAccount: true,
    email: session.user.email ?? null,
    name: session.user.name ?? null
  });
}
