import type { DriftTransaction } from "@drift/core";

export interface EditableDriftTransaction extends DriftTransaction {
  note?: string;
  originalCategory?: string;
}

export interface TransactionEdit {
  category?: string;
  note?: string;
}

export function applyTransactionEdits(
  transactions: DriftTransaction[],
  edits: Record<string, TransactionEdit>
): EditableDriftTransaction[] {
  return transactions.map((transaction) => {
    const key = transaction.sourceHash;
    const edit = edits[key];

    if (!edit) {
      return { ...transaction };
    }

    const nextCategory = edit.category?.trim() || transaction.category;
    const nextNote = edit.note?.trim();

    return {
      ...transaction,
      category: nextCategory,
      ...(nextCategory !== transaction.category ? { originalCategory: transaction.category } : {}),
      ...(nextNote ? { note: nextNote } : {})
    };
  });
}
