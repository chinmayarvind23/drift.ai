import { describe, expect, it } from "vitest";
import { hashPlaidTransactionId, preparePlaidTransactionsForScan, normalizePlaidTransactions } from "../lib/plaid-api";

describe("normalizePlaidTransactions", () => {
  it("converts Plaid sync transactions into Drift transactions", () => {
    const transactions = normalizePlaidTransactions([
      {
        transaction_id: "txn-1",
        date: "2026-03-15",
        name: "BAR LUCE",
        merchant_name: "Bar Luce",
        amount: 42.35,
        personal_finance_category: {
          primary: "FOOD_AND_DRINK",
          detailed: "FOOD_AND_DRINK_RESTAURANT"
        }
      }
    ]);

    expect(transactions).toEqual([
      {
        id: hashPlaidTransactionId("txn-1"),
        transactionDate: "2026-03-15",
        merchantName: "Bar Luce",
        amountCents: 4235,
        category: "Dining",
        sourceHash: hashPlaidTransactionId("txn-1"),
        source: "plaid"
      }
    ]);
  });

  it("ignores credits because Drift scans spending drift", () => {
    const transactions = normalizePlaidTransactions([
      {
        transaction_id: "txn-2",
        date: "2026-03-15",
        name: "Payroll",
        amount: -5000
      }
    ]);

    expect(transactions).toEqual([]);
  });

  it("uses Plaid merchant text when custom sandbox transactions are not enriched yet", () => {
    const transactions = normalizePlaidTransactions([
      {
        transaction_id: "txn-3",
        date: "2026-03-16",
        name: "Sweetgreen Restaurant",
        amount: 145
      },
      {
        transaction_id: "txn-4",
        date: "2026-03-17",
        name: "Uber Trip",
        amount: 118
      }
    ]);

    expect(transactions.map((transaction) => transaction.category)).toEqual(["Dining", "Rides"]);
  });
});

describe("hashPlaidTransactionId", () => {
  it("does not expose raw Plaid transaction IDs", () => {
    const hashedId = hashPlaidTransactionId("txn-secret");

    expect(hashedId).not.toContain("txn-secret");
    expect(hashedId).toMatch(/^plaid_[a-z0-9]+$/);
  });
});

describe("preparePlaidTransactionsForScan", () => {
  it("keeps real Plaid history when there are at least two months to compare", () => {
    const transactions = Array.from({ length: 2 }, (_, index) => ({
      id: `txn-${index}`,
      transactionDate: `2026-0${index + 3}-15`,
      merchantName: "Bar Luce",
      amountCents: 4000,
      category: "Dining",
      sourceHash: `plaid-txn-${index}`,
      source: "plaid" as const
    }));

    const prepared = preparePlaidTransactionsForScan(transactions);

    expect(prepared.transactions).toEqual(transactions);
    expect(prepared.hasEnoughHistory).toBe(true);
  });

  it("keeps one-month Plaid history real and explains why Drift cannot scan it yet", () => {
    const prepared = preparePlaidTransactionsForScan([
      {
        id: "txn-1",
        transactionDate: "2026-04-01",
        merchantName: "Bar Luce",
        amountCents: 9000,
        category: "Dining",
        sourceHash: "plaid-txn-1",
        source: "plaid"
      },
      {
        id: "txn-2",
        transactionDate: "2026-04-02",
        merchantName: "Target",
        amountCents: 7000,
        category: "Shopping",
        sourceHash: "plaid-txn-2",
        source: "plaid"
      }
    ]);

    expect(prepared.hasEnoughHistory).toBe(false);
    expect(new Set(prepared.transactions.map((transaction) => transaction.transactionDate.slice(0, 7))).size).toBe(1);
    expect(prepared.message).toMatch(/needs at least 2 months/i);
    expect(prepared.transactions[0]).toMatchObject({
      merchantName: "Bar Luce",
      category: "Dining",
      source: "plaid"
    });
  });
});
