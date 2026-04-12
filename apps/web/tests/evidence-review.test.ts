import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVIDENCE_PAGE_SIZE,
  DRIFT_CATEGORY_TAXONOMY,
  filterEvidenceTransactions,
  paginateEvidenceTransactions
} from "../lib/evidence-review";
import type { EditableDriftTransaction } from "../lib/transaction-edits";

function transaction(
  sourceHash: string,
  category: string,
  merchantName = `${category} merchant`
): EditableDriftTransaction {
  return {
    transactionDate: "2026-03-15",
    merchantName,
    amountCents: 1000,
    category,
    sourceHash,
    source: "seed"
  };
}

describe("DRIFT_CATEGORY_TAXONOMY", () => {
  it("includes stable categories beyond the current visible evidence rows", () => {
    expect(DRIFT_CATEGORY_TAXONOMY).toContain("Travel");
    expect(DRIFT_CATEGORY_TAXONOMY).toContain("Health");
    expect(DRIFT_CATEGORY_TAXONOMY).toContain("Education");
  });
});

describe("filterEvidenceTransactions", () => {
  it("filters by category and merchant search", () => {
    const transactions = [
      transaction("1", "Dining", "Bar Luce"),
      transaction("2", "Groceries", "Local Market"),
      transaction("3", "Dining", "Cafe Alma")
    ];

    const filtered = filterEvidenceTransactions(transactions, {
      category: "Dining",
      search: "cafe"
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].merchantName).toBe("Cafe Alma");
  });
});

describe("paginateEvidenceTransactions", () => {
  it("returns the requested page and clamps out-of-range pages", () => {
    const transactions = Array.from({ length: DEFAULT_EVIDENCE_PAGE_SIZE + 3 }, (_, index) =>
      transaction(String(index), "Dining")
    );

    const pageOne = paginateEvidenceTransactions(transactions, 1);
    const outOfRange = paginateEvidenceTransactions(transactions, 99);

    expect(pageOne.items).toHaveLength(DEFAULT_EVIDENCE_PAGE_SIZE);
    expect(pageOne.totalPages).toBe(2);
    expect(outOfRange.page).toBe(2);
    expect(outOfRange.items).toHaveLength(3);
  });
});
