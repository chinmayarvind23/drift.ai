import { describe, expect, it } from "vitest";
import { parseBlsInflationResponse } from "../lib/inflation-rate";

describe("parseBlsInflationResponse", () => {
  it("calculates year-over-year CPI inflation from latest BLS data", () => {
    const parsed = parseBlsInflationResponse({
      status: "REQUEST_SUCCEEDED",
      Results: {
        series: [
          {
            seriesID: "CUUR0000SA0",
            data: [
              { year: "2026", period: "M02", periodName: "February", value: "318.000" },
              { year: "2026", period: "M01", periodName: "January", value: "315.000" },
              { year: "2025", period: "M02", periodName: "February", value: "300.000" },
              { year: "2025", period: "M01", periodName: "January", value: "299.000" }
            ]
          }
        ]
      }
    });

    expect(parsed.annualRate).toBeCloseTo(0.06, 4);
    expect(parsed.sourceLabel).toBe("BLS CPI-U February 2026");
  });

  it("falls back when matching prior-year CPI data is missing", () => {
    const parsed = parseBlsInflationResponse({
      Results: {
        series: [
          {
            data: [
              { year: "2026", period: "M02", periodName: "February", value: "318.000" }
            ]
          }
        ]
      }
    });

    expect(parsed.annualRate).toBe(0.03);
    expect(parsed.sourceLabel).toBe("Fallback inflation assumption");
  });
});
