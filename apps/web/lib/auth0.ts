import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";
import { buildPostAuthRedirectUrl } from "./auth-navigation";

export interface Auth0RuntimeConfig {
  domain: string;
  appBaseUrl: string | undefined;
  clientId: string;
  clientSecret: string;
  secret: string;
}

export function isAuth0Configured(env: Record<string, string | undefined> = process.env): boolean {
  return getAuth0Config(env) !== null;
}

export function getAuth0Config(
  env: Record<string, string | undefined> = process.env
): Auth0RuntimeConfig | null {
  const domain = resolveAuth0Domain(env);

  if (!env.AUTH0_SECRET || !env.AUTH0_CLIENT_ID || !env.AUTH0_CLIENT_SECRET || !domain) {
    return null;
  }

  return {
    domain,
    appBaseUrl: normalizeAppBaseUrl(env.APP_BASE_URL ?? env.AUTH0_BASE_URL),
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    secret: env.AUTH0_SECRET
  };
}

function normalizeAppBaseUrl(value: string | undefined): string | undefined {
  return value?.replace(/\/$/, "");
}

function resolveAuth0Domain(env: Record<string, string | undefined>): string | null {
  if (env.AUTH0_DOMAIN) {
    return env.AUTH0_DOMAIN;
  }

  if (!env.AUTH0_ISSUER_BASE_URL) {
    return null;
  }

  return env.AUTH0_ISSUER_BASE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const auth0Config = getAuth0Config();

interface AuthCallbackContext {
  appBaseUrl?: string;
  returnTo?: string;
}

const onCallback = async (error: unknown, ctx: AuthCallbackContext) => {
  const appBaseUrl = ctx.appBaseUrl ?? auth0Config?.appBaseUrl;

  if (!appBaseUrl) {
    return new NextResponse("Auth callback could not resolve the app URL.", {
      status: 500
    });
  }

  const redirectUrl = buildPostAuthRedirectUrl(appBaseUrl, ctx.returnTo, Boolean(error));
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("Cache-Control", "no-store");
  return response;
};

export const auth0 = auth0Config
  ? new Auth0Client({
      domain: auth0Config.domain,
      appBaseUrl: auth0Config.appBaseUrl,
      clientId: auth0Config.clientId,
      clientSecret: auth0Config.clientSecret,
      secret: auth0Config.secret,
      signInReturnToPath: "/",
      logoutStrategy: "v2",
      onCallback
    })
  : null;
