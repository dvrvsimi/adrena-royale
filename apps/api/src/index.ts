import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { env, isProduction } from './config/env';
import routes from './routes';
import { processActiveRounds } from './jobs/roundProcessor';
import { updateAllStreaks } from './jobs/streakUpdater';
import { initCompetitionWebSocket, shutdownCompetitionWebSocket } from './services/competition-ws';
import { initStandingsWebSocket, shutdownStandingsWebSocket } from './services/standings-ws';

const app = express();

// Middleware
app.use(cors({
  origin: isProduction ? env.CORS_ORIGIN?.split(',') : '*',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api', routes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = env.PORT;
const server = app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);

  // Initialize Competition WebSocket for real-time position events
  initCompetitionWebSocket();

  // Initialize Standings WebSocket for real-time standings updates
  initStandingsWebSocket(server);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  shutdownCompetitionWebSocket();
  shutdownStandingsWebSocket();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// CRON JOBS
// ─────────────────────────────────────────────────────────────────────

// Process active rounds every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  try {
    await processActiveRounds();
  } catch (error) {
    console.error('Round processor error:', error);
  }
});

// Update streaks daily at midnight UTC
cron.schedule('0 0 * * *', async () => {
  try {
    await updateAllStreaks();
  } catch (error) {
    console.error('Streak updater error:', error);
  }
});

console.log('Cron jobs scheduled:');
console.log('  - Round processor: every 30 seconds');
console.log('  - Streak updater: daily at 00:00 UTC');

export default app;
