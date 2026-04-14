import { describe, expect, it } from "vitest";
import { shouldCacheAccountStatus, shouldClearAccountStatus } from "../lib/account-bootstrap";

describe("account profile bootstrap", () => {
  it("caches signed-in account status after the profile exists", () => {
    expect(shouldCacheAccountStatus({ signedIn: true, hasAccount: true })).toBe(true);
    expect(shouldClearAccountStatus({ signedIn: true, hasAccount: true })).toBe(false);
  });

  it("clears stale account status when no signed-in account is available", () => {
    expect(shouldCacheAccountStatus({ signedIn: false, hasAccount: false })).toBe(false);
    expect(shouldClearAccountStatus({ signedIn: false, hasAccount: false })).toBe(true);
  });
});
