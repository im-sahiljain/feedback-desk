import {
  LlmAdapter,
  EmbeddingAdapter,
  StructuredPromptRequest,
  StructuredPromptResponse,
  TextPromptRequest,
  TextPromptResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../types.js';
import { estimateCostUsd } from '../pricing.js';

export interface LocalAdapterOptions {
  baseUrl?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  apiKey?: string;
}

export class LocalAdapter implements LlmAdapter, EmbeddingAdapter {
  readonly providerName = 'local';
  readonly defaultModel: string;
  readonly defaultEmbeddingModel: string;
  readonly defaultDimensions = 768;

  private baseUrl: string;
  private apiKey: string;

  constructor(options: LocalAdapterOptions = {}) {
    // Normalizes to standard OpenAI-compatible local endpoint (e.g. Ollama http://127.0.0.1:11434/v1)
    let base = (options.baseUrl || 'http://127.0.0.1:11434/v1').replace(/\/+$/, '');
    if (!base.endsWith('/v1')) {
      base = `${base}/v1`;
    }
    this.baseUrl = base;
    this.defaultModel = options.defaultModel || 'llama3:8b';
    this.defaultEmbeddingModel = options.defaultEmbeddingModel || 'nomic-embed-text';
    this.apiKey = options.apiKey || 'local-no-key';
  }

  async generateStructured<T = unknown>(
    req: StructuredPromptRequest,
  ): Promise<StructuredPromptResponse<T>> {
    const model = req.model || this.defaultModel;
    const start = Date.now();

    const systemInstruction = [
      req.systemPrompt || '',
      'You MUST return valid JSON adhering strictly to the requested schema. Return JSON only, with no markdown code blocks.',
      req.schema ? `Schema definition:\n${JSON.stringify(req.schema)}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 60000); // 60s for local models

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: req.prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: req.temperature ?? 0.1,
          max_tokens: req.maxOutputTokens,
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Local LLM HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const json = await response.json();
      const rawText = json.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(rawText) as T;

      const tokenInput = json.usage?.prompt_tokens ?? Math.max(1, Math.ceil(req.prompt.length / 4));
      const tokenOutput = json.usage?.completion_tokens ?? Math.max(1, Math.ceil(rawText.length / 4));

      return {
        data: parsed,
        rawText,
        provider: this.providerName,
        model,
        tokenInput,
        tokenOutput,
        estimatedCostUsd: estimateCostUsd(model, tokenInput, tokenOutput),
        latencyMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateText(req: TextPromptRequest): Promise<TextPromptResponse> {
    const model = req.model || this.defaultModel;
    const start = Date.now();

    const messages = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    messages.push({ role: 'user', content: req.prompt });

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 60000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: req.temperature ?? 0.1,
          max_tokens: req.maxOutputTokens ?? 1000,
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Local LLM HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const json = await response.json();
      const text = json.choices?.[0]?.message?.content || '';
      const tokenInput = json.usage?.prompt_tokens ?? Math.max(1, Math.ceil(req.prompt.length / 4));
      const tokenOutput = json.usage?.completion_tokens ?? Math.max(1, Math.ceil(text.length / 4));

      return {
        text,
        provider: this.providerName,
        model,
        tokenInput,
        tokenOutput,
        estimatedCostUsd: 0,
        latencyMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = req.model || this.defaultEmbeddingModel;
    const start = Date.now();

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20000);

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: req.text,
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Local embedding HTTP ${response.status}: ${errText.slice(0, 200)}`);
      }

      const json = await response.json();
      const rawVector = json.data?.[0]?.embedding;

      if (!Array.isArray(rawVector)) {
        throw new Error('Local embedding response missing vector array');
      }

      // Pad or truncate to desired dimension (e.g. 768 for pgvector) if required
      const targetDim = req.dimensions || this.defaultDimensions;
      let vector = rawVector;
      if (rawVector.length !== targetDim) {
        if (rawVector.length > targetDim) {
          vector = rawVector.slice(0, targetDim);
        } else {
          vector = [...rawVector, ...new Array(targetDim - rawVector.length).fill(0)];
        }
      }

      return {
        vector,
        dimensions: targetDim,
        provider: this.providerName,
        model,
        tokenInput: Math.max(1, Math.ceil(req.text.length / 4)),
        latencyMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
