import test from 'node:test';
import assert from 'node:assert/strict';

import {
  estimateCostUsd,
  calculateAiCost,
} from '../src/ai/gateway/pricing.js';
import { rateLimiter } from '../src/ai/gateway/rateLimiter.js';
import { GoogleGenAiAdapter } from '../src/ai/gateway/adapters/googleGenAiAdapter.js';
import { LocalAdapter } from '../src/ai/gateway/adapters/localAdapter.js';
import { getAiGateway, resetAiGatewayCache } from '../src/ai/gateway/index.js';
import { resetConfigCache, loadConfig } from '../src/config/env.js';

test('AI Gateway Pricing: accurate cost across model tiers', () => {
  // Gemini 3.5 Flash Lite ($0.30/M in, $2.50/M out)
  const costLite = estimateCostUsd('gemini-3.5-flash-lite', 1000, 500);
  assert.equal(costLite, 0.00155);

  // Gemini 2.5 Flash ($0.15/M in, $0.60/M out)
  const costFlash = estimateCostUsd('gemini-2.5-flash', 1000, 500);
  assert.equal(costFlash, 0.00045);

  // Gemini 1.5 Pro ($3.50/M in, $10.50/M out)
  const costPro = estimateCostUsd('gemini-1.5-pro', 1000, 500);
  assert.equal(costPro, 0.00875);

  // Local models must always be $0.00
  assert.equal(estimateCostUsd('llama3:8b', 10000, 5000), 0);
  assert.equal(estimateCostUsd('ollama/mistral', 10000, 5000), 0);
  assert.equal(estimateCostUsd('local-model', 5000, 5000), 0);

  // Zero tokens
  assert.equal(estimateCostUsd('gemini-3.5-flash-lite', 0, 0), 0);
  assert.equal(calculateAiCost('gemini-3.5-flash-lite', 1000, 500), costLite);
});

test('AI Gateway RateLimiter: extracts backoff and respects provider', () => {
  const retryDelay = rateLimiter.extractRetryDelayMs(
    'google',
    'Quota exceeded. Please retry in 18.5s',
  );
  assert.equal(retryDelay, 20500); // 18.5s * 1000 + 2000 buffer

  const jsonDelay = rateLimiter.extractRetryDelayMs(
    'google',
    '{"error": {"message": "Rate limit", "retryDelay": "10s"}}',
  );
  assert.equal(jsonDelay, 12000); // 10s * 1000 + 2000 buffer

  const fallbackDelay = rateLimiter.extractRetryDelayMs('google', 'Resource exhausted');
  assert.equal(fallbackDelay, 25000);
});

test('AI Gateway Registry: switches adapter according to config', () => {
  const origEnv = { ...process.env };
  try {
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.OTP_HMAC_SECRET = 'b'.repeat(32);
    process.env.LINK_SECRET = 'c'.repeat(32);
    process.env.DATABASE_URL = 'postgres://fake:5432/fake';
    process.env.AI_PROVIDER = 'local';
    process.env.LOCAL_AI_BASE_URL = 'http://localhost:11434';
    process.env.AI_CLASSIFY_MODEL = 'llama3:8b';

    resetConfigCache();
    resetAiGatewayCache();
    loadConfig();

    const gateway = getAiGateway();
    assert.equal(gateway.llm.providerName, 'local');
    assert.equal(gateway.llm.defaultModel, 'llama3:8b');

    // Switch to Google
    process.env.AI_PROVIDER = 'google';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.AI_CLASSIFY_MODEL = 'gemini-2.5-flash';

    resetConfigCache();
    resetAiGatewayCache();
    loadConfig();

    const googleGateway = getAiGateway();
    assert.equal(googleGateway.llm.providerName, 'google');
    assert.equal(googleGateway.llm.defaultModel, 'gemini-2.5-flash');
  } finally {
    process.env = origEnv;
    resetConfigCache();
    resetAiGatewayCache();
  }
});
