import { canGenerateReport, type AccountStatus } from "./account-sync";

export function shouldCacheAccountStatus(status: AccountStatus): boolean {
  return canGenerateReport(status);
}

export function shouldClearAccountStatus(status: AccountStatus): boolean {
  return !canGenerateReport(status);
}
