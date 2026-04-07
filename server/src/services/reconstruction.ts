import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

export interface ReconstructionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoPath: string;
  splatPath?: string;
  error?: string;
  progress: number;
  createdAt: number;
}

// In-memory job store (in production, use a database)
const jobs = new Map<string, ReconstructionJob>();

export function getJob(id: string): ReconstructionJob | undefined {
  return jobs.get(id);
}

export function listSplatFiles(): string[] {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  return fs.readdirSync(UPLOADS_DIR)
    .filter(f => f.endsWith('.splat') || f.endsWith('.ply') || f.endsWith('.ksplat'))
    .map(f => `/uploads/${f}`);
}

export async function startReconstruction(videoPath: string): Promise<ReconstructionJob> {
  const jobId = `recon_${Date.now()}`;

  const job: ReconstructionJob = {
    id: jobId,
    status: 'pending',
    videoPath,
    progress: 0,
    createdAt: Date.now(),
  };

  jobs.set(jobId, job);

  // In a real implementation, this would:
  // 1. Extract frames from video using FFmpeg
  // 2. Send frames to vid2scene API or run local COLMAP + Gaussian Splatting
  // 3. Poll for completion
  // 4. Download the .splat file
  //
  // For now, we simulate the process and provide instructions for manual reconstruction.
  // Users can also upload pre-made .splat files directly.

  simulateReconstruction(job);

  return job;
}

async function simulateReconstruction(job: ReconstructionJob): Promise<void> {
  job.status = 'processing';

  // Simulate progress updates
  const steps = [
    { progress: 10, delay: 1000, msg: 'Extracting frames...' },
    { progress: 30, delay: 2000, msg: 'Detecting features...' },
    { progress: 50, delay: 2000, msg: 'Building point cloud...' },
    { progress: 70, delay: 2000, msg: 'Training gaussian splats...' },
    { progress: 90, delay: 1000, msg: 'Optimizing scene...' },
  ];

  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, step.delay));
    job.progress = step.progress;
  }

  // Check if a demo splat file exists
  const demoSplat = path.join(UPLOADS_DIR, 'demo.splat');
  if (fs.existsSync(demoSplat)) {
    job.splatPath = '/uploads/demo.splat';
    job.status = 'completed';
    job.progress = 100;
  } else {
    job.status = 'completed';
    job.progress = 100;
    job.error = 'DEMO_MODE: No reconstruction backend configured. Upload a .splat file directly or connect vid2scene API.';
  }
}
