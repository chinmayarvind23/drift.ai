export interface LocalLlmConfig {
  enabled: boolean;
  endpoint: string;
  model: string;
}

export interface LocalRecoveryInput {
  category: string;
  overspendLabel: string;
  behaviorTagLabel: string;
  userAnswer?: string;
}

export interface LocalRecoveryPath {
  text: string;
  provider: "ollama" | "deterministic";
}

export function getLocalLlmConfig(
  env: Record<string, string | undefined> = process.env
): LocalLlmConfig {
  return {
    enabled: env.NEXT_PUBLIC_DRIFT_LOCAL_LLM_ENABLED !== "false",
    endpoint: env.NEXT_PUBLIC_OLLAMA_GENERATE_URL ?? "http://localhost:11434/api/generate",
    model: env.NEXT_PUBLIC_OLLAMA_MODEL ?? "qwen2.5:0.5b"
  };
}

export async function buildLocalLlmRecoveryPath(
  input: LocalRecoveryInput,
  fetcher: typeof fetch = fetch
): Promise<LocalRecoveryPath> {
  const config = getLocalLlmConfig();

  if (!config.enabled) {
    return buildFallbackRecoveryPath(input);
  }

  try {
    const response = await fetcher(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        prompt: [
          "Write one concise, practical 30-day recovery step for a private spending drift report.",
          "Avoid shame. Do not mention budgets. Use plain language.",
          `Category: ${input.category}`,
          `Monthly overspend: ${input.overspendLabel}`,
          `Behavior tag: ${input.behaviorTagLabel}`,
          `User context: ${input.userAnswer || "No user context saved."}`
        ].join("\n")
      })
    });

    if (!response.ok) {
      return buildFallbackRecoveryPath(input);
    }

    const body = (await response.json()) as { response?: string };
    const text = body.response?.trim();

    if (!text) {
      return buildFallbackRecoveryPath(input);
    }

    return {
      text,
      provider: "ollama"
    };
  } catch {
    return buildFallbackRecoveryPath(input);
  }
}

function buildFallbackRecoveryPath(input: LocalRecoveryInput): LocalRecoveryPath {
  return {
    text: `${input.category} is adding ${input.overspendLabel}/month. Pick one repeatable limit for the next 30 days, then review whether the pattern still feels intentional.`,
    provider: "deterministic"
  };
}
