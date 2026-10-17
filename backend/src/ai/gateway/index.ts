import { getConfig } from '../../config/env.js';
import {
  LlmAdapter,
  EmbeddingAdapter,
  StructuredPromptRequest,
  StructuredPromptResponse,
  TextPromptRequest,
  TextPromptResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from './types.js';
import { GoogleGenAiAdapter } from './adapters/googleGenAiAdapter.js';
import { LocalAdapter } from './adapters/localAdapter.js';

export * from './types.js';
export * from './pricing.js';
export * from './rateLimiter.js';
export { GoogleGenAiAdapter } from './adapters/googleGenAiAdapter.js';
export { LocalAdapter } from './adapters/localAdapter.js';

interface AiGateway {
  llm: LlmAdapter;
  embedding: EmbeddingAdapter;
}

let cachedGateway: AiGateway | null = null;
let cachedProviderKey: string | null = null;

/**
 * Returns the active AI Gateway instance based on environment configuration.
 */
export function getAiGateway(): AiGateway {
  const config = getConfig();
  const currentKey = `${config.aiProvider}:${config.aiClassifyModel}:${config.aiEmbeddingModel}:${config.geminiTier}`;

  if (cachedGateway && cachedProviderKey === currentKey) {
    return cachedGateway;
  }

  if (config.aiProvider === 'local') {
    const local = new LocalAdapter({
      baseUrl: config.localAiBaseUrl,
      defaultModel: config.aiClassifyModel,
      defaultEmbeddingModel: config.aiEmbeddingModel,
    });
    cachedGateway = { llm: local, embedding: local };
    cachedProviderKey = currentKey;
    return cachedGateway;
  }

  // Default: Google GenAI
  const apiKey = config.geminiApiKey || '';
  const google = new GoogleGenAiAdapter({
    apiKey,
    defaultModel: config.aiClassifyModel,
    defaultEmbeddingModel: config.aiEmbeddingModel,
    isFreeTier: config.geminiTier === 'free',
  });

  cachedGateway = { llm: google, embedding: google };
  cachedProviderKey = currentKey;
  return cachedGateway;
}

/**
 * Convenience helper for structured prompt completion.
 */
export async function generateStructured<T = unknown>(
  req: StructuredPromptRequest,
): Promise<StructuredPromptResponse<T>> {
  return getAiGateway().llm.generateStructured<T>(req);
}

/**
 * Convenience helper for freeform text generation.
 */
export async function generateText(req: TextPromptRequest): Promise<TextPromptResponse> {
  return getAiGateway().llm.generateText(req);
}

/**
 * Convenience helper for vector embeddings.
 */
export async function embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
  return getAiGateway().embedding.embed(req);
}

/**
 * Resets gateway cache (useful in tests when env is modified).
 */
export function resetAiGatewayCache(): void {
  cachedGateway = null;
  cachedProviderKey = null;
}
