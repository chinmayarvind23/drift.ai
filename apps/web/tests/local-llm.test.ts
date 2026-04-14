import { describe, expect, it } from "vitest";
import { buildLocalLlmRecoveryPath, getLocalLlmConfig } from "../lib/local-llm";

describe("getLocalLlmConfig", () => {
  it("defaults to a lightweight local Qwen model through Ollama", () => {
    expect(getLocalLlmConfig({})).toEqual({
      enabled: true,
      endpoint: "/api/ai/recovery",
      model: "qwen2.5:0.5b"
    });
  });
});

describe("buildLocalLlmRecoveryPath", () => {
  it("uses the local LLM response when Ollama is available", async () => {
    let requestBody = "";
    const recovery = await buildLocalLlmRecoveryPath(
      {
        category: "Dining",
        overspendLabel: "$80",
        behaviorTagLabel: "Reward spending",
        userAnswer: "I got promoted.",
        followUpAnswer: "Friday dinner is the reward I care about."
      },
      async (_url, init) => {
        requestBody = String(init?.body ?? "");

        return {
          ok: true,
          json: async () => ({ response: "Keep one planned dinner and move the extra $80 before Friday." })
        } as Response;
      }
    );

    expect(recovery.provider).toBe("ollama");
    expect(recovery.text).toMatch(/planned dinner/i);
    expect(requestBody).toContain("Friday dinner is the reward I care about.");
  });

  it("falls back locally when Ollama is unavailable", async () => {
    const recovery = await buildLocalLlmRecoveryPath(
      {
        category: "Delivery",
        overspendLabel: "$120",
        behaviorTagLabel: "Stress convenience",
        userAnswer: "Work got busy."
      },
      async () => {
        throw new Error("offline");
      }
    );

    expect(recovery.provider).toBe("deterministic");
    expect(recovery.text).toMatch(/Delivery/i);
    expect(recovery.text).toMatch(/\$120/);
  });
});
