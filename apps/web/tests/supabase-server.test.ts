import { describe, expect, it } from "vitest";
import { getSupabaseServerConfig, isSupabaseConfigured } from "../lib/supabase-server";

describe("getSupabaseServerConfig", () => {
  it("accepts current Supabase publishable and secret key env names", () => {
    const config = getSupabaseServerConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      NEXT_SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test"
    });

    expect(config).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
      secretKey: "sb_secret_test"
    });
  });

  it("also accepts legacy-compatible env names", () => {
    expect(
      isSupabaseConfigured({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service"
      })
    ).toBe(true);
  });
});
