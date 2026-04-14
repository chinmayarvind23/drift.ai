export interface PlaidServerConfig {
  baseUrl: string;
  clientId?: string;
  secret?: string;
  products: string[];
  countryCodes: string[];
  clientName: string;
  daysRequested: number;
}

export class PlaidServerNotConfiguredError extends Error {}
export class PlaidProductNotReadyError extends Error {}

export function getPlaidServerConfig(
  env: Record<string, string | undefined> = process.env
): PlaidServerConfig {
  return {
    baseUrl: getPlaidBaseUrl(env.DRIFT_PLAID_ENVIRONMENT),
    clientId: env.DRIFT_PLAID_CLIENT_ID,
    secret: env.DRIFT_PLAID_SECRET,
    products: splitCsv(env.DRIFT_PLAID_PRODUCTS ?? "transactions"),
    countryCodes: splitCsv(env.DRIFT_PLAID_COUNTRY_CODES ?? "US"),
    clientName: env.DRIFT_PLAID_CLIENT_NAME ?? "Drift",
    daysRequested: Number(env.DRIFT_PLAID_TRANSACTIONS_DAYS_REQUESTED ?? 730)
  };
}

export function plaidIsConfigured(config = getPlaidServerConfig()): boolean {
  return Boolean(config.clientId && config.secret);
}

export async function createPlaidServerLinkToken(
  userId: string,
  config = getPlaidServerConfig()
): Promise<unknown> {
  ensurePlaidConfigured(config);

  return postPlaid("/link/token/create", {
    client_id: config.clientId,
    secret: config.secret,
    client_name: config.clientName,
    user: { client_user_id: userId },
    products: config.products,
    country_codes: config.countryCodes,
    language: "en",
    transactions: { days_requested: config.daysRequested }
  }, config);
}

export async function createPlaidServerSandboxPublicToken(
  config = getPlaidServerConfig()
): Promise<unknown> {
  ensurePlaidConfigured(config);
  const customUser = buildOverspendCustomUser();
  const transactions = customUser.override_accounts[0].transactions;

  return postPlaid("/sandbox/public_token/create", {
    client_id: config.clientId,
    secret: config.secret,
    institution_id: "ins_109508",
    initial_products: config.products,
    options: {
      override_username: "user_custom",
      override_password: JSON.stringify(customUser),
      transactions: {
        start_date: transactions[0]?.date_posted,
        end_date: new Date().toISOString().slice(0, 10)
      }
    }
  }, config);
}

export async function exchangePlaidServerPublicToken(
  publicToken: string,
  config = getPlaidServerConfig()
): Promise<unknown> {
  ensurePlaidConfigured(config);

  return postPlaid("/item/public_token/exchange", {
    client_id: config.clientId,
    secret: config.secret,
    public_token: publicToken
  }, config);
}

export async function syncPlaidServerTransactions(
  accessToken: string,
  cursor?: string,
  config = getPlaidServerConfig()
): Promise<unknown> {
  ensurePlaidConfigured(config);

  const syncResponse = await postPlaid("/transactions/sync", {
    client_id: config.clientId,
    secret: config.secret,
    access_token: accessToken,
    ...(cursor ? { cursor } : {})
  }, config) as Record<string, unknown>;

  if (cursor) {
    return syncResponse;
  }

  const transactionsResponse = await getPlaidTransactionsWhenReady(accessToken, config);

  return {
    ...syncResponse,
    added: Array.isArray(transactionsResponse.transactions)
      ? transactionsResponse.transactions
      : syncResponse.added,
    modified: syncResponse.modified ?? [],
    removed: syncResponse.removed ?? []
  };
}

export function buildOverspendCustomUser(anchor = new Date()): {
  override_accounts: Array<{
    type: string;
    subtype: string;
    starting_balance: number;
    transactions: Array<{
      date_transacted: string;
      date_posted: string;
      currency: string;
      amount: number;
      description: string;
    }>;
  }>;
} {
  const months = completeMonthsBefore(anchor, 8);
  const transactions = months.flatMap((month, index) => {
    const recent = index >= 4;

    return [
      buildCustomTransaction(month, 4, recent ? 145 : 55, "Sweetgreen Restaurant"),
      buildCustomTransaction(month, 9, recent ? 118 : 42, "Uber Trip"),
      buildCustomTransaction(month, 14, recent ? 185 : 65, "Target Store"),
      buildCustomTransaction(month, 19, 110, "Whole Foods Market")
    ];
  });

  return {
    override_accounts: [
      {
        type: "depository",
        subtype: "checking",
        starting_balance: 15000,
        transactions
      }
    ]
  };
}

async function getPlaidTransactionsWhenReady(
  accessToken: string,
  config: PlaidServerConfig
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await getPlaidTransactions(accessToken, config);
      const transactions = response.transactions;

      if (
        attempt === 2 ||
        (Array.isArray(transactions) && hasEnoughMonths(transactions as Array<Record<string, unknown>>))
      ) {
        return response;
      }
    } catch (error) {
      if (!(error instanceof PlaidProductNotReadyError) || attempt === 2) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { transactions: [] };
}

async function getPlaidTransactions(
  accessToken: string,
  config: PlaidServerConfig
): Promise<Record<string, unknown>> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - config.daysRequested);

  return postPlaid("/transactions/get", {
    client_id: config.clientId,
    secret: config.secret,
    access_token: accessToken,
    start_date: startDate.toISOString().slice(0, 10),
    end_date: endDate.toISOString().slice(0, 10),
    options: { count: 500, offset: 0 }
  }, config) as Promise<Record<string, unknown>>;
}

async function postPlaid(path: string, payload: object, config: PlaidServerConfig): Promise<unknown> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (response.status === 400) {
    const body = await safeJson(response);

    if (body.error_code === "PRODUCT_NOT_READY") {
      throw new PlaidProductNotReadyError("Plaid Transactions is not ready yet.");
    }
  }

  if (!response.ok) {
    const body = await safeJson(response);
    throw new Error(body.error_message ?? body.message ?? `Plaid request failed with ${response.status}`);
  }

  return response.json();
}

function ensurePlaidConfigured(config: PlaidServerConfig): void {
  if (!plaidIsConfigured(config)) {
    throw new PlaidServerNotConfiguredError("Plaid sandbox credentials are not configured.");
  }
}

function getPlaidBaseUrl(environment = "sandbox"): string {
  if (environment === "production") {
    return "https://production.plaid.com";
  }

  if (environment === "development") {
    return "https://development.plaid.com";
  }

  return "https://sandbox.plaid.com";
}

function buildCustomTransaction(
  month: Date,
  day: number,
  amount: number,
  description: string
) {
  const transacted = new Date(month);
  transacted.setDate(day);
  const posted = new Date(transacted);
  posted.setDate(day + 1);

  return {
    date_transacted: transacted.toISOString().slice(0, 10),
    date_posted: posted.toISOString().slice(0, 10),
    currency: "USD",
    amount,
    description
  };
}

function completeMonthsBefore(anchor: Date, count: number): Date[] {
  const firstOfCurrentMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const months: Date[] = [];
  let cursor = addMonths(firstOfCurrentMonth, -count);

  for (let index = 0; index < count; index += 1) {
    months.push(new Date(cursor));
    cursor = addMonths(cursor, 1);
  }

  return months;
}

function addMonths(value: Date, months: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + months, value.getDate());
}

function hasEnoughMonths(transactions: Array<Record<string, unknown>>): boolean {
  return new Set(
    transactions.map((transaction) => String(transaction.date ?? "").slice(0, 7))
  ).size >= 2;
}

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function safeJson(response: Response): Promise<Record<string, string>> {
  try {
    return await response.json() as Record<string, string>;
  } catch {
    return {};
  }
}
