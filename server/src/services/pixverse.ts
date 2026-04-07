import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const BASE_URL = 'https://app-api.pixverse.ai';

const STYLE_PROMPTS: Record<string, string> = {
  contemporary: 'Redesign this interior in Contemporary style. Clean lines, neutral colors with bold accents, modern furniture, polished finishes, statement lighting, open and airy feel.',
  'french-provincial': 'Redesign this interior in French Provincial style. Soft muted colors, ornate carved furniture, toile and floral fabrics, crystal chandeliers, gilded mirrors, distressed wood, elegant drapery.',
  scandinavian: 'Redesign this interior in Scandinavian style. White and light wood tones, minimal furniture, organic shapes, wool and linen textiles, hygge cozy elements, plants, functional storage.',
  'mid-century-modern': 'Redesign this interior in Mid-Century Modern style. Warm teak and walnut wood, iconic furniture with tapered legs, bold geometric patterns, retro mustard and teal colors, Eames chairs.',
  industrial: 'Redesign this interior in Industrial style. Exposed brick, metal and steel elements, raw wood, Edison bulbs, concrete floors, pipe shelving, leather furniture, dark moody palette.',
  'japanese-minimalist': 'Redesign this interior in Japanese Minimalist style. Natural bamboo, rice paper, stone, low-profile furniture, neutral earth tones, shoji screens, bonsai plants, intentional negative space.',
  'art-deco': 'Redesign this interior in Art Deco style. Bold geometric patterns, velvet, marble, brass, jewel tones emerald sapphire gold, sunburst mirrors, lacquered furniture, glamorous lighting.',
  coastal: 'Redesign this interior in Coastal Hamptons style. White and blue palette, rattan and jute textures, light timber floors, shiplap walls, linen upholstery, nautical accents, relaxed elegance.',
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

function headers(contentType?: string): Record<string, string> {
  const apiKey = process.env.PIXVERSE_API_KEY;
  if (!apiKey) throw new Error('PIXVERSE_API_KEY not set');

  const h: Record<string, string> = {
    'API-KEY': apiKey,
    'Ai-Trace-Id': randomUUID(),
  };
  if (contentType) h['Content-Type'] = contentType;
  return h;
}

// Upload video to PixVerse
export async function uploadToPixVerse(filePath: string): Promise<number> {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const res = await fetch(`${BASE_URL}/openapi/v2/media/upload`, {
    method: 'POST',
    headers: {
      'API-KEY': process.env.PIXVERSE_API_KEY!,
      'Ai-Trace-Id': randomUUID(),
      ...form.getHeaders(),
    } as any,
    body: form as any,
  });

  const data = await res.json() as any;
  if (data.ErrCode !== 0) throw new Error(data.ErrMsg || 'Upload to PixVerse failed');
  return data.Resp.media_id;
}

// Submit restyle job
export async function submitRestyle(
  mediaId: number,
  styleId: string,
  customPrompt?: string
): Promise<{ videoId: number; credits: number }> {
  const prompt = customPrompt || STYLE_PROMPTS[styleId];
  if (!prompt) throw new Error(`Unknown style: ${styleId}`);

  const body: any = {
    video_media_id: mediaId,
    restyle_prompt: prompt,
  };

  const res = await fetch(`${BASE_URL}/openapi/v2/video/restyle/generate`, {
    method: 'POST',
    headers: headers('application/json'),
    body: JSON.stringify(body),
  });

  const data = await res.json() as any;
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
    headers: headers(),
  });

  const data = await res.json() as any;
  if (data.ErrCode !== 0) throw new Error(data.ErrMsg || 'Failed to get result');

  const status = data.Resp.status;
  if (status === 1) {
    return { status: 'completed', url: data.Resp.url };
  } else if (status === 7) {
    return { status: 'failed', error: 'Content moderation failed' };
  } else if (status === 8) {
    return { status: 'failed', error: 'Video generation failed' };
  } else {
    return { status: 'processing' };
  }
}

// Get available PixVerse restyle effects
export async function getPixVerseStyles(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/openapi/v2/video/restyle/list?page_num=1&page_size=50`, {
      method: 'GET',
      headers: headers(),
    });
    const data = await res.json() as any;
    if (data.ErrCode === 0) return data.Resp || [];
  } catch {}
  return [];
}
