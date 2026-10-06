import { createHmac, timingSafeEqual } from 'crypto';
import { getConfig } from './config/env.js';

function getSecretKey(): string {
  return getConfig().linkSecret;
}

export function signParams(
  params: Record<string, string | number | undefined | null>,
  customSecret?: string
): string {
  const secret = customSecret ?? getSecretKey();

  const keys = Object.keys(params).sort();
  const dataString = keys
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');

  const hmac = createHmac('sha256', secret);
  hmac.update(dataString);
  return hmac.digest('hex');
}

export function verifyParams(
  params: Record<string, string | number | undefined | null>,
  signature: string | undefined | null,
  customSecret?: string
): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  const expiresAt = params.expiresAt ?? params.expires_at ?? params.exp;
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
    const expNum = Number(expiresAt);
    if (isNaN(expNum) || Date.now() > expNum) {
      return false;
    }
  }

  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(signature)) {
    return false;
  }

  let expectedSignature: string;
  try {
    expectedSignature = signParams(params, customSecret);
  } catch {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
