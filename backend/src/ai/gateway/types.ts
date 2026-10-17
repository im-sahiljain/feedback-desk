/**
 * Core types and interfaces for the provider-agnostic AI Gateway.
 * Supports Google Gemini, Local LLMs (Ollama / OpenAI-compatible local runtimes),
 * and maintains compatibility for any future provider.
 */

export type AiProviderName = 'google' | 'local' | string;

export interface StructuredPromptRequest {
  prompt: string;
  systemPrompt?: string;
  /** Standard JSON Schema (Draft-07 / OpenAPI compliant) */
  schema: Record<string, unknown>;
  schemaName?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface StructuredPromptResponse<T = unknown> {
  data: T;
  rawText: string;
  provider: AiProviderName;
  model: string;
  tokenInput: number;
  tokenOutput: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface TextPromptRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface TextPromptResponse {
  text: string;
  provider: AiProviderName;
  model: string;
  tokenInput: number;
  tokenOutput: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
  /** Target dimensions (default 768 for pgvector compatibility) */
  dimensions?: number;
}

export interface EmbeddingResponse {
  vector: number[];
  dimensions: number;
  provider: AiProviderName;
  model: string;
  tokenInput: number;
  latencyMs: number;
}

/**
 * Universal interface for LLM text and structured generation.
 */
export interface LlmAdapter {
  readonly providerName: AiProviderName;
  readonly defaultModel: string;

  generateStructured<T = unknown>(
    req: StructuredPromptRequest,
  ): Promise<StructuredPromptResponse<T>>;

  generateText(req: TextPromptRequest): Promise<TextPromptResponse>;
}

/**
 * Universal interface for vector embeddings.
 */
export interface EmbeddingAdapter {
  readonly providerName: AiProviderName;
  readonly defaultEmbeddingModel: string;
  readonly defaultDimensions: number;

  embed(req: EmbeddingRequest): Promise<EmbeddingResponse>;
}
