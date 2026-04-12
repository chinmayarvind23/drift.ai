import type { DriftTransaction } from "@drift/core";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface PlaidLinkTokenResponse {
  link_token: string;
}

export interface PlaidExchangeResponse {
  access_token: string;
  item_id: string;
}

export interface PlaidSandboxPublicTokenResponse {
  public_token: string;
}

export interface PlaidSyncResponse {
  added?: PlaidTransaction[];
  modified?: PlaidTransaction[];
  removed?: Array<{ transaction_id: string }>;
  next_cursor?: string;
  has_more?: boolean;
}

export interface PlaidTransaction {
  transaction_id: string;
  date: string;
  name: string;
  merchant_name?: string | null;
  amount: number;
  category?: string[] | null;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
}

export interface PreparedPlaidTransactions {
  transactions: DriftTransaction[];
  hasEnoughHistory: boolean;
  message: string;
}

export async function createPlaidLinkToken(userId: string): Promise<string> {
  const response = await postJson<PlaidLinkTokenResponse>("/plaid/link-token", {
    user_id: userId
  });

  return response.link_token;
}

export async function createSandboxPublicToken(userId: string): Promise<string> {
  const response = await postJson<PlaidSandboxPublicTokenResponse>("/plaid/sandbox/public-token", {
    user_id: userId
  });

  return response.public_token;
}

export async function exchangePlaidPublicToken(publicToken: string): Promise<PlaidExchangeResponse> {
  return postJson<PlaidExchangeResponse>("/plaid/exchange-token", {
    public_token: publicToken
  });
}

export async function syncPlaidTransactions(accessToken: string): Promise<PlaidSyncResponse> {
  return postJson<PlaidSyncResponse>("/plaid/sync", {
    access_token: accessToken
  });
}

export function normalizePlaidTransactions(
  transactions: PlaidTransaction[]
): DriftTransaction[] {
  return transactions.reduce<DriftTransaction[]>((normalizedTransactions, transaction) => {
    const amountCents = Math.round(transaction.amount * 100);

    if (amountCents <= 0) {
      return normalizedTransactions;
    }

    normalizedTransactions.push({
      id: hashPlaidTransactionId(transaction.transaction_id),
      transactionDate: transaction.date,
      merchantName: transaction.merchant_name ?? transaction.name,
      amountCents,
      category: mapPlaidCategory(transaction),
      sourceHash: hashPlaidTransactionId(transaction.transaction_id),
      source: "plaid"
    });

    return normalizedTransactions;
  }, []);
}

export function hashPlaidTransactionId(transactionId: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < transactionId.length; index += 1) {
    hash ^= transactionId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `plaid_${(hash >>> 0).toString(36)}`;
}

export function preparePlaidTransactionsForScan(
  transactions: DriftTransaction[]
): PreparedPlaidTransactions {
  const monthCount = new Set(
    transactions.map((transaction) => transaction.transactionDate.slice(0, 7))
  ).size;

  if (monthCount >= 6) {
    return {
      transactions,
      hasEnoughHistory: true,
      message: `Synced ${transactions.length} Plaid transactions locally.`
    };
  }

  if (transactions.length === 0) {
    return {
      transactions,
      hasEnoughHistory: false,
      message: "Plaid synced no spending transactions yet. Try again after sandbox data finishes loading."
    };
  }

  return {
    transactions,
    hasEnoughHistory: false,
    message: `Plaid returned only ${monthCount} month${monthCount === 1 ? "" : "s"} of spending history. Drift needs at least 6 months to calculate a real old-normal vs recent-normal scan.`
  };
}

async function postJson<TResponse>(path: string, body: object): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string; detail?: string };
    return payload.message ?? payload.detail ?? `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}

function mapPlaidCategory(transaction: PlaidTransaction): string {
  const detailed = transaction.personal_finance_category?.detailed ?? "";
  const primary = transaction.personal_finance_category?.primary ?? "";
  const legacyCategory = transaction.category?.[0] ?? "";
  const rawCategory = `${detailed} ${primary} ${legacyCategory}`.toUpperCase();

  if (rawCategory.includes("RESTAURANT") || rawCategory.includes("FOOD_AND_DRINK")) {
    return "Dining";
  }
  if (rawCategory.includes("GENERAL_MERCHANDISE") || rawCategory.includes("SHOPS")) {
    return "Shopping";
  }
  if (rawCategory.includes("TRANSPORT") || rawCategory.includes("TAXI")) {
    return "Rides";
  }
  if (rawCategory.includes("GROCER")) {
    return "Groceries";
  }
  if (rawCategory.includes("ENTERTAINMENT")) {
    return "Entertainment";
  }
  if (rawCategory.includes("TRAVEL")) {
    return "Travel";
  }

  return "Other";
}
