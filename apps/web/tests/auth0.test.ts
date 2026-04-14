import { describe, expect, it } from "vitest";
import {
  buildAuthActionHref,
  buildPostAuthRedirectUrl,
  normalizeAuthReturnTo
} from "../lib/auth-navigation";
import { getAuth0Config, isAuth0Configured } from "../lib/auth0";

describe("getAuth0Config", () => {
  it("accepts the Auth0 env names used in local setup", () => {
    expect(
      getAuth0Config({
        AUTH0_SECRET: "secret",
        AUTH0_CLIENT_ID: "client-id",
        AUTH0_CLIENT_SECRET: "client-secret",
        AUTH0_DOMAIN: "example.us.auth0.com",
        AUTH0_BASE_URL: "http://localhost:3000/"
      })
    ).toMatchObject({
      domain: "example.us.auth0.com",
      appBaseUrl: "http://localhost:3000"
    });
  });

  it("requires the core Auth0 secrets before enabling auth", () => {
    expect(isAuth0Configured({})).toBe(false);
  });
});

describe("auth navigation", () => {
  it("builds explicit app return targets for Auth0 actions", () => {
    expect(buildAuthActionHref("login")).toBe("/auth/login?returnTo=%2F");
    expect(buildAuthActionHref("signup")).toBe(
      "/auth/login?returnTo=%2F&screen_hint=signup&prompt=login&max_age=0"
    );
    expect(buildAuthActionHref("google")).toBe(
      "/auth/login?returnTo=%2F&connection=google-oauth2"
    );
    expect(buildAuthActionHref("signup", "/", "https://drift.ai")).toBe(
      "https://drift.ai/auth/login?returnTo=%2F&screen_hint=signup&prompt=login&max_age=0"
    );
    expect(buildAuthActionHref("logout", "/account", "http://localhost:3000")).toBe(
      "http://localhost:3000/auth/logout?returnTo=http%3A%2F%2Flocalhost%3A3000%2F"
    );
  });

  it("keeps redirects inside the app instead of stale auth endpoints", () => {
    expect(normalizeAuthReturnTo("https://example.com")).toBe("/account");
    expect(normalizeAuthReturnTo("//example.com")).toBe("/account");
    expect(normalizeAuthReturnTo("/auth/callback")).toBe("/account");
    expect(normalizeAuthReturnTo("/report")).toBe("/report");
  });

  it("redirects callback errors back into Drift instead of rendering an Auth0 error", () => {
    expect(buildPostAuthRedirectUrl("http://localhost:3000", "/report", true)).toBe(
      "http://localhost:3000/report?auth=expired"
    );
    expect(buildPostAuthRedirectUrl("http://localhost:3000", "/auth/callback", false)).toBe(
      "http://localhost:3000/account?auth=complete"
    );
    expect(buildPostAuthRedirectUrl("http://localhost:3000", undefined, false)).toBe(
      "http://localhost:3000/?auth=complete"
    );
  });
});
