import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseTransactionsCsv } from "@drift/core";
import { buildDriftScan } from "../lib/drift-scan";
import { applyTransactionEdits, type TransactionEdit } from "../lib/transaction-edits";
import type { DriftTransaction } from "@drift/core";

function transaction(month: string, category: string, amountCents: number): DriftTransaction {
  const sourceHash = `${month}-${category}-${amountCents}`;

  return {
    id: sourceHash,
    transactionDate: `${month}-15`,
    merchantName: `${category} merchant`,
    amountCents,
    category,
    sourceHash,
    source: "seed"
  };
}

describe("applyTransactionEdits", () => {
  it("applies category and note edits without mutating the original transactions", () => {
    const transactions = [
      transaction("2025-07", "Dining", 10_000),
      transaction("2026-01", "Dining", 30_000)
    ];
    const edits: Record<string, TransactionEdit> = {
      [transactions[1].sourceHash]: {
        category: "Travel",
        note: "Client trip, not a dining habit."
      }
    };

    const editedTransactions = applyTransactionEdits(transactions, edits);

    expect(editedTransactions[1]).toMatchObject({
      category: "Travel",
      note: "Client trip, not a dining habit.",
      originalCategory: "Dining"
    });
    expect(transactions[1]).toMatchObject({
      category: "Dining"
    });
  });

  it("changes the scan when a mistaken transaction category is corrected", () => {
    const transactions = [
      transaction("2025-07", "Dining", 10_000),
      transaction("2025-08", "Dining", 10_000),
      transaction("2025-09", "Dining", 10_000),
      transaction("2026-01", "Dining", 30_000),
      transaction("2026-02", "Dining", 30_000),
      transaction("2026-03", "Dining", 30_000)
    ];
    const editedTransactions = applyTransactionEdits(transactions, {
      [transactions[3].sourceHash]: {
        category: "Travel",
        note: "One-time flight."
      },
      [transactions[4].sourceHash]: {
        category: "Travel",
        note: "One-time hotel."
      },
      [transactions[5].sourceHash]: {
        category: "Travel",
        note: "One-time conference."
      }
    });

    const originalScan = buildDriftScan(transactions, "Original");
    const editedScan = buildDriftScan(editedTransactions, "Edited");

    expect(originalScan.monthlyOverspendCents).toBe(20_000);
    expect(editedScan.monthlyOverspendCents).toBe(0);
  });

  it("recalculates reward fixture overspend when a recent grocery transaction is moved to rides", () => {
    const csv = readFileSync(new URL("./fixtures/reward-dining-drift.csv", import.meta.url), "utf8");
    const transactions = parseTransactionsCsv(csv);
    const metroMarketFebruary = transactions.find(
      (item) => item.merchantName === "Metro Market" && item.transactionDate === "2026-02-05"
    );

    expect(metroMarketFebruary).toBeDefined();

    const editedTransactions = applyTransactionEdits(transactions, {
      [metroMarketFebruary!.sourceHash]: {
        category: "Rides"
      }
    });
    const originalScan = buildDriftScan(transactions, "Imported CSV");
    const editedScan = buildDriftScan(editedTransactions, "Imported CSV");

    expect(originalScan.monthlyOverspendLabel).toBe("$80");
    expect(editedScan.monthlyOverspendLabel).toBe("$213");
    expect(editedScan.topCategories[0]).toMatchObject({
      category: "Rides",
      baselineLabel: "$20",
      recentLabel: "$153",
      monthlyOverspendLabel: "$133"
    });
    expect(editedScan.topCategories[1]).toMatchObject({
      category: "Dining",
      monthlyOverspendLabel: "$80"
    });
  });
});
