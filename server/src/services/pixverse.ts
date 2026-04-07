import fs from 'fs';
import { randomUUID } from 'crypto';

const BASE_URL = 'https://app-api.pixverse.ai';

const STYLE_PROMPTS: Record<string, string> = {
  contemporary: 'Redesign this interior in Contemporary style with clean lines, neutral colors, modern furniture, polished finishes, statement lighting',
  'french-provincial': 'Redesign this interior in French Provincial style with soft muted colors, ornate carved furniture, crystal chandeliers, gilded mirrors, elegant drapery',
  scandinavian: 'Redesign this interior in Scandinavian style with white and light wood tones, minimal furniture, wool textiles, cozy hygge elements, plants',
  'mid-century-modern': 'Redesign this interior in Mid-Century Modern style with warm teak walnut wood, iconic tapered leg furniture, bold geometric patterns, retro colors',
  industrial: 'Redesign this interior in Industrial style with exposed brick, metal steel elements, raw wood, Edison bulbs, concrete, leather furniture',
  'japanese-minimalist': 'Redesign this interior in Japanese Minimalist style with natural bamboo, rice paper, low furniture, neutral earth tones, intentional negative space',
  'art-deco': 'Redesign this interior in Art Deco style with bold geometric patterns, velvet marble brass, jewel tones, sunburst mirrors, glamorous lighting',
  coastal: 'Redesign this interior in Coastal Hamptons style with white blue palette, rattan jute textures, light timber, shiplap walls, linen upholstery',
};

export function getAvailableStyles(): Array<{ id: string; name: string; description: string }> {
  return [
    { id: 'contemporary', name: 'Contemporary', description: 'Clean lines, neutral palette, modern furniture' },
    { id: 'french-provincial', name: 'French Provincial', description: 'Ornate carved furniture, soft muted colors, chandeliers' },
    { id: 'scandinavian', name: 'Scandinavian', description: 'Light wood, minimal, cozy hygge elements' },
    { id: 'mid-century-modern', name: 'Mid-Century Modern', description: 'Warm wood, iconic furniture, retro patterns' },
    { id: 'industrial', name: 'Industrial', description: 'Exposed brick, metal, raw wood, moody palette' },
    { id: 'japanese-minimalist', name: 'Japanese Minimalist', description: 'Natural materials, low furniture, zen simplicity' },
    { id: 'art-deco', name: 'Art Deco', description: 'Geometric patterns, jewel tones, luxurious glamour' },
    { id: 'coastal', name: 'Coastal / Hamptons', description: 'White and blue, natural textures, relaxed elegance' },
  ];
}

function getApiKey(): string {
  const key = process.env.PIXVERSE_API_KEY;
  if (!key) throw new Error('PIXVERSE_API_KEY not set');
  return key;
}

// Upload video to PixVerse
export async function uploadToPixVerse(filePath: string): Promise<number> {
  const traceId = randomUUID();
  const fileName = filePath.split('/').pop() || 'video.mp4';
  console.log(`[PixVerse] Uploading ${filePath}, trace=${traceId}`);

  // Read file as buffer and create a Blob for native FormData
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'video/mp4' });

  const form = new FormData();
  form.append('file', blob, fileName);

  const res = await fetch(`${BASE_URL}/openapi/v2/media/upload`, {
    method: 'POST',
    headers: {
      'API-KEY': getApiKey(),
      'Ai-Trace-Id': traceId,
    },
    body: form,
  });

  const text = await res.text();
  console.log(`[PixVerse] Upload response: ${text.substring(0, 500)}`);

  const data = JSON.parse(text);
  if (data.ErrCode !== 0) throw new Error(data.ErrMsg || 'Upload to PixVerse failed');

  const mediaId = data.Resp.media_id;
  console.log(`[PixVerse] Upload success, media_id=${mediaId} (type: ${typeof mediaId})`);
  return mediaId;
}

// Submit restyle job
export async function submitRestyle(
  mediaId: number,
  styleId: string,
  customPrompt?: string
): Promise<{ videoId: number; credits: number }> {
  const prompt = customPrompt || STYLE_PROMPTS[styleId];
  if (!prompt) throw new Error(`Unknown style: ${styleId}`);

  const traceId = randomUUID();

  // Build request body — ensure media_id is an integer
  const body = {
    video_media_id: Number(mediaId),
    restyle_prompt: prompt,
  };

  console.log(`[PixVerse] Submitting restyle, trace=${traceId}, body=${JSON.stringify(body)}`);

  const res = await fetch(`${BASE_URL}/openapi/v2/video/restyle/generate`, {
    method: 'POST',
    headers: {
      'API-KEY': getApiKey(),
      'Ai-Trace-Id': traceId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`[PixVerse] Restyle response: ${text.substring(0, 500)}`);

  const data = JSON.parse(text);
  if (data.ErrCode !== 0) throw new Error(data.ErrMsg || 'Restyle submission failed');
  return { videoId: data.Resp.video_id, credits: data.Resp.credits };
}

// Poll for result
export async function getRestyleResult(videoId: number): Promise<{
  status: 'processing' | 'completed' | 'failed';
  url?: string;
  error?: string;
}> {
  const res = await fetch(`${BASE_URL}/openapi/v2/video/result/${videoId}`, {
    method: 'GET',
    headers: {
      'API-KEY': getApiKey(),
      'Ai-Trace-Id': randomUUID(),
    },
  });

  const data = await res.json() as any;
  if (data.ErrCode !== 0) throw new Error(data.ErrMsg || 'Failed to get result');

  const status = data.Resp.status;
  if (status === 1) return { status: 'completed', url: data.Resp.url };
  if (status === 7) return { status: 'failed', error: 'Content moderation failed' };
  if (status === 8) return { status: 'failed', error: 'Video generation failed' };
  return { status: 'processing' };
}
