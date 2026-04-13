export const DEFAULT_AUTH_RETURN_TO = "/";

export type AuthAction = "login" | "signup" | "google" | "logout";

export function normalizeAuthReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) {
    return DEFAULT_AUTH_RETURN_TO;
  }

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/account";
  }

  if (returnTo.startsWith("/auth/")) {
    return "/account";
  }

  return returnTo;
}

export function buildAuthActionHref(
  action: AuthAction,
  returnTo: string = DEFAULT_AUTH_RETURN_TO,
  origin?: string
): string {
  const safeReturnTo = normalizeAuthReturnTo(returnTo);

  if (action === "logout") {
    const logoutReturnTo = origin ? new URL(safeReturnTo, origin).toString() : safeReturnTo;
    return `/auth/logout?returnTo=${encodeURIComponent(logoutReturnTo)}`;
  }

  const params = new URLSearchParams({
    returnTo: safeReturnTo
  });

  if (action === "signup") {
    params.set("screen_hint", "signup");
  }

  if (action === "google") {
    params.set("connection", "google-oauth2");
  }

  return `/auth/login?${params.toString()}`;
}

export function buildPostAuthRedirectUrl(
  appBaseUrl: string,
  returnTo: string | null | undefined,
  hadError = false
): string {
  const safeReturnTo = normalizeAuthReturnTo(returnTo);
  const url = new URL(safeReturnTo, appBaseUrl);

  if (hadError) {
    url.searchParams.set("auth", "expired");
  } else {
    url.searchParams.set("auth", "complete");
  }

  return url.toString();
}
