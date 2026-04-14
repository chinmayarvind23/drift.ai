import { NextResponse } from "next/server";
import { fetchLatestInflationRate, formatInflationRateLabel } from "@/lib/inflation-rate";

export async function GET() {
  const inflationRate = await fetchLatestInflationRate();

  return NextResponse.json({
    annualRate: inflationRate.annualRate,
    rateLabel: formatInflationRateLabel(inflationRate.annualRate),
    sourceLabel: inflationRate.sourceLabel
  });
}
