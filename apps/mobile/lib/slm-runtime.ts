export type DeviceTier = "older" | "newer";
export type QuantizationMode = "4-bit" | "8-bit";
export type ModelState = "idle" | "loading" | "ready" | "unloaded";

export interface DeviceSignals {
  totalMemoryGb: number;
  lowPowerMode: boolean;
  isCharging: boolean;
  releaseYear: number;
}

export interface SlmRuntimePlan {
  quantization: QuantizationMode;
  shouldThrottle: boolean;
  shouldPreload: boolean;
  maxContextChunks: number;
}

export function classifyDeviceTier(signals: DeviceSignals): DeviceTier {
  if (signals.releaseYear < 2020 || signals.totalMemoryGb < 4) {
    return "older";
  }

  return "newer";
}

export function planSlmRuntime(signals: DeviceSignals): SlmRuntimePlan {
  const tier = classifyDeviceTier(signals);
  const shouldThrottle = signals.lowPowerMode && !signals.isCharging;

  return {
    quantization: tier === "older" ? "4-bit" : "8-bit",
    shouldThrottle,
    shouldPreload: !shouldThrottle && tier === "newer",
    maxContextChunks: tier === "older" ? 4 : 8
  };
}

export function buildSlidingContext(chunks: string[], maxChunks: number): string[] {
  return chunks
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(-Math.max(1, maxChunks));
}
