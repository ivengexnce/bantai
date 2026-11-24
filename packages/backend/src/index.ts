import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { authRateLimiter, voiceRateLimiter, generalRateLimiter } from './middleware/rate-limit.middleware';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import assistantRoutes from './routes/assistant.routes';
import learningRoutes from './routes/learning.routes';
import voiceRoutes from './routes/voice.routes';
import { inferenceService } from './services/ai/inference.service';

export const app = express();

// --- Security Headers (Helmet) ---
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to avoid blocking SSE / WebSocket; configure per-route if needed
  crossOriginEmbedderPolicy: false
}));

// --- CORS: strict allowlist ---
const ALLOWED_ORIGINS: string[] = [
  ...(config.clientUrls || []),
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://10.0.2.2:3000', // Android emulator
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) only in non-production
    if (!origin) {
      if (config.nodeEnv !== 'production') return callback(null, true);
      return callback(new Error('CORS: null origin rejected in production'), false);
    }
    const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' is not allowed`), false);
    }
  },
  credentials: true
}));

// --- Global Rate Limiting ---
app.use('/api', generalRateLimiter);

// Export individual limiters for route-level use
export { authRateLimiter, voiceRateLimiter };

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Root landing
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    message: 'BANTAI Backend API is running smoothly. For Web UI, open http://localhost:3001 in your browser.',
    webUI: 'http://localhost:3001',
    health: 'http://localhost:4000/api/health'
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

// Global Error Handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[BANTAI-SERVER-ERROR]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
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
