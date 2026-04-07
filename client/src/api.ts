import type { DesignStyle, UploadResult, ReconstructionStatus } from './types';

const API_BASE = '/api';

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
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
  const res = await fetch(`${API_BASE}/restyle`, {
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

export async function checkHealth(): Promise<{ status: string; hasGeminiKey: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
