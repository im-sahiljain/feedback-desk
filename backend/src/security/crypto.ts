import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { getConfig } from '../config/env.js';

/**
 * Generates a cryptographically secure 6-digit numeric OTP string
 */
export const generateOtp = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

/**
 * Generates a high-entropy 48-byte URL-safe base64 string for refresh tokens
 */
export const generateToken = (): string => randomBytes(48).toString('base64url');

/**
 * Generates an opaque public feedback destination token (URL-safe, high entropy).
 */
export const generatePublicToken = (): string => randomBytes(18).toString('base64url');

function otpSecret(): string {
  return getConfig().otpHmacSecret;
}

/**
 * Creates HMAC-SHA256 hash of OTP bound to a specific challenge ID
 */
export function hashOtp(otp: string, challengeId: string): string {
  return createHmac('sha256', otpSecret()).update(`${challengeId}:${otp}`).digest('hex');
}

/**
 * Constant-time verification of OTP hash
 */
export function verifyOtpHash(otp: string, challengeId: string, expectedHex: string): boolean {
  try {
    const actual = Buffer.from(hashOtp(otp, challengeId), 'hex');
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Creates SHA-256 hex digest of refresh token for database storage and lookup
 */
export const hashRefreshToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * Hash for idempotency / submission fingerprinting
 */
export const hashPayload = (value: string): string => createHash('sha256').update(value).digest('hex');
