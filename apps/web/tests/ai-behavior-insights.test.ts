import { describe, expect, it } from "vitest";
import {
  BEHAVIOR_MODEL_ID,
  buildAiBehaviorInsight,
  describeInsightModel
} from "../lib/ai-behavior-insights";

describe("buildAiBehaviorInsight", () => {
  it("uses a Hugging Face zero-shot classifier to create a behavior tag", async () => {
    const insight = await buildAiBehaviorInsight(
      "Dining",
      "I got promoted and felt like I deserved nicer dinners.",
      "2026-04-12T10:00:00.000Z",
      async () => async () => ({
        labels: ["reward spending", "stress convenience", "habit creep"],
        scores: [0.91, 0.06, 0.03]
      })
    );

    expect(insight).toMatchObject({
      tag: "reward_spending",
      tagLabel: "Reward spending",
      modelProvider: "huggingface",
      modelName: BEHAVIOR_MODEL_ID,
      confidence: 0.91
    });
    expect(describeInsightModel(insight)).toContain("AI suggested reward spending.");
    expect(describeInsightModel(insight)).not.toMatch(/confidence/i);
    expect(describeInsightModel(insight)).not.toContain(BEHAVIOR_MODEL_ID);
  });

  it("uses the highest-scoring AI label as the tag without a confidence threshold", async () => {
    const insight = await buildAiBehaviorInsight(
      "Shopping",
      "My routine changed and this became automatic.",
      "2026-04-12T10:00:00.000Z",
      async () => async () => ({
        labels: ["habit creep", "intentional upgrade", "reward spending"],
        scores: [0.29, 0.28, 0.27]
      })
    );

    expect(insight.tag).toBe("habit_creep");
    expect(insight.tagLabel).toBe("Habit creep");
  });

  it("falls back to deterministic classification when the model cannot load", async () => {
    const insight = await buildAiBehaviorInsight(
      "Rides",
      "I was stressed and kept taking rides home late.",
      "2026-04-12T10:00:00.000Z",
      async () => {
        throw new Error("Model unavailable");
      }
    );

    expect(insight).toMatchObject({
      tag: "stress_convenience",
      tagLabel: "Stress convenience",
      modelProvider: "deterministic",
      modelName: "keyword-fallback",
      confidence: null
    });
  });
});
