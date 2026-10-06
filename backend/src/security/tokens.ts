import jwt from 'jsonwebtoken';
import { getConfig } from '../config/env.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AccessClaims {
  userId: string;
  sessionId?: string;
}

function jwtSecret(): string {
  return getConfig().jwtSecret;
}

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(
    {
      id: claims.userId,
      sub: claims.userId,
      sid: claims.sessionId,
    },
    jwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  );
}

export function verifyAccessToken(token: string): AccessClaims {
  const payload = jwt.verify(token, jwtSecret()) as Record<string, unknown>;
  const userId = (payload.sub || payload.id) as string | undefined;
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid token claims');
  }
  return {
    userId,
    sessionId: typeof payload.sid === 'string' ? payload.sid : undefined,
  };
}
