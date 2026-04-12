import type { EditableDriftTransaction } from "./transaction-edits";

export const DEFAULT_EVIDENCE_PAGE_SIZE = 12;

export const DRIFT_CATEGORY_TAXONOMY = [
  "Dining",
  "Delivery",
  "Coffee",
  "Groceries",
  "Shopping",
  "Subscriptions",
  "Software",
  "Travel",
  "Rides",
  "Rent Adjacent",
  "Fitness",
  "Wellness",
  "Health",
  "Education",
  "Entertainment",
  "Home",
  "Utilities",
  "Other"
] as const;

export interface EvidenceFilters {
  category: string;
  search: string;
}

export interface EvidencePage {
  items: EditableDriftTransaction[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export function filterEvidenceTransactions(
  transactions: EditableDriftTransaction[],
  filters: EvidenceFilters
): EditableDriftTransaction[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return transactions.filter((transaction) => {
    const categoryMatches = filters.category === "all" || transaction.category === filters.category;
    const searchMatches =
      normalizedSearch.length === 0 ||
      transaction.merchantName.toLowerCase().includes(normalizedSearch) ||
      transaction.category.toLowerCase().includes(normalizedSearch) ||
      transaction.transactionDate.includes(normalizedSearch) ||
      transaction.note?.toLowerCase().includes(normalizedSearch);

    return categoryMatches && searchMatches;
  });
}

export function paginateEvidenceTransactions(
  transactions: EditableDriftTransaction[],
  requestedPage: number,
  pageSize = DEFAULT_EVIDENCE_PAGE_SIZE
): EvidencePage {
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Math.round(requestedPage)));
  const start = (page - 1) * pageSize;

  return {
    items: transactions.slice(start, start + pageSize),
    page,
    totalPages,
    totalItems: transactions.length
  };
}
