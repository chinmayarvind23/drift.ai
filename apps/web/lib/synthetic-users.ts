import type { DriftTransaction } from "@drift/core";

export interface SyntheticUser {
  id: string;
  name: string;
  scenario: string;
  incomeEvent: string;
  transactions: DriftTransaction[];
}

interface CategoryPattern {
  category: string;
  baselineMonthlyCents: number;
  recentMonthlyCents: number;
  merchants: string[];
}

interface SyntheticUserPattern {
  id: string;
  name: string;
  scenario: string;
  incomeEvent: string;
  categories: CategoryPattern[];
}

const BASELINE_MONTHS = ["2025-07", "2025-08", "2025-09"];
const RECENT_MONTHS = ["2026-01", "2026-02", "2026-03"];

const USER_PATTERNS: SyntheticUserPattern[] = [
  {
    id: "maya-new-job",
    name: "Maya Chen",
    scenario: "New job reward spending",
    incomeEvent: "Started a higher-paying product role in January.",
    categories: [
      category("Dining", 52_000, 118_000, ["Bar Luce", "Nori House", "Cafe Alma"]),
      category("Shopping", 38_000, 74_000, ["Nord & Co", "Everlane", "Target"]),
      category("Rides", 18_000, 32_000, ["Uber", "Lyft", "Metro"]),
      category("Groceries", 56_000, 58_000, ["Whole Foods", "Trader Joe's", "Local Market"]),
      category("Subscriptions", 12_000, 18_000, ["Spotify", "ClassPass", "Notion"])
    ]
  },
  {
    id: "jordan-new-city",
    name: "Jordan Ellis",
    scenario: "Moved cities",
    incomeEvent: "Moved to Chicago after a promotion.",
    categories: [
      category("Rent Adjacent", 20_000, 62_000, ["IKEA", "Home Depot", "West Elm"]),
      category("Dining", 44_000, 88_000, ["Daisies", "Avec", "La Colombe"]),
      category("Rides", 24_000, 69_000, ["Uber", "Lyft", "Divvy"]),
      category("Groceries", 48_000, 51_000, ["Jewel Osco", "Trader Joe's", "H Mart"]),
      category("Fitness", 9_000, 27_000, ["Equinox", "ClassPass", "Climbing Gym"])
    ]
  },
  {
    id: "sam-subscriptions",
    name: "Sam Rivera",
    scenario: "Subscription creep",
    incomeEvent: "Freelance income became steady.",
    categories: [
      category("Subscriptions", 16_000, 61_000, ["Figma", "ChatGPT", "Adobe"]),
      category("Software", 12_000, 39_000, ["Linear", "Vercel", "GitHub"]),
      category("Dining", 36_000, 43_000, ["Sweetgreen", "Chipotle", "Local Cafe"]),
      category("Groceries", 50_000, 49_000, ["Costco", "Trader Joe's", "Market"]),
      category("Shopping", 24_000, 34_000, ["Amazon", "Target", "Best Buy"])
    ]
  },
  {
    id: "nina-stress-convenience",
    name: "Nina Patel",
    scenario: "Stress convenience spending",
    incomeEvent: "Started a demanding manager role.",
    categories: [
      category("Delivery", 28_000, 96_000, ["DoorDash", "Uber Eats", "Caviar"]),
      category("Dining", 42_000, 77_000, ["Ramen San", "Cafe Luna", "Taco Local"]),
      category("Coffee", 9_000, 31_000, ["Starbucks", "Blue Bottle", "Local Coffee"]),
      category("Groceries", 62_000, 47_000, ["Whole Foods", "Trader Joe's", "Market"]),
      category("Wellness", 14_000, 24_000, ["Calm", "Massage Studio", "Yoga Loft"])
    ]
  },
  {
    id: "alex-stable",
    name: "Alex Morgan",
    scenario: "Mostly stable spender",
    incomeEvent: "Got a raise and kept routines mostly unchanged.",
    categories: [
      category("Dining", 42_000, 47_000, ["Local Diner", "Sushi Stop", "Cafe"]),
      category("Groceries", 58_000, 60_000, ["Kroger", "Trader Joe's", "Market"]),
      category("Shopping", 25_000, 28_000, ["Target", "Amazon", "Uniqlo"]),
      category("Rides", 16_000, 17_000, ["Uber", "Lyft", "Transit"]),
      category("Subscriptions", 11_000, 12_000, ["Netflix", "Spotify", "iCloud"])
    ]
  }
];

export function listSyntheticUsers(): SyntheticUser[] {
  return USER_PATTERNS.map((pattern) => ({
    id: pattern.id,
    name: pattern.name,
    scenario: pattern.scenario,
    incomeEvent: pattern.incomeEvent,
    transactions: buildTransactions(pattern)
  }));
}

export function getSyntheticUser(userId: string): SyntheticUser | undefined {
  return listSyntheticUsers().find((user) => user.id === userId);
}

function category(
  categoryName: string,
  baselineMonthlyCents: number,
  recentMonthlyCents: number,
  merchants: string[]
): CategoryPattern {
  return {
    category: categoryName,
    baselineMonthlyCents,
    recentMonthlyCents,
    merchants
  };
}

function buildTransactions(pattern: SyntheticUserPattern): DriftTransaction[] {
  return pattern.categories.flatMap((categoryPattern) => [
    ...BASELINE_MONTHS.flatMap((month, monthIndex) =>
      splitMonthlySpend(pattern.id, categoryPattern, month, monthIndex, true)
    ),
    ...RECENT_MONTHS.flatMap((month, monthIndex) =>
      splitMonthlySpend(pattern.id, categoryPattern, month, monthIndex, false)
    )
  ]);
}

function splitMonthlySpend(
  userId: string,
  categoryPattern: CategoryPattern,
  month: string,
  monthIndex: number,
  isBaseline: boolean
): DriftTransaction[] {
  const monthlySpend = isBaseline
    ? categoryPattern.baselineMonthlyCents
    : categoryPattern.recentMonthlyCents;
  const weights = isBaseline ? [0.42, 0.33, 0.25] : [0.48, 0.31, 0.21];
  let allocatedCents = 0;

  return weights.map((weight, index) => {
    const isLast = index === weights.length - 1;
    const amountCents = isLast
      ? monthlySpend - allocatedCents
      : Math.round(monthlySpend * weight);
    allocatedCents += amountCents;

    const day = String(5 + monthIndex * 7 + index * 2).padStart(2, "0");
    const merchantName = categoryPattern.merchants[index % categoryPattern.merchants.length];
    const sourceHash = `${userId}-${month}-${categoryPattern.category}-${index}-${amountCents}`;

    return {
      id: sourceHash,
      transactionDate: `${month}-${day}`,
      merchantName,
      amountCents,
      category: categoryPattern.category,
      sourceHash,
      source: "seed"
    };
  });
}
