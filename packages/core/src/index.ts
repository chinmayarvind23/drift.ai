export type TransactionSource = "csv" | "plaid" | "seed";

export interface DriftTransaction {
  id?: string;
  transactionDate: string;
  merchantName: string;
  amountCents: number;
  category: string;
  sourceHash: string;
  source: TransactionSource;
}

export type DriftState = "stable" | "watch" | "high_drift";

export interface CategoryDrift {
  category: string;
  baselineMonthlyCents: number;
  recentMonthlyCents: number;
  monthlyOverspendCents: number;
  driftPercent: number;
  driftState: DriftState;
}

export interface DriftAnalysis {
  driftScore: number;
  categories: CategoryDrift[];
  baselineMonths: string[];
  recentMonths: string[];
}

export interface DriftAnalysisOptions {
  baselineMonths?: number;
  recentMonths?: number;
}

export interface CounterfactualInput {
  monthlyOverspendCents: number;
  years: number;
  annualReturnRate: number;
}

export interface CounterfactualProjection {
  monthlyOverspendCents: number;
  years: number;
  annualReturnRate: number;
  principalCents: number;
  projectedValueCents: number;
  projectedGainCents: number;
}

const REQUIRED_CSV_HEADERS = ["date", "merchant", "amount", "category"] as const;

export function parseTransactionsCsv(csv: string): DriftTransaction[] {
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => cell.trim().length > 0));
  const [headerRow, ...dataRows] = rows;

  if (!headerRow) {
    throw new Error("CSV is empty");
  }

  const headers = headerRow.map((header) => header.trim().toLowerCase());
  const missingHeaders = REQUIRED_CSV_HEADERS.filter((requiredHeader) => !headers.includes(requiredHeader));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV missing required columns: ${missingHeaders.join(", ")}`);
  }

  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const transactions = new Map<string, DriftTransaction>();

  for (const row of dataRows) {
    const transactionDate = readRequiredCell(row, headerIndex, "date");
    const merchantName = readRequiredCell(row, headerIndex, "merchant");
    const amountCents = parseAmountCents(readRequiredCell(row, headerIndex, "amount"));
    const category = readRequiredCell(row, headerIndex, "category");
    const sourceHash = stableHash([
      transactionDate,
      merchantName.toLowerCase(),
      String(amountCents),
      category.toLowerCase()
    ].join("|"));

    if (!transactions.has(sourceHash)) {
      transactions.set(sourceHash, {
        transactionDate,
        merchantName,
        amountCents,
        category,
        sourceHash,
        source: "csv"
      });
    }
  }

  return [...transactions.values()];
}

export function analyzeDrift(
  transactions: DriftTransaction[],
  options: DriftAnalysisOptions = {}
): DriftAnalysis {
  const baselineMonthCount = options.baselineMonths ?? 3;
  const recentMonthCount = options.recentMonths ?? 3;
  const months = uniqueSortedMonths(transactions);

  if (months.length < baselineMonthCount + recentMonthCount) {
    return {
      driftScore: 0,
      categories: [],
      baselineMonths: [],
      recentMonths: []
    };
  }

  const baselineMonths = months.slice(0, baselineMonthCount);
  const recentMonths = months.slice(-recentMonthCount);
  const categories = uniqueSortedCategories(transactions);
  const categoryDrifts: CategoryDrift[] = [];

  for (const category of categories) {
    const baselineTotal = sumCategorySpend(transactions, category, baselineMonths);
    const recentTotal = sumCategorySpend(transactions, category, recentMonths);

    if (baselineTotal <= 0) {
      continue;
    }

    const baselineMonthlyCents = Math.round(baselineTotal / baselineMonths.length);
    const recentMonthlyCents = Math.round(recentTotal / recentMonths.length);
    const monthlyOverspendCents = Math.max(0, recentMonthlyCents - baselineMonthlyCents);
    const driftPercent =
      baselineMonthlyCents === 0
        ? 0
        : Math.round((monthlyOverspendCents / baselineMonthlyCents) * 100);

    categoryDrifts.push({
      category,
      baselineMonthlyCents,
      recentMonthlyCents,
      monthlyOverspendCents,
      driftPercent,
      driftState: classifyDrift(driftPercent)
    });
  }

  categoryDrifts.sort((left, right) => {
    if (right.monthlyOverspendCents !== left.monthlyOverspendCents) {
      return right.monthlyOverspendCents - left.monthlyOverspendCents;
    }

    return left.category.localeCompare(right.category);
  });

  return {
    driftScore: calculateDriftScore(categoryDrifts),
    categories: categoryDrifts,
    baselineMonths,
    recentMonths
  };
}

export function projectCounterfactualWealth(
  input: CounterfactualInput
): CounterfactualProjection {
  const monthlyOverspendCents = Math.max(0, Math.round(input.monthlyOverspendCents));
  const monthCount = Math.max(0, Math.round(input.years * 12));
  const principalCents = monthlyOverspendCents * monthCount;

  if (monthlyOverspendCents === 0 || monthCount === 0) {
    return {
      ...input,
      monthlyOverspendCents,
      principalCents: 0,
      projectedValueCents: 0,
      projectedGainCents: 0
    };
  }

  const monthlyReturnRate = input.annualReturnRate / 12;
  const projectedValue =
    monthlyReturnRate === 0
      ? principalCents
      : monthlyOverspendCents *
        (((1 + monthlyReturnRate) ** monthCount - 1) / monthlyReturnRate);
  const projectedValueCents = Math.round(projectedValue);

  return {
    ...input,
    monthlyOverspendCents,
    principalCents,
    projectedValueCents,
    projectedGainCents: projectedValueCents - principalCents
  };
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"' && nextCharacter === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell.trim());
  rows.push(currentRow);

  return rows;
}

function readRequiredCell(row: string[], headerIndex: Map<string, number>, header: string): string {
  const index = headerIndex.get(header);
  const value = index === undefined ? undefined : row[index];

  if (!value) {
    throw new Error(`CSV row missing ${header}`);
  }

  return value.trim();
}

function parseAmountCents(value: string): number {
  const normalizedValue = value.replace(/[$,\s]/g, "");
  const amount = Number(normalizedValue);

  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid amount: ${value}`);
  }

  return Math.round(Math.abs(amount) * 100);
}

function uniqueSortedMonths(transactions: DriftTransaction[]): string[] {
  return [...new Set(transactions.map((transaction) => transaction.transactionDate.slice(0, 7)))].sort();
}

function uniqueSortedCategories(transactions: DriftTransaction[]): string[] {
  return [...new Set(transactions.map((transaction) => transaction.category))].sort();
}

function sumCategorySpend(
  transactions: DriftTransaction[],
  category: string,
  months: string[]
): number {
  const monthSet = new Set(months);

  return transactions
    .filter(
      (transaction) =>
        transaction.category === category && monthSet.has(transaction.transactionDate.slice(0, 7))
    )
    .reduce((total, transaction) => total + transaction.amountCents, 0);
}

function classifyDrift(driftPercent: number): DriftState {
  if (driftPercent > 35) {
    return "high_drift";
  }

  if (driftPercent >= 15) {
    return "watch";
  }

  return "stable";
}

function calculateDriftScore(categories: CategoryDrift[]): number {
  const driftingCategories = categories.filter((category) => category.monthlyOverspendCents > 0);

  if (driftingCategories.length === 0) {
    return 0;
  }

  const weightedSeverity = driftingCategories.reduce((total, category) => {
    const cappedDrift = Math.min(category.driftPercent, 120);
    const severity = Math.round((cappedDrift / 120) * 85);

    return total + severity * category.monthlyOverspendCents;
  }, 0);
  const totalOverspend = driftingCategories.reduce(
    (total, category) => total + category.monthlyOverspendCents,
    0
  );

  return Math.min(100, Math.round(weightedSeverity / totalOverspend));
}

function stableHash(value: string): string {
  const seeds = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c];

  return seeds.map((seed) => fnv1a(value, seed).toString(16).padStart(8, "0")).join("");
}

function fnv1a(value: string, seed: number): number {
  let hash = seed;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}
