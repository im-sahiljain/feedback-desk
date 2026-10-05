import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../db.js';
import { sendOTPEmail } from '../email.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default_dev_secret';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

const generateToken = (user: { id: string; email: string }) => {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
};

const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user and send verification OTP
 *     tags: [Auth]
 */
router.post('/register', async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = getPool();
    const cleanEmail = email.trim().toLowerCase();

    try {
        const userCheck = await pool.query('SELECT id, is_verified FROM users WHERE email = $1', [cleanEmail]);
        
        if (userCheck.rows.length > 0 && userCheck.rows[0].is_verified) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (userCheck.rows.length > 0 && !userCheck.rows[0].is_verified) {
            // Update unverified user record
            await pool.query(
                'UPDATE users SET password_hash = $1, name = $2, otp_code = $3, otp_expires_at = $4 WHERE email = $5',
                [hashedPassword, name, otpCode, otpExpiresAt, cleanEmail]
            );
        } else {
            // Insert new unverified user
            await pool.query(
                'INSERT INTO users (email, password_hash, name, is_verified, otp_code, otp_expires_at) VALUES ($1, $2, $3, FALSE, $4, $5)',
                [cleanEmail, hashedPassword, name, otpCode, otpExpiresAt]
            );
        }

        // Send OTP via Resend email service
        await sendOTPEmail(cleanEmail, otpCode);

        return res.status(200).json({
            message: 'Verification code sent to your email',
            email: cleanEmail,
            requiresVerification: true,
        });
    } catch (err: any) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: err.message || 'Server error during registration' });
    }
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP code and authenticate user
 *     tags: [Auth]
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const pool = getPool();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (user.is_verified) {
            const token = generateToken(user);
            delete user.password_hash;
            delete user.otp_code;
            delete user.otp_expires_at;
            return res.json({ message: 'Account is already verified', user, token });
        }

        if (!user.otp_code || user.otp_code !== cleanOtp) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (new Date(user.otp_expires_at) < new Date()) {
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }

        // Mark user as verified
        await pool.query(
            'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
            [user.id]
        );

        user.is_verified = true;
        delete user.password_hash;
        delete user.otp_code;
        delete user.otp_expires_at;

        const token = generateToken(user);

        return res.json({
            message: 'Account verified successfully',
            user,
            token
        });
    } catch (err: any) {
        console.error('OTP Verification Error:', err);
        return res.status(500).json({ error: err.message || 'Server error during OTP verification' });
    }
});

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP code to user email
 *     tags: [Auth]
 */
router.post('/resend-otp', async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const pool = getPool();
    const cleanEmail = email.trim().toLowerCase();

    try {
        const result = await pool.query('SELECT id, is_verified FROM users WHERE email = $1', [cleanEmail]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No account found with this email' });
        }

        if (result.rows[0].is_verified) {
            return res.status(400).json({ error: 'Account is already verified' });
        }

        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await pool.query(
            'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE email = $3',
            [otpCode, otpExpiresAt, cleanEmail]
        );

        await sendOTPEmail(cleanEmail, otpCode);

        return res.json({ message: 'Verification code resent successfully' });
    } catch (err: any) {
        console.error('Resend OTP Error:', err);
        return res.status(500).json({ error: err.message || 'Server error during OTP resend' });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 */
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = getPool();
    const cleanEmail = email.trim().toLowerCase();

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_verified) {
            // Generate & send new OTP if user is unverified
            const otpCode = generateOTP();
            const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await pool.query(
                'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3',
                [otpCode, otpExpiresAt, user.id]
            );

            await sendOTPEmail(cleanEmail, otpCode);

            return res.status(403).json({
                error: 'Account not verified. A verification code has been sent to your email.',
                requiresVerification: true,
                email: cleanEmail
            });
        }

        const token = generateToken(user);
        delete user.password_hash;
        delete user.otp_code;
        delete user.otp_expires_at;

        return res.json({ user, token });
    } catch (err: any) {
        console.error('Login error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 */
router.get('/me', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const pool = getPool();
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const result = await pool.query('SELECT id, email, name, is_verified, created_at FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Auth check error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

export default router;
