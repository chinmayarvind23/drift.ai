export type StoredTheme = "light" | "dark";

export const THEME_COOKIE_NAME = "drift.theme";

export function getInitialThemeFromCookie(cookieHeader?: string | null): StoredTheme | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const themeCookie = cookies.find((cookie) => cookie.startsWith(`${THEME_COOKIE_NAME}=`));
  const value = themeCookie?.split("=")[1];

  return value === "dark" || value === "light" ? value : null;
}

export function serializeThemeCookie(theme: StoredTheme): string {
  return `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
