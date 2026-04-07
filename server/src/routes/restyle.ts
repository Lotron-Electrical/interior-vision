import { Router } from 'express';
import { restyleImage, getAvailableStyles } from '../services/gemini';

export const restyleRouter = Router();

// Get available design styles
restyleRouter.get('/styles', (_req, res) => {
  res.json({ styles: getAvailableStyles() });
});

// Restyle a captured view
restyleRouter.post('/', async (req, res) => {
  const { imageBase64, mimeType, styleId, customPrompt } = req.body;

  if (!imageBase64) {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }
  if (!styleId && !customPrompt) {
    res.status(400).json({ error: 'styleId or customPrompt is required' });
    return;
  }

  try {
    const result = await restyleImage(
      imageBase64,
      mimeType || 'image/png',
      styleId,
      customPrompt
    );
    res.json(result);
  } catch (err: any) {
    console.error('Restyle error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
