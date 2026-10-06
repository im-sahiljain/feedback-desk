import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { getPool } from '../db.js';
import { sendOTPEmail } from '../email.js';
import { authLimiter, otpVerifyLimiter } from '../middleware/rateLimiters.js';
import { generateOtp, generateToken, hashOtp, verifyOtpHash, hashRefreshToken } from '../security/crypto.js';
import {
  signAccessToken,
  verifyAccessToken,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../security/tokens.js';
import { normalizeEmail } from '../organizations/roles.js';
import { ensurePersonalOrganization } from '../authz/access.js';
import { logger } from '../logging/logger.js';
import { toSafeClientError } from '../errors/httpError.js';
import { recordAudit } from '../audit/audit.js';

const router = express.Router();
const OTP_COOLDOWN_SECONDS = 60;
const OTP_TTL_MS = 10 * 60 * 1000;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    sessionId?: string;
  };
}

function sanitizeUser(user: Record<string, unknown>) {
  if (!user) return user;
  const sanitized = { ...user };
  delete sanitized.password_hash;
  delete sanitized.otp_code;
  delete sanitized.otp_expires_at;
  delete sanitized.otp_attempts;
  delete sanitized.otp_locked_until;
  return sanitized;
}

export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Invalid authorization header format' });
  }

  try {
    const claims = verifyAccessToken(parts[1]);
    req.user = {
      id: claims.userId,
      sessionId: claims.sessionId,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

async function issueSession(userId: string, userAgent?: string, ipAddress?: string) {
  const pool = getPool();
  const refreshToken = generateToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const result = await pool.query<{ session_id: string }>(
    `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING session_id`,
    [userId, refreshHash, userAgent || null, ipAddress || null, expiresAt]
  );

  const sessionId = result.rows[0]?.session_id;
  const accessToken = signAccessToken({ userId, sessionId });

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
    refreshTokenExpiresAt: expiresAt,
    token: accessToken,
  };
}

async function createOtpChallenge(
  cleanEmail: string,
  purpose: string,
  ipAddress: string
): Promise<{ challengeId: string; otpCode: string } | { error: string; status: number }> {
  const pool = getPool();

  const recentChallenge = await pool.query(
    `SELECT created_at FROM auth_otp_challenges
     WHERE destination = $1 AND purpose = $2
       AND created_at > now() - ($3 * interval '1 second')
     ORDER BY created_at DESC LIMIT 1`,
    [cleanEmail, purpose, OTP_COOLDOWN_SECONDS]
  );

  if (recentChallenge.rows.length > 0) {
    return {
      status: 429,
      error: `Please wait ${OTP_COOLDOWN_SECONDS} seconds before requesting another verification code.`,
    };
  }

  await pool.query(
    `UPDATE auth_otp_challenges
     SET consumed_at = now()
     WHERE destination = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [cleanEmail, purpose]
  );

  const challengeId = randomUUID();
  const otpCode = generateOtp();
  const otpHash = hashOtp(otpCode, challengeId);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    `INSERT INTO auth_otp_challenges (challenge_id, destination, channel, purpose, otp_hash, expires_at, max_attempts, request_ip)
     VALUES ($1, $2, 'email', $3, $4, $5, 5, $6)`,
    [challengeId, cleanEmail, purpose, otpHash, expiresAt, ipAddress]
  );

  const sent = await sendOTPEmail(cleanEmail, otpCode);
  if (!sent.success) {
    await pool.query(`UPDATE auth_otp_challenges SET consumed_at = now() WHERE challenge_id = $1`, [challengeId]);
    return { status: 503, error: 'Unable to send verification code. Please try again later.' };
  }

  return { challengeId, otpCode };
}

router.post('/request-otp', authLimiter, async (req: Request, res: Response) => {
  const { email, purpose = 'login' } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  const cleanEmail = normalizeEmail(email);
  const ipAddress = req.ip || '';

  try {
    const result = await createOtpChallenge(cleanEmail, purpose, ipAddress);
    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Verification code sent to your email',
      challengeId: result.challengeId,
      email: cleanEmail,
      requiresVerification: true,
    });
  } catch (err) {
    logger.error('Request OTP error', { error: err instanceof Error ? err.message : 'unknown' });
    return res.status(500).json({ error: 'Unable to process request' });
  }
});

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  req.body.purpose = 'signup';
  // Delegate to shared request-otp handler logic
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  const cleanEmail = normalizeEmail(email);
  const ipAddress = req.ip || '';
  try {
    const result = await createOtpChallenge(cleanEmail, 'signup', ipAddress);
    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(200).json({
      message: 'Verification code sent to your email',
      challengeId: result.challengeId,
      email: cleanEmail,
      requiresVerification: true,
    });
  } catch (err) {
    logger.error('Register OTP error', { error: err instanceof Error ? err.message : 'unknown' });
    return res.status(500).json({ error: 'Unable to process request' });
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  const cleanEmail = normalizeEmail(email);
  const ipAddress = req.ip || '';
  try {
    const result = await createOtpChallenge(cleanEmail, 'login', ipAddress);
    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(200).json({
      message: 'Verification code sent to your email',
      challengeId: result.challengeId,
      email: cleanEmail,
      requiresVerification: true,
    });
  } catch (err) {
    logger.error('Login OTP error', { error: err instanceof Error ? err.message : 'unknown' });
    return res.status(500).json({ error: 'Unable to process request' });
  }
});

router.post('/resend-otp', authLimiter, async (req: Request, res: Response) => {
  const { email, purpose = 'login' } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const cleanEmail = normalizeEmail(email);
  const ipAddress = req.ip || '';

  try {
    const result = await createOtpChallenge(cleanEmail, purpose, ipAddress);
    if ('error' in result) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({
      message: 'Verification code resent successfully',
      challengeId: result.challengeId,
      email: cleanEmail,
    });
  } catch (err) {
    logger.error('Resend OTP error', { error: err instanceof Error ? err.message : 'unknown' });
    return res.status(500).json({ error: 'Unable to process request' });
  }
});

/**
 * OTP verification — identity is ALWAYS taken from the challenge, never from a client-supplied email alone.
 */
router.post('/verify-otp', otpVerifyLimiter, async (req: Request, res: Response) => {
  const { email, otp, challengeId, name } = req.body;

  if (!otp) {
    return res.status(400).json({ error: 'Verification code is required' });
  }
  if (!challengeId || typeof challengeId !== 'string') {
    return res.status(400).json({ error: 'challengeId is required' });
  }

  const cleanOtp = otp.toString().trim();
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || '';
  const pool = getPool();

  try {
    const challengeRes = await pool.query(
      `SELECT * FROM auth_otp_challenges WHERE challenge_id = $1`,
      [challengeId]
    );
    const challenge = challengeRes.rows[0];

    // Uniform error to reduce challenge enumeration
    const invalidMsg = 'Verification code has expired or is invalid. Please request a new code.';

    if (!challenge) {
      return res.status(400).json({ error: invalidMsg });
    }
    if (challenge.consumed_at) {
      return res.status(400).json({ error: invalidMsg });
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await pool.query('UPDATE auth_otp_challenges SET consumed_at = now() WHERE challenge_id = $1', [
        challenge.challenge_id,
      ]);
      return res.status(400).json({ error: invalidMsg });
    }

    // If email is supplied for backwards compatibility, it MUST match challenge destination
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || normalizeEmail(email) !== normalizeEmail(challenge.destination)) {
        return res.status(400).json({ error: invalidMsg });
      }
    }

    // Identity ALWAYS comes from the challenge
    const challengeEmail = normalizeEmail(challenge.destination);

    if (challenge.attempt_count >= challenge.max_attempts) {
      await pool.query('UPDATE auth_otp_challenges SET consumed_at = now() WHERE challenge_id = $1', [
        challenge.challenge_id,
      ]);
      return res.status(429).json({
        error: 'Too many failed verification attempts. Please request a new code.',
      });
    }

    const isMatch = verifyOtpHash(cleanOtp, challenge.challenge_id, challenge.otp_hash);

    if (!isMatch) {
      const newAttempts = challenge.attempt_count + 1;
      await pool.query('UPDATE auth_otp_challenges SET attempt_count = $1 WHERE challenge_id = $2', [
        newAttempts,
        challenge.challenge_id,
      ]);
      const remaining = challenge.max_attempts - newAttempts;
      if (remaining <= 0) {
        await pool.query('UPDATE auth_otp_challenges SET consumed_at = now() WHERE challenge_id = $1', [
          challenge.challenge_id,
        ]);
        return res.status(429).json({
          error:
            'Maximum attempts reached. This verification code has been invalidated. Please request a new code.',
        });
      }
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Consume challenge (single-use) — prevent replay
    const consume = await pool.query(
      `UPDATE auth_otp_challenges
       SET consumed_at = now()
       WHERE challenge_id = $1 AND consumed_at IS NULL
       RETURNING challenge_id`,
      [challenge.challenge_id]
    );
    if (consume.rows.length === 0) {
      return res.status(400).json({ error: invalidMsg });
    }

    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [challengeEmail]);
    let user: Record<string, unknown>;

    if (userRes.rows.length === 0) {
      const userName =
        name && typeof name === 'string' ? name.trim() : challengeEmail.split('@')[0];
      const insertRes = await pool.query(
        `INSERT INTO users (email, name, is_verified, email_verified_at, last_login_at, account_status)
         VALUES ($1, $2, TRUE, now(), now(), 'active') RETURNING *`,
        [challengeEmail, userName]
      );
      user = insertRes.rows[0];
      await ensurePersonalOrganization(pool, String(user.id), `${userName}'s Organization`);
      await recordAudit(pool, {
        actorUserId: String(user.id),
        action: 'organization.created',
        resourceType: 'user',
        resourceId: String(user.id),
      });
    } else {
      const updateRes = await pool.query(
        `UPDATE users
         SET is_verified = TRUE,
             email_verified_at = COALESCE(email_verified_at, now()),
             last_login_at = now(),
             account_status = 'active',
             name = COALESCE($2, name)
         WHERE email = $1 RETURNING *`,
        [
          challengeEmail,
          name && typeof name === 'string' && name.trim() ? name.trim() : null,
        ]
      );
      user = updateRes.rows[0];
      await ensurePersonalOrganization(pool, String(user.id));
    }

    const session = await issueSession(String(user.id), userAgent, ipAddress);

    return res.json({
      message: 'Authentication successful',
      user: sanitizeUser(user),
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      refreshTokenExpiresAt: session.refreshTokenExpiresAt,
    });
  } catch (err) {
    logger.error('Verify OTP error', { error: err instanceof Error ? err.message : 'unknown' });
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.post('/refresh', authLimiter, async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(401).json({ error: 'Refresh token is required' });
  }

  const pool = getPool();
  const refreshHash = hashRefreshToken(refreshToken);
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || '';

  try {
    const result = await pool.query<{
      session_id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
      account_status: string;
    }>(
      `SELECT s.session_id, s.user_id, s.expires_at, s.revoked_at, u.account_status
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1`,
      [refreshHash]
    );

    const session = result.rows[0];

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    if (session.revoked_at) {
      await pool.query(
        'UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [session.user_id]
      );
      logger.warn('Refresh token reuse detected', { userId: session.user_id });
      return res.status(401).json({ error: 'Session invalidated. Please sign in again.' });
    }

    if (session.expires_at.getTime() <= Date.now() || session.account_status !== 'active') {
      return res.status(401).json({ error: 'Session has expired. Please sign in again.' });
    }

    await pool.query('UPDATE auth_sessions SET revoked_at = now() WHERE session_id = $1', [
      session.session_id,
    ]);

    const nextSession = await issueSession(session.user_id, userAgent, ipAddress);

    return res.json({
      token: nextSession.accessToken,
      accessToken: nextSession.accessToken,
      refreshToken: nextSession.refreshToken,
      accessTokenExpiresAt: nextSession.accessTokenExpiresAt,
      refreshTokenExpiresAt: nextSession.refreshTokenExpiresAt,
    });
  } catch (err) {
    logger.error('Token refresh error', { error: err instanceof Error ? err.message : 'unknown' });
    return res.status(500).json({ error: 'Unable to process request' });
  }
});

router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
  const pool = getPool();

  try {
    if (refreshToken && typeof refreshToken === 'string') {
      const refreshHash = hashRefreshToken(refreshToken);
      await pool.query('UPDATE auth_sessions SET revoked_at = now() WHERE refresh_token_hash = $1', [
        refreshHash,
      ]);
    }

    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          const claims = verifyAccessToken(parts[1]);
          if (claims.sessionId) {
            await pool.query('UPDATE auth_sessions SET revoked_at = now() WHERE session_id = $1', [
              claims.sessionId,
            ]);
          }
        }
      } catch {
        // Ignore token decode errors on logout
      }
    }

    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout error', { error: err instanceof Error ? err.message : 'unknown' });
    return res.status(500).json({ error: 'Unable to process request' });
  }
});

router.get('/me', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getPool();
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await pool.query(
      'SELECT id, email, name, is_verified, email_verified_at, account_status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    logger.error('Auth check error', { error: err instanceof Error ? err.message : 'unknown' });
    return res.status(500).json({ error: 'Unable to process request' });
  }
});

export default router;
