import { describe, expect, it } from "vitest";
import { getInitialThemeFromCookie, serializeThemeCookie } from "../lib/theme-cookie";

describe("theme cookie", () => {
  it("reads the saved theme before the client hydrates", () => {
    expect(getInitialThemeFromCookie("drift.theme=dark")).toBe("dark");
    expect(getInitialThemeFromCookie("drift.theme=light")).toBe("light");
  });

  it("serializes a long-lived non-sensitive theme cookie", () => {
    expect(serializeThemeCookie("dark")).toContain("drift.theme=dark");
    expect(serializeThemeCookie("dark")).toContain("SameSite=Lax");
  });
});
