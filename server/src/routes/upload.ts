import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { listSplatFiles } from '../services/reconstruction';

const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${name}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_UPLOAD_MB || '500', 10)) * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedVideo = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
    const allowedSplat = ['.splat', '.ply', '.ksplat'];
    const ext = path.extname(file.originalname).toLowerCase();

    if ([...allowedVideo, ...allowedSplat].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Accepted: ${[...allowedVideo, ...allowedSplat].join(', ')}`));
    }
  },
});

export const uploadRouter = Router();

// Upload a video or splat file
uploadRouter.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const isSplat = ['.splat', '.ply', '.ksplat'].includes(ext);

  res.json({
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
    size: req.file.size,
    type: isSplat ? 'splat' : 'video',
  });
});

// List available splat files
uploadRouter.get('/scenes', (_req, res) => {
  const files = listSplatFiles();
  res.json({ scenes: files });
});
