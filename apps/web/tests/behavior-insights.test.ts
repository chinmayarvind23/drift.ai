import { describe, expect, it } from "vitest";
import { buildBehaviorInsight, classifyBehaviorAnswer } from "../lib/behavior-insights";

describe("behavior insights", () => {
  it("classifies reward spending before saving a private insight", () => {
    const insight = buildBehaviorInsight(
      "Dining",
      "I got a new job and felt like I deserved nicer dinners.",
      "2026-04-12T10:00:00.000Z"
    );

    expect(insight).toMatchObject({
      category: "Dining",
      tag: "reward_spending",
      tagLabel: "Reward spending"
    });
    expect(insight.summary).toContain("Dining is tagged as reward spending");
  });

  it("classifies stress convenience and falls back to unknown", () => {
    expect(classifyBehaviorAnswer("Work has been busy so delivery became the default.")).toBe(
      "stress_convenience"
    );
    expect(classifyBehaviorAnswer("")).toBe("unknown");
  });
});
