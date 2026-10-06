import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { loadConfig, getConfig } from './config/env.js';
import { getPool, closePool } from './db.js';
import { swaggerSpec, swaggerUi } from './swagger.js';
import { generalApiLimiter } from './middleware/rateLimiters.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import feedbackRoutes from './routes/feedbacks.js';
import analyticsRoutes from './routes/analytics.js';
import opsRoutes from './routes/ops.js';
import { startWorkers } from './jobs/worker.js';
import { getQueueDepth } from './jobs/queue.js';
import { logger } from './logging/logger.js';
import { toSafeClientError } from './errors/httpError.js';
import { runMigrations } from './db/migrate.js';

// Fail closed on missing secrets before accepting traffic
const config = loadConfig();

const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);
  const started = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      requestId,
      method: req.method,
      route: req.originalUrl?.split('?')[0],
      status: res.statusCode,
      durationMs: Date.now() - started,
    });
  });
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin) || config.env !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS policy blocked request'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-Id'],
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use('/api', generalApiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ops', opsRoutes);

if (config.env !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

/** Liveness — process is up */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'feedback-desk-backend' });
});

/** Readiness — config loaded + DB reachable (does not call AI) */
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    const depth = await getQueueDepth(pool);
    res.json({
      status: 'ready',
      database: true,
      config: true,
      queue: depth,
    });
  } catch {
    res.status(503).json({ status: 'not_ready', database: false });
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'OK', health: '/health', ready: '/ready' });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err instanceof Error ? err.message : 'unknown',
  });
  const safe = toSafeClientError(err);
  res.status(safe.status).json(safe.body);
});

let stopWorkers: (() => Promise<void>) | null = null;

async function boot() {
  if (process.env.RUN_MIGRATIONS_ON_START === 'true') {
    await runMigrations();
  }

  stopWorkers = startWorkers();

  const server = app.listen(config.port, () => {
    logger.info('Server started', { port: config.port, env: config.env });
  });

  const shutdown = async (signal: string) => {
    logger.info('Shutdown signal received', { signal });
    server.close(async () => {
      try {
        if (stopWorkers) await stopWorkers();
        await closePool();
      } finally {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(1), 20000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

boot().catch((err) => {
  logger.error('Fatal startup error', {
    error: err instanceof Error ? err.message : 'unknown',
  });
  process.exit(1);
});

export default app;
