/**
 * Centralized token pricing registry across models and providers.
 * Local LLMs always resolve to $0.00 USD.
 */

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const PRICING_REGISTRY: Record<string, ModelPricing> = {
  // Gemini family
  'gemini-3.5-flash-lite': { inputPerMillion: 0.30, outputPerMillion: 2.50 },
  'gemini-flash-lite-latest': { inputPerMillion: 0.30, outputPerMillion: 2.50 },
  'gemini-2.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gemini-3.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gemini-1.5-flash': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gemini-1.5-pro': { inputPerMillion: 3.50, outputPerMillion: 10.50 },
  'gemini-2.5-pro': { inputPerMillion: 3.50, outputPerMillion: 10.50 },
  'gemini-embedding-001': { inputPerMillion: 0.02, outputPerMillion: 0.00 },
  'text-embedding-004': { inputPerMillion: 0.02, outputPerMillion: 0.00 },
};

/**
 * Calculates estimated USD cost based on model token rates.
 * Resolves local models (ollama, llama, mistral, etc.) to 0 USD.
 */
export function estimateCostUsd(
  modelName: string,
  tokenInput: number = 0,
  tokenOutput: number = 0,
): number {
  const norm = (modelName || '').toLowerCase().trim();
  if (tokenInput <= 0 && tokenOutput <= 0) return 0;

  // Local models have zero API inference cost
  if (
    norm.startsWith('local') ||
    norm.startsWith('ollama') ||
    norm.includes('llama') ||
    norm.includes('mistral') ||
    norm.includes('qwen') ||
    norm.includes('phi')
  ) {
    return 0;
  }

  // Exact match
  if (PRICING_REGISTRY[norm]) {
    const p = PRICING_REGISTRY[norm];
    const cost = (tokenInput * p.inputPerMillion + tokenOutput * p.outputPerMillion) / 1_000_000;
    return Number(cost.toFixed(6));
  }

  // Heuristic match for model families
  let inputRate = 0.30;
  let outputRate = 2.50;

  if (norm.includes('embedding')) {
    inputRate = 0.02;
    outputRate = 0.00;
  } else if (norm.includes('pro')) {
    inputRate = 3.50;
    outputRate = 10.50;
  } else if (norm.includes('flash-lite')) {
    inputRate = 0.30;
    outputRate = 2.50;
  } else if (norm.includes('flash')) {
    inputRate = 0.15;
    outputRate = 0.60;
  }

  const cost = (tokenInput * inputRate + tokenOutput * outputRate) / 1_000_000;
  return Number(cost.toFixed(6));
}

/**
 * Compatible alias for intelligence telemetry.
 */
export const calculateAiCost = estimateCostUsd;
