export const DEFAULT_OLLAMA_MODEL = "qwen2.5:0.5b";
export const DEFAULT_OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate";

export interface OllamaConfig {
  endpoint: string;
  model: string;
}

export interface OllamaGenerateInput {
  prompt: string;
  system?: string;
}

export function getOllamaConfig(
  env: Record<string, string | undefined> = process.env
): OllamaConfig {
  return {
    endpoint:
      env.OLLAMA_GENERATE_URL ??
      env.NEXT_PUBLIC_OLLAMA_GENERATE_URL ??
      DEFAULT_OLLAMA_GENERATE_URL,
    model: env.OLLAMA_MODEL ?? env.NEXT_PUBLIC_OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL
  };
}

export async function generateWithOllama(
  input: OllamaGenerateInput,
  config: OllamaConfig = getOllamaConfig(),
  fetcher: typeof fetch = fetch
): Promise<string> {
  const response = await fetcher(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      system: input.system,
      prompt: input.prompt
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with ${response.status}.`);
  }

  const body = (await response.json()) as { response?: string };
  const text = body.response?.trim();

  if (!text) {
    throw new Error("Ollama returned an empty response.");
  }

  return text;
}
