import { Router } from 'express';
import { startReconstruction, getJob } from '../services/reconstruction';
import path from 'path';

const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

export const reconstructRouter = Router();

// Start reconstruction from uploaded video
reconstructRouter.post('/start', async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    res.status(400).json({ error: 'filename is required' });
    return;
  }

  const videoPath = path.join(UPLOADS_DIR, filename);

  try {
    const job = await startReconstruction(videoPath);
    res.json({ jobId: job.id, status: job.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check reconstruction status
reconstructRouter.get('/status/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    splatPath: job.splatPath,
    error: job.error,
  });
});
