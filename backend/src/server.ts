import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { getPool } from './db.js';
import { swaggerSpec, swaggerUi } from './swagger.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import feedbackRoutes from './routes/feedbacks.js';
import analyticsRoutes from './routes/analytics.js';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Health check endpoint
 */
app.get('/', (req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'Node.js TypeScript API with Gemini is running' });
});

/**
 * Database health check endpoint
 */
app.get('/db-test', async (req: Request, res: Response) => {
    try {
        const pool = getPool();
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, time: result.rows[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Node.js TypeScript Server running on port ${PORT}`);
});
