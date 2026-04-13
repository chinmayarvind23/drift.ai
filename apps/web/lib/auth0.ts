import { Auth0Client } from "@auth0/nextjs-auth0/server";

export function isAuth0Configured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(
    env.AUTH0_SECRET &&
      env.AUTH0_CLIENT_ID &&
      env.AUTH0_CLIENT_SECRET &&
      (env.AUTH0_DOMAIN || env.AUTH0_ISSUER_BASE_URL)
  );
}

function resolveAuth0Domain(env: Record<string, string | undefined>): string | undefined {
  if (env.AUTH0_DOMAIN) {
    return env.AUTH0_DOMAIN;
  }

  if (!env.AUTH0_ISSUER_BASE_URL) {
    return undefined;
  }

  return env.AUTH0_ISSUER_BASE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export const auth0 = isAuth0Configured()
  ? new Auth0Client({
      domain: resolveAuth0Domain(process.env),
      appBaseUrl: process.env.APP_BASE_URL ?? process.env.AUTH0_BASE_URL,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      secret: process.env.AUTH0_SECRET,
      signInReturnToPath: "/account"
    })
  : null;
