import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { uploadRouter } from './routes/upload';
import { restyleRouter } from './routes/restyle';
import { reconstructRouter } from './routes/reconstruct';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // Also load from process env (Render)

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded splat files
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// Serve client build in production
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// API routes
app.use('/api/upload', uploadRouter);
app.use('/api/restyle', restyleRouter);
app.use('/api/reconstruct', reconstructRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasPixVerseKey: !!process.env.PIXVERSE_API_KEY,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
  });
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Interior Vision server running on http://localhost:${PORT}`);
  if (!process.env.PIXVERSE_API_KEY) {
    console.warn('WARNING: PIXVERSE_API_KEY not set. Video restyle will not work.');
    console.warn('Get a key at https://platform.pixverse.ai');
  }
});
