import { describe, expect, it } from "vitest";
import { buildSlidingContext, planSlmRuntime } from "../lib/slm-runtime";

describe("planSlmRuntime", () => {
  it("uses 4-bit quantization and smaller context on constrained phones", () => {
    expect(
      planSlmRuntime({
        totalMemoryGb: 3,
        lowPowerMode: false,
        isCharging: false,
        releaseYear: 2019
      })
    ).toMatchObject({
      quantization: "4-bit",
      maxContextChunks: 4
    });
  });

  it("uses 8-bit quantization and idle preload on newer phones", () => {
    expect(
      planSlmRuntime({
        totalMemoryGb: 6,
        lowPowerMode: false,
        isCharging: false,
        releaseYear: 2023
      })
    ).toMatchObject({
      quantization: "8-bit",
      shouldPreload: true,
      maxContextChunks: 8
    });
  });

  it("throttles model work during low power mode unless charging", () => {
    expect(
      planSlmRuntime({
        totalMemoryGb: 6,
        lowPowerMode: true,
        isCharging: false,
        releaseYear: 2023
      }).shouldThrottle
    ).toBe(true);
  });
});

describe("buildSlidingContext", () => {
  it("keeps the most recent relevant chunks inside the context window", () => {
    expect(buildSlidingContext(["old", "reward spending", "", "recent drift"], 2)).toEqual([
      "reward spending",
      "recent drift"
    ]);
  });
});
