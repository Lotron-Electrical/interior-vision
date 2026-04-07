import { useState, useRef, useCallback, useEffect } from 'react';
import type { DesignStyle } from '../types';
import { restyleView } from '../api';
import StyleSelector from './StyleSelector';

interface Props {
  videoUrl: string;
  styles: DesignStyle[];
  gallery: never[];
  onAddToGallery: (image: any) => void;
  onBack: () => void;
  hasGeminiKey: boolean;
}

type ProcessingState =
  | { phase: 'idle' }
  | { phase: 'extracting'; progress: number }
  | { phase: 'restyling'; current: number; total: number; currentFrameUrl?: string }
  | { phase: 'encoding' }
  | { phase: 'done'; videoUrl: string }
  | { phase: 'error'; message: string };

export default function VideoExplorer({
  videoUrl,
  styles,
  onBack,
  hasGeminiKey,
}: Props) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [fps, setFps] = useState(1);
  const [processing, setProcessing] = useState<ProcessingState>({ phase: 'idle' });
  const [videoDuration, setVideoDuration] = useState(0);
  const [cancelRequested, setCancelRequested] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    cancelRef.current = cancelRequested;
  }, [cancelRequested]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  }, []);

  const totalFrames = Math.max(1, Math.floor(videoDuration * fps));
  const estimatedMinutes = Math.ceil((totalFrames * 15) / 60); // ~15s per frame

  // Extract a single frame at a given time
  const extractFrameAt = useCallback((time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return reject(new Error('No video/canvas'));

      video.currentTime = time;
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No canvas context'));
        ctx.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
        video.onseeked = null;
      };
    });
  }, []);

  // Convert a data URL to an Image element
  const loadImage = (dataUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedStyle || !videoRef.current) return;

    cancelRef.current = false;
    setCancelRequested(false);
    videoRef.current.pause();

    const video = videoRef.current;
    const duration = video.duration;
    const frameCount = Math.max(1, Math.floor(duration * fps));
    const interval = duration / frameCount;

    // Step 1: Extract frames
    setProcessing({ phase: 'extracting', progress: 0 });
    const originalFrames: string[] = [];

    for (let i = 0; i < frameCount; i++) {
      if (cancelRef.current) {
        setProcessing({ phase: 'idle' });
        return;
      }
      const time = i * interval;
      const frame = await extractFrameAt(time);
      originalFrames.push(frame);
      setProcessing({ phase: 'extracting', progress: Math.round(((i + 1) / frameCount) * 100) });
    }

    // Step 2: Restyle each frame via Gemini
    const restyledFrames: string[] = [];

    for (let i = 0; i < originalFrames.length; i++) {
      if (cancelRef.current) {
        setProcessing({ phase: 'idle' });
        return;
      }

      setProcessing({
        phase: 'restyling',
        current: i + 1,
        total: originalFrames.length,
      });

      try {
        const base64 = originalFrames[i].split(',')[1];
        const mimeType = originalFrames[i].split(';')[0].split(':')[1];
        const result = await restyleView(base64, mimeType, selectedStyle);
        const restyledDataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
        restyledFrames.push(restyledDataUrl);

        setProcessing({
          phase: 'restyling',
          current: i + 1,
          total: originalFrames.length,
          currentFrameUrl: restyledDataUrl,
        });
      } catch (err: any) {
        // On rate limit or error, wait and retry once
        if (err.message.includes('429') || err.message.includes('rate')) {
          await new Promise(r => setTimeout(r, 10000));
          try {
            const base64 = originalFrames[i].split(',')[1];
            const mimeType = originalFrames[i].split(';')[0].split(':')[1];
            const result = await restyleView(base64, mimeType, selectedStyle);
            restyledFrames.push(`data:${result.mimeType};base64,${result.imageBase64}`);
          } catch (retryErr: any) {
            setProcessing({ phase: 'error', message: `Frame ${i + 1} failed after retry: ${retryErr.message}` });
            return;
          }
        } else {
          setProcessing({ phase: 'error', message: `Frame ${i + 1}: ${err.message}` });
          return;
        }
      }

      // Small delay between frames to avoid rate limiting
      if (i < originalFrames.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Step 3: Encode frames into a video using canvas + MediaRecorder
    setProcessing({ phase: 'encoding' });

    try {
      const firstImg = await loadImage(restyledFrames[0]);
      const encodeCanvas = document.createElement('canvas');
      encodeCanvas.width = firstImg.naturalWidth;
      encodeCanvas.height = firstImg.naturalHeight;
      const ctx = encodeCanvas.getContext('2d')!;

      const stream = encodeCanvas.captureStream(0); // 0 = manual frame control
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const videoBlob = await new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: 'video/webm' }));
        };

        mediaRecorder.start();

        (async () => {
          for (let i = 0; i < restyledFrames.length; i++) {
            const img = await loadImage(restyledFrames[i]);
            ctx.drawImage(img, 0, 0, encodeCanvas.width, encodeCanvas.height);

            // Request a frame from the stream
            const track = stream.getVideoTracks()[0] as any;
            if (track.requestFrame) track.requestFrame();

            // Hold each frame for the correct duration
            await new Promise(r => setTimeout(r, 1000 / fps));
          }

          // Hold last frame a bit longer
          await new Promise(r => setTimeout(r, 500));
          mediaRecorder.stop();
        })();
      });

      const outputUrl = URL.createObjectURL(videoBlob);
      setProcessing({ phase: 'done', videoUrl: outputUrl });
    } catch (err: any) {
      setProcessing({ phase: 'error', message: `Video encoding failed: ${err.message}` });
    }
  }, [selectedStyle, fps, extractFrameAt]);

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setCancelRequested(true);
  }, []);

  const handleDownload = useCallback(() => {
    if (processing.phase !== 'done') return;
    const a = document.createElement('a');
    a.href = processing.videoUrl;
    const styleName = styles.find(s => s.id === selectedStyle)?.name || 'restyled';
    a.download = `interior-vision-${styleName.toLowerCase().replace(/\s+/g, '-')}.webm`;
    a.click();
  }, [processing, selectedStyle, styles]);

  const handleReset = useCallback(() => {
    if (processing.phase === 'done') {
      URL.revokeObjectURL((processing as any).videoUrl);
    }
    setProcessing({ phase: 'idle' });
  }, [processing]);

  const isProcessing = processing.phase !== 'idle' && processing.phase !== 'done' && processing.phase !== 'error';

  return (
    <div className="explorer">
      {/* Header */}
      <div className="explorer__header">
        <div className="explorer__header-left">
          <button className="btn btn--ghost btn--sm" onClick={onBack} disabled={isProcessing}>
            ← Back
          </button>
          <span className="explorer__logo">Interior Vision</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="explorer__body">
        {/* Video / Output Area */}
        <div className="explorer__viewer">
          {processing.phase === 'done' ? (
            <video
              src={processing.videoUrl}
              controls
              autoPlay
              loop
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000',
              }}
            />
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000',
                display: processing.phase === 'restyling' && processing.currentFrameUrl ? 'none' : 'block',
              }}
            />
          )}

          {/* Show current restyled frame as preview during processing */}
          {processing.phase === 'restyling' && processing.currentFrameUrl && (
            <img
              src={processing.currentFrameUrl}
              alt="Current restyled frame"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                background: '#000',
              }}
            />
          )}

          {/* Hidden canvas for frame extraction */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {processing.phase === 'idle' && (
            <div className="viewer-controls">
              <span className="viewer-controls__hint">
                Select a style and click "Generate Restyled Video" to transform the entire walkthrough
              </span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="explorer__sidebar">
          {/* Processing Status */}
          {processing.phase !== 'idle' && (
            <div className="explorer__sidebar-section">
              <h3>Progress</h3>

              {processing.phase === 'extracting' && (
                <>
                  <p className="restyle-status">Extracting frames... {processing.progress}%</p>
                  <div className="progress-bar">
                    <div className="progress-bar__fill" style={{ width: `${processing.progress}%` }} />
                  </div>
                </>
              )}

              {processing.phase === 'restyling' && (
                <>
                  <p className="restyle-status">
                    Restyling frame {processing.current} of {processing.total}
                  </p>
                  <div className="progress-bar">
                    <div
                      className="progress-bar__fill"
                      style={{ width: `${Math.round((processing.current / processing.total) * 100)}%` }}
                    />
                  </div>
                  <p className="restyle-status" style={{ marginTop: 8, fontSize: '0.75rem' }}>
                    ~{Math.ceil(((processing.total - processing.current) * 16) / 60)} min remaining
                    &nbsp;|&nbsp; ~${(processing.current * 0.04).toFixed(2)} spent
                  </p>
                  <button
                    className="btn btn--secondary btn--sm"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </>
              )}

              {processing.phase === 'encoding' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" />
                  <p className="restyle-status">Encoding video...</p>
                </div>
              )}

              {processing.phase === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ color: 'var(--success)', fontWeight: 500 }}>
                    Video ready!
                  </p>
                  <button className="btn btn--primary" style={{ width: '100%' }} onClick={handleDownload}>
                    Download Video
                  </button>
                  <button className="btn btn--secondary btn--sm" style={{ width: '100%' }} onClick={handleReset}>
                    Generate Another
                  </button>
                </div>
              )}

              {processing.phase === 'error' && (
                <div>
                  <div className="api-warning">{processing.message}</div>
                  <button
                    className="btn btn--secondary btn--sm"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={handleReset}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Style Selection */}
          {(processing.phase === 'idle' || processing.phase === 'error') && (
            <div className="explorer__sidebar-section">
              <h3>Design Style</h3>
              <StyleSelector
                styles={styles}
                selectedStyle={selectedStyle}
                onSelect={setSelectedStyle}
              />
            </div>
          )}

          {/* Generation Controls */}
          {(processing.phase === 'idle' || processing.phase === 'error') && (
            <div className="explorer__sidebar-section">
              <h3>Generate Video</h3>
              <div className="restyle-controls">
                {!hasGeminiKey ? (
                  <div className="api-warning">
                    Add your <code>GEMINI_API_KEY</code> to <code>.env</code> to enable restyling.
                  </div>
                ) : (
                  <>
                    {/* FPS selector */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 6, color: 'var(--text-dim)' }}>
                        Frame rate
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[0.5, 1, 2].map(f => (
                          <button
                            key={f}
                            className={`btn btn--sm ${fps === f ? 'btn--primary' : 'btn--secondary'}`}
                            onClick={() => setFps(f)}
                            style={{ flex: 1 }}
                          >
                            {f}/s
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Estimate */}
                    {videoDuration > 0 && selectedStyle && (
                      <div style={{
                        marginBottom: 12,
                        padding: '10px 12px',
                        background: 'var(--bg)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        lineHeight: 1.7,
                      }}>
                        <div><strong>{totalFrames}</strong> frames from {Math.round(videoDuration)}s video</div>
                        <div>~<strong>{estimatedMinutes} min</strong> processing time</div>
                        <div>~<strong>${(totalFrames * 0.04).toFixed(2)}</strong> estimated Gemini API cost</div>
                      </div>
                    )}

                    <button
                      className="btn btn--primary"
                      style={{ width: '100%' }}
                      onClick={handleGenerate}
                      disabled={!selectedStyle}
                    >
                      Generate Restyled Video
                    </button>

                    {!selectedStyle && (
                      <p className="restyle-status">Select a design style first</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
