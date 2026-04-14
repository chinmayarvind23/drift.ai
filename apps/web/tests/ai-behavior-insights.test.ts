import { describe, expect, it } from "vitest";
import {
  buildAiBehaviorInsight,
  describeInsightModel
} from "../lib/ai-behavior-insights";

describe("buildAiBehaviorInsight", () => {
  it("uses local AI to create an editable behavior tag", async () => {
    const insight = await buildAiBehaviorInsight(
      "Dining",
      "I got promoted and felt like I deserved nicer dinners.",
      "2026-04-12T10:00:00.000Z",
      async () => ({
        tag: "reward_spending",
        provider: "ollama",
        followUpQuestion: "What reward is worth keeping?"
      })
    );

    expect(insight).toMatchObject({
      tag: "reward_spending",
      tagLabel: "Reward spending",
      modelProvider: "ollama",
      modelName: "qwen-local",
      confidence: null,
      followUpQuestion: "What reward is worth keeping?"
    });
    expect(describeInsightModel(insight)).toContain("Local AI suggested reward spending.");
    expect(describeInsightModel(insight)).not.toMatch(/confidence/i);
  });

  it("uses the local AI tag without exposing confidence to the user", async () => {
    const insight = await buildAiBehaviorInsight(
      "Shopping",
      "My routine changed and this became automatic.",
      "2026-04-12T10:00:00.000Z",
      async () => ({ tag: "habit_creep", provider: "ollama" })
    );

    expect(insight.tag).toBe("habit_creep");
    expect(insight.tagLabel).toBe("Habit creep");
    expect(insight.confidence).toBeNull();
  });

  it("falls back to deterministic classification when local AI is unavailable", async () => {
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
    expect(describeInsightModel(insight)).toContain("Start Ollama");
  });
});
