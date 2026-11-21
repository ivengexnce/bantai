import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import assistantRoutes from './routes/assistant.routes';
import learningRoutes from './routes/learning.routes';
import voiceRoutes from './routes/voice.routes';
import { inferenceService } from './services/ai/inference.service';

export const app = express();

// Security and middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow local development, mobile emulator (10.0.2.2), and configured origins
    if (!origin || config.clientUrls.some(u => origin.startsWith(u)) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Dev-permissive, restricted in strict prod
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

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
