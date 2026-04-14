import { describe, expect, it } from "vitest";
import {
  ACCOUNT_STATUS_STORAGE_KEY,
  clearCachedAccountStatus,
  readCachedAccountStatus,
  writeCachedAccountStatus
} from "../lib/account-status-cache";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

describe("account status cache", () => {
  it("remembers only account statuses that can unlock reports", () => {
    const storage = createMemoryStorage();

    writeCachedAccountStatus(storage, { signedIn: true, hasAccount: true });
    expect(readCachedAccountStatus(storage)).toEqual({ signedIn: true, hasAccount: true });

    writeCachedAccountStatus(storage, { signedIn: false, hasAccount: false });
    expect(readCachedAccountStatus(storage)).toBeNull();
  });

  it("clears the cached account status on logout", () => {
    const storage = createMemoryStorage();

    storage.setItem(ACCOUNT_STATUS_STORAGE_KEY, JSON.stringify({ signedIn: true, hasAccount: true }));
    clearCachedAccountStatus(storage);

    expect(readCachedAccountStatus(storage)).toBeNull();
  });
});
