import type { DesignStyle, UploadResult, ReconstructionStatus } from './types';

const API_BASE = '/api';

export function uploadFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject(new Error(data.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed — file may be too large. Max ~100MB on free tier. Try a smaller file or compress your .splat.'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out. Try a smaller file.'));
    });

    xhr.timeout = 300000; // 5 min timeout
    xhr.send(formData);
  });
}

export async function listScenes(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/upload/scenes`);
  const data = await res.json();
  return data.scenes;
}

export async function startReconstruction(filename: string): Promise<{ jobId: string }> {
  const res = await fetch(`${API_BASE}/reconstruct/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Reconstruction failed to start');
  }

  return res.json();
}

export async function getReconstructionStatus(jobId: string): Promise<ReconstructionStatus> {
  const res = await fetch(`${API_BASE}/reconstruct/status/${jobId}`);
  if (!res.ok) throw new Error('Failed to get status');
  return res.json();
}

export async function getStyles(): Promise<DesignStyle[]> {
  const res = await fetch(`${API_BASE}/restyle/styles`);
  const data = await res.json();
  return data.styles;
}

export async function restyleView(
  imageBase64: string,
  mimeType: string,
  styleId: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const res = await fetch(`${API_BASE}/restyle/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType, styleId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Restyle failed');
  }

  return res.json();
}

export async function submitVideoRestyle(
  filename: string,
  styleId: string
): Promise<{ videoId: number; credits: number }> {
  const res = await fetch(`${API_BASE}/restyle/video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, styleId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Restyle submission failed');
  }

  return res.json();
}

export async function getVideoRestyleStatus(
  videoId: number
): Promise<{ status: 'processing' | 'completed' | 'failed'; url?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/restyle/video/status/${videoId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Status check failed');
  }
  return res.json();
}

export async function checkHealth(): Promise<{ status: string; hasPixVerseKey: boolean; hasGeminiKey: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
