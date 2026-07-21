import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './lib/auth';
import health from './routes/health';
import chat from './routes/chat';
import confirmRoute from './routes/confirm';
import operationAnalysis from './routes/operationAnalysis';

const app = new Hono();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',')
  .map((o) => o.trim());

app.use('*', cors({
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.route('/', health);

app.use('/api/*', authMiddleware);
app.route('/', chat);
app.route('/', confirmRoute);
app.route('/', operationAnalysis);

const port = parseInt(process.env.PORT || '3001');

serve({ fetch: app.fetch, port }, () => {
  console.log(`🤖 GAIA server running on http://localhost:${port}`);
});
