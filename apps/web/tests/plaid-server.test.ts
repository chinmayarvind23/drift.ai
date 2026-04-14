import { describe, expect, it } from "vitest";
import { buildOverspendCustomUser, getPlaidServerConfig, plaidIsConfigured } from "../lib/plaid-server";

describe("plaid server config", () => {
  it("reports Plaid as configured only when server-side credentials exist", () => {
    expect(plaidIsConfigured(getPlaidServerConfig({
      DRIFT_PLAID_CLIENT_ID: "client-id",
      DRIFT_PLAID_SECRET: "secret"
    }))).toBe(true);

    expect(plaidIsConfigured(getPlaidServerConfig({}))).toBe(false);
  });
});

describe("buildOverspendCustomUser", () => {
  it("creates multi-month sandbox spending with clear recent overspend", () => {
    const user = buildOverspendCustomUser(new Date("2026-04-13T00:00:00.000Z"));
    const transactions = user.override_accounts[0].transactions;
    const months = new Set(transactions.map((transaction) => transaction.date_posted.slice(0, 7)));

    expect(months.size).toBe(8);
    expect(transactions).toHaveLength(32);
    expect(transactions.filter((transaction) => transaction.description === "Sweetgreen Restaurant").map((transaction) => transaction.amount)).toEqual([
      55, 55, 55, 55, 145, 145, 145, 145
    ]);
  });
});
