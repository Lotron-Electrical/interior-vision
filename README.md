# Interior Vision

Transform your home with AI interior design. Upload a video or 3D scan of your space, choose a design style, and explore your redesigned rooms in an immersive 3D environment.

**Powered by:** Gaussian Splatting (3D reconstruction) + Google Gemini / Nano Banana 2 (AI interior design)

## How It Works

1. **Upload** — Record a video walking through your house, or upload a pre-made 3D scan (.splat file)
2. **Reconstruct** — Your video is converted into a 3D Gaussian Splat scene (via tools like vid2scene, Polycam, or Luma AI)
3. **Explore** — Navigate your home in 3D using the browser-based Gaussian Splatting viewer
4. **Redesign** — Select a design style (Contemporary, French Provincial, Scandinavian, etc.) and click "Redesign This View" to see your space transformed by AI
5. **Compare** — View before/after comparisons in the gallery

## Quick Start

### 1. Get a Gemini API Key

Free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 2. Configure

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Install & Run

```bash
npm run install:all
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## Getting a 3D Scan (.splat file)

The app can accept .splat, .ply, and .ksplat files directly. To create one from a video of your house:

| Tool | Platform | Cost | Link |
|------|----------|------|------|
| vid2scene | Web (cloud) | Free | [vid2scene.com](https://vid2scene.com/) |
| Polycam | iOS/Android | Free tier | [poly.cam](https://poly.cam/) |
| Luma AI | iOS/Web | Free tier | [lumalabs.ai](https://lumalabs.ai/) |
| Scaniverse | iOS | Free | [scaniverse.com](https://scaniverse.com/) |

**Tips for filming:**
- Walk slowly and steadily through each room
- Cover all angles — orbit around furniture and corners
- Keep consistent lighting (avoid switching lights on/off mid-video)
- 30-60 seconds per room is usually sufficient

## Design Styles

| Style | Description |
|-------|-------------|
| Contemporary | Clean lines, neutral palette, modern furniture |
| French Provincial | Ornate carved furniture, soft muted colors, chandeliers |
| Scandinavian | Light wood, minimal, cozy hygge elements |
| Mid-Century Modern | Warm wood tones, iconic furniture, retro patterns |
| Industrial | Exposed brick, metal, raw wood, moody palette |
| Japanese Minimalist | Natural materials, low furniture, zen simplicity |
| Art Deco | Geometric patterns, jewel tones, luxurious glamour |
| Coastal / Hamptons | White and blue, natural textures, relaxed elegance |

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **3D Viewer:** [@mkkellogg/gaussian-splats-3d](https://github.com/mkkellogg/GaussianSplats3D) (Three.js)
- **AI Restyling:** Google Gemini API (Nano Banana 2 / gemini-2.0-flash-exp)
- **Backend:** Express + TypeScript
- **3D Reconstruction:** vid2scene API integration (or upload pre-made .splat files)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check + Gemini key status |
| POST | `/api/upload` | Upload video or .splat file |
| GET | `/api/upload/scenes` | List available .splat scenes |
| POST | `/api/reconstruct/start` | Start 3D reconstruction from video |
| GET | `/api/reconstruct/status/:id` | Poll reconstruction progress |
| GET | `/api/restyle/styles` | List available design styles |
| POST | `/api/restyle` | Restyle a captured view with Gemini |

## Production Deployment

```bash
# Build the client
npm run build

# Start the production server (serves client + API)
npm start
```

**Deploy to Render:**
- Build command: `cd client && npm install && npm run build && cd ../server && npm install`
- Start command: `cd server && npx tsx src/index.ts`
- Environment: Add `GEMINI_API_KEY`

## Architecture

```
User films house → Video upload → Frame extraction
                                        ↓
                              3D Gaussian Splatting
                              (vid2scene / Polycam)
                                        ↓
                              .splat file loaded in browser
                              (GaussianSplats3D / Three.js)
                                        ↓
                    User navigates 3D scene ←→ Captures current view
                                                      ↓
                                              Gemini API restyling
                                              (Nano Banana 2)
                                                      ↓
                                              Before/After gallery
```
