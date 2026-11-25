import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { isAllowedOrigin } from './config/origins';
import { authRateLimiter, voiceRateLimiter, generalRateLimiter } from './middleware/rate-limit.middleware';
import { rejectUnsafePayloadKeys } from './middleware/sanitize.middleware';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import assistantRoutes from './routes/assistant.routes';
import learningRoutes from './routes/learning.routes';
import voiceRoutes from './routes/voice.routes';
import { inferenceService } from './services/ai/inference.service';
import { sanitizeForLog } from './utils/security';

export const app = express();

class CorsOriginError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'CorsOriginError';
  }
}

app.disable('x-powered-by');
if (config.trustProxy !== 'false') {
  app.set(
    'trust proxy',
    config.trustProxy === 'true' ? true : /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : 1
  );
}

// --- Security Headers (Helmet) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
}));

// --- CORS: strict exact-origin allowlist ---
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      if (config.nodeEnv !== 'production') return callback(null, true);
      return callback(new CorsOriginError('CORS: Origin header required in production'), false);
    }
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new CorsOriginError(`CORS: origin '${sanitizeForLog(origin)}' is not allowed`), false);
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-elevenlabs-key', 'x-csrf-token'],
  credentials: true
}));

// --- Global Rate Limiting ---
app.use('/api', generalRateLimiter);

// Export individual limiters for route-level use
export { authRateLimiter, voiceRateLimiter };

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(rejectUnsafePayloadKeys);

// Root landing
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    message: 'BANTAI Backend API is running securely.',
    health: '/api/health'
  });
});

// Health Check
app.get('/api/health', async (_req, res) => {
  const backendStatus = await inferenceService.checkLocalBackendStatus();
  res.json({
    status: 'online',
    product: 'BANTAI',
    tagline: 'Apna Model. Apna Dimaag. Apna AI.',
    timestamp: new Date().toISOString(),
    aiEngine: backendStatus
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/voice', voiceRoutes);

// Global Error Handler (sanitized for production)
app.use((err: Error & { status?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof CorsOriginError || err.status === 403) {
    return res.status(403).json({ success: false, error: 'Forbidden: Cross-origin request denied.' });
  }
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).json({ success: false, error: 'Malformed JSON request payload.' });
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ success: false, error: 'Request payload exceeds maximum allowed size.' });
  }
  console.error('[BANTAI-SERVER-ERROR]', sanitizeForLog(err));
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Internal Server Error' : sanitizeForLog(err) || 'Internal Server Error'
  });
});

// Start listening if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`  BANTAI API Server running on port ${config.port}`);
    console.log(`  Tagline: Apna Model. Apna Dimaag. Apna AI.`);
    console.log(`  Inference Provider: ${config.inferenceProvider}`);
    console.log(`  Strict Data Separation: Active (Mongo=Users, Firebase=Chat)`);
    console.log(`====================================================`);
  });
}
