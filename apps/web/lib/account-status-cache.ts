import { canGenerateReport, type AccountStatus } from "./account-sync";

export const ACCOUNT_STATUS_STORAGE_KEY = "drift.account.status.v1";

export function readCachedAccountStatus(storage: Pick<Storage, "getItem">): AccountStatus | null {
  try {
    const parsed = JSON.parse(storage.getItem(ACCOUNT_STATUS_STORAGE_KEY) ?? "null") as AccountStatus | null;

    return parsed && canGenerateReport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedAccountStatus(
  storage: Pick<Storage, "removeItem" | "setItem">,
  status: AccountStatus
) {
  if (!canGenerateReport(status)) {
    storage.removeItem(ACCOUNT_STATUS_STORAGE_KEY);
    return;
  }

  storage.setItem(ACCOUNT_STATUS_STORAGE_KEY, JSON.stringify(status));
}

export function clearCachedAccountStatus(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(ACCOUNT_STATUS_STORAGE_KEY);
}
