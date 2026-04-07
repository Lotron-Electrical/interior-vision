import { GoogleGenerativeAI } from '@google/generative-ai';

const STYLE_PROMPTS: Record<string, string> = {
  contemporary: `Redesign this room in a Contemporary style. Use clean lines, neutral color palette with bold accent colors,
    minimal ornamentation, open and airy feel. Modern furniture with smooth surfaces, large windows with sheer curtains,
    statement lighting fixtures, and polished or matte finishes. Keep the room layout and architecture identical.`,

  'french-provincial': `Redesign this room in French Provincial style. Use soft, muted colors (cream, lavender, sage),
    ornate carved furniture with cabriole legs, toile and floral fabrics, crystal chandeliers, gilded mirrors,
    distressed wood finishes, and elegant drapery. Keep the room layout and architecture identical.`,

  scandinavian: `Redesign this room in Scandinavian style. Use white and light wood tones, minimal furniture with
    organic shapes, wool and linen textiles, hygge-inspired cozy elements, simple pendant lights, plants,
    and functional storage. Keep the room layout and architecture identical.`,

  'mid-century-modern': `Redesign this room in Mid-Century Modern style. Use warm wood tones (teak, walnut),
    iconic furniture pieces with tapered legs, bold geometric patterns, retro color palette (mustard, teal, orange),
    Eames-inspired chairs, Sputnik chandeliers, and statement art. Keep the room layout and architecture identical.`,

  industrial: `Redesign this room in Industrial style. Use exposed brick walls, metal and steel elements,
    raw wood surfaces, Edison bulb lighting, concrete floors, pipe shelving, leather furniture,
    and a dark moody color palette. Keep the room layout and architecture identical.`,

  'japanese-minimalist': `Redesign this room in Japanese Minimalist (Japandi) style. Use natural materials (bamboo, rice paper, stone),
    low-profile furniture, neutral earth tones, shoji screens, tatami-inspired flooring, bonsai plants,
    and intentional negative space. Keep the room layout and architecture identical.`,

  'art-deco': `Redesign this room in Art Deco style. Use bold geometric patterns, luxurious materials (velvet, marble, brass),
    jewel tones (emerald, sapphire, gold), sunburst mirrors, lacquered furniture, statement wallpaper,
    and glamorous lighting. Keep the room layout and architecture identical.`,

  coastal: `Redesign this room in Coastal/Hamptons style. Use white and blue color palette, natural woven textures (rattan, jute),
    light timber floors, shiplap walls, linen upholstery, nautical accents, large windows with sea views feel,
    and relaxed elegant furniture. Keep the room layout and architecture identical.`,
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

export async function restyleImage(
  imageBase64: string,
  mimeType: string,
  styleId: string,
  customPrompt?: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured. Get one at https://aistudio.google.com/apikey');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-image-generation',
    generationConfig: {
      responseModalities: ['image', 'text'],
    } as any,
  });

  const stylePrompt = customPrompt || STYLE_PROMPTS[styleId];
  if (!stylePrompt) {
    throw new Error(`Unknown style: ${styleId}. Available: ${Object.keys(STYLE_PROMPTS).join(', ')}`);
  }

  const prompt = `You are an expert interior designer. ${stylePrompt}

    IMPORTANT: Generate a photorealistic image of this exact same room completely redesigned in the specified style.
    The room dimensions, windows, doors, and architectural features must remain the same.
    Only change the furniture, decor, colors, materials, and styling.
    Output a single high-quality image.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType: mimeType as any,
        data: imageBase64,
      },
    },
  ]);

  const response = result.response;
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }

  const parts = candidates[0].content.parts;
  for (const part of parts) {
    if ((part as any).inlineData) {
      const inlineData = (part as any).inlineData;
      return {
        imageBase64: inlineData.data,
        mimeType: inlineData.mimeType || 'image/png',
      };
    }
  }

  throw new Error('Gemini API did not return an image. The model may not support image generation with this configuration.');
}
