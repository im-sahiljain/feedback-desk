import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

// Standard response formatter for rate limit errors
const rateLimitHandler = (message: string) => (_req: Request, res: Response) => {
    return res.status(429).json({
        error: message,
        retryAfter: res.getHeader('Retry-After')
    });
};

/**
 * General API Limiter
 * Applied globally to all /api routes to prevent DoS
 */
export const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 200, // max 200 requests per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler('Too many requests from this IP, please try again later.')
});

/**
 * Auth Limiter for Login, Registration & Resend OTP
 * Protects against credential stuffing, brute force, and email spam
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // max 10 attempts per 15 minutes
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler('Too many authentication attempts. Please try again after 15 minutes.')
});

/**
 * OTP Verification Limiter
 * Rate limits OTP validation requests
 */
export const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // max 10 verification attempts
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler('Too many verification attempts. Please wait a few minutes before trying again.')
});

/**
 * Feedback Submission Limiter
 * Protects against bot spam on public feedback endpoints (IP-based)
 */
export const feedbackSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 30, // max 30 submissions per 15 minutes per IP
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler('Submission limit reached. Please wait before submitting more feedback.')
});

/**
 * Per-destination public feedback limiter (keyed by path token + IP)
 */
export const publicDestinationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
        const token = String((req.params as { token?: string }).token || 'unknown');
        // ipKeyGenerator required by express-rate-limit for correct IPv6 handling
        return `dest:${token}:${ipKeyGenerator(req.ip || 'unknown')}`;
    },
    handler: rateLimitHandler('This feedback link has reached its submission limit. Please try again later.'),
});

/**
 * Executive Brief Generation Limiter
 * Protects expensive multi-turn Gemini LLM analytics generation.
 * cache_only reads skip this limiter (see analytics route).
 */
export const executiveBriefLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 10, // max 10 brief regenerations per 5 mins per IP
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => req.query.cache_only === 'true' && req.query.refresh !== 'true',
    handler: rateLimitHandler('Executive brief rate limit reached. Please wait before refreshing again.')
});
