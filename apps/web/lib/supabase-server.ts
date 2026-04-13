import { createClient } from "@supabase/supabase-js";

export interface SupabaseServerConfig {
  url: string;
  publishableKey: string | null;
  secretKey: string;
}

export function getSupabaseServerConfig(
  env: Record<string, string | undefined> = process.env
): SupabaseServerConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  const secretKey =
    env.NEXT_SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    return null;
  }

  return {
    url,
    publishableKey,
    secretKey
  };
}

export function isSupabaseConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return getSupabaseServerConfig(env) !== null;
}

export function createSupabaseServiceClient(env: Record<string, string | undefined> = process.env) {
  const config = getSupabaseServerConfig(env);

  if (!config) {
    return null;
  }

  return createClient(config.url, config.secretKey, {
    auth: {
      persistSession: false
    }
  });
}
