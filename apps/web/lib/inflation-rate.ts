export interface InflationRateSnapshot {
  annualRate: number;
  sourceLabel: string;
}

interface BlsCpiPoint {
  year?: string;
  period?: string;
  periodName?: string;
  value?: string;
}

const CPI_SERIES_ID = "CUUR0000SA0";
const DEFAULT_INFLATION_RATE: InflationRateSnapshot = {
  annualRate: 0.03,
  sourceLabel: "Fallback inflation assumption"
};

export function getDefaultInflationRate(): InflationRateSnapshot {
  return DEFAULT_INFLATION_RATE;
}

export async function fetchLatestInflationRate(
  fetcher: typeof fetch = fetch,
  now = new Date()
): Promise<InflationRateSnapshot> {
  try {
    const endYear = now.getUTCFullYear();
    const response = await fetcher("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesid: [CPI_SERIES_ID],
        startyear: String(endYear - 2),
        endyear: String(endYear)
      }),
      next: { revalidate: 60 * 60 * 12 }
    } as RequestInit & { next?: { revalidate: number } });

    if (!response.ok) {
      return DEFAULT_INFLATION_RATE;
    }

    return parseBlsInflationResponse(await response.json());
  } catch {
    return DEFAULT_INFLATION_RATE;
  }
}

export function parseBlsInflationResponse(body: unknown): InflationRateSnapshot {
  const points = extractCpiPoints(body)
    .filter((point) => point.period?.startsWith("M") && point.period !== "M13")
    .map((point) => ({
      year: Number(point.year),
      month: Number(point.period?.slice(1)),
      periodName: point.periodName,
      value: Number(point.value)
    }))
    .filter((point) =>
      Number.isFinite(point.year) &&
      Number.isFinite(point.month) &&
      Number.isFinite(point.value) &&
      point.month >= 1 &&
      point.month <= 12
    )
    .sort((left, right) => {
      if (right.year !== left.year) {
        return right.year - left.year;
      }

      return right.month - left.month;
    });

  const latest = points[0];

  if (!latest) {
    return DEFAULT_INFLATION_RATE;
  }

  const priorYear = points.find(
    (point) => point.year === latest.year - 1 && point.month === latest.month
  );

  if (!priorYear || priorYear.value <= 0) {
    return DEFAULT_INFLATION_RATE;
  }

  return {
    annualRate: Math.max(0, latest.value / priorYear.value - 1),
    sourceLabel: `BLS CPI-U ${latest.periodName ?? formatMonthName(latest.month)} ${latest.year}`
  };
}

export function formatInflationRateLabel(rate: number): string {
  const percent = rate * 100;

  return `${Number(percent.toFixed(percent % 1 === 0 ? 0 : 1))}%`;
}

function extractCpiPoints(body: unknown): BlsCpiPoint[] {
  if (!body || typeof body !== "object") {
    return [];
  }

  const results = (body as { Results?: unknown }).Results;

  if (!results || typeof results !== "object") {
    return [];
  }

  const series = (results as { series?: unknown }).series;

  if (!Array.isArray(series)) {
    return [];
  }

  const [firstSeries] = series;

  if (!firstSeries || typeof firstSeries !== "object") {
    return [];
  }

  const data = (firstSeries as { data?: unknown }).data;

  return Array.isArray(data) ? data as BlsCpiPoint[] : [];
}

function formatMonthName(month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}
