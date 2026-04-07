import { Router } from 'express';
import path from 'path';
import { getAvailableStyles } from '../services/pixverse';
import { uploadToPixVerse, submitRestyle, getRestyleResult } from '../services/pixverse';

const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

export const restyleRouter = Router();

// Get available design styles
restyleRouter.get('/styles', (_req, res) => {
  res.json({ styles: getAvailableStyles() });
});

// Submit video restyle via PixVerse
restyleRouter.post('/video', async (req, res) => {
  const { filename, styleId, customPrompt } = req.body;

  if (!filename) {
    res.status(400).json({ error: 'filename is required' });
    return;
  }
  if (!styleId && !customPrompt) {
    res.status(400).json({ error: 'styleId or customPrompt is required' });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    // Upload to PixVerse
    const mediaId = await uploadToPixVerse(filePath);

    // Submit restyle
    const { videoId, credits } = await submitRestyle(mediaId, styleId, customPrompt);

    res.json({ videoId, credits, mediaId });
  } catch (err: any) {
    console.error('Restyle submit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Poll restyle status
restyleRouter.get('/video/status/:videoId', async (req, res) => {
  const videoId = parseInt(req.params.videoId, 10);
  if (isNaN(videoId)) {
    res.status(400).json({ error: 'Invalid videoId' });
    return;
  }

  try {
    const result = await getRestyleResult(videoId);
    res.json(result);
  } catch (err: any) {
    console.error('Restyle status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
