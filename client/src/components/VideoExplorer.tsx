import { useState, useRef, useCallback, useEffect } from 'react';
import type { DesignStyle } from '../types';
import { submitVideoRestyle, getVideoRestyleStatus } from '../api';
import StyleSelector from './StyleSelector';

interface Props {
  videoUrl: string;
  filename: string;
  styles: DesignStyle[];
  onBack: () => void;
  hasPixVerseKey: boolean;
}

type ProcessingState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'processing'; videoId: number; elapsed: number }
  | { phase: 'done'; outputUrl: string }
  | { phase: 'error'; message: string };

export default function VideoExplorer({
  videoUrl,
  filename,
  styles,
  onBack,
  hasPixVerseKey,
}: Props) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ phase: 'idle' });
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setVideoDuration(videoRef.current.duration);
  }, []);

  const estimatedCredits = Math.ceil(videoDuration) * 10;
  const estimatedCost = (estimatedCredits / 200).toFixed(2);

  const handleGenerate = useCallback(async () => {
    if (!selectedStyle) return;

    setProcessing({ phase: 'uploading' });

    try {
      const { videoId, credits } = await submitVideoRestyle(filename, selectedStyle);
      console.log(`Restyle submitted. videoId=${videoId}, credits=${credits}`);

      let elapsed = 0;
      setProcessing({ phase: 'processing', videoId, elapsed: 0 });

      // Elapsed timer
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setProcessing(prev =>
          prev.phase === 'processing' ? { ...prev, elapsed } : prev
        );
      }, 1000);

      // Poll for completion every 4 seconds
      pollRef.current = setInterval(async () => {
        try {
          const result = await getVideoRestyleStatus(videoId);

          if (result.status === 'completed' && result.url) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            setProcessing({ phase: 'done', outputUrl: result.url });
          } else if (result.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            setProcessing({ phase: 'error', message: result.error || 'Generation failed' });
          }
        } catch {
          // Silently retry on poll failures
        }
      }, 4000);
    } catch (err: any) {
      setProcessing({ phase: 'error', message: err.message });
    }
  }, [selectedStyle, filename]);

  const handleReset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setProcessing({ phase: 'idle' });
  }, []);

  const isProcessing = processing.phase === 'uploading' || processing.phase === 'processing';

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
        {/* Video Area */}
        <div className="explorer__viewer">
          {processing.phase === 'done' ? (
            <video
              src={processing.outputUrl}
              controls
              autoPlay
              loop
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          )}

          {processing.phase === 'idle' && (
            <div className="viewer-controls">
              <span className="viewer-controls__hint">
                Select a style and generate a restyled video of your space
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

              {processing.phase === 'uploading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" />
                  <p className="restyle-status">Sending video to PixVerse...</p>
                </div>
              )}

              {processing.phase === 'processing' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div className="spinner" />
                    <p className="restyle-status">PixVerse is restyling your video...</p>
                  </div>
                  <p className="restyle-status" style={{ fontSize: '0.8rem' }}>
                    Elapsed: {Math.floor(processing.elapsed / 60)}:{String(processing.elapsed % 60).padStart(2, '0')}
                    <br />
                    This usually takes 1-3 minutes
                  </p>
                </>
              )}

              {processing.phase === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ color: 'var(--success)', fontWeight: 500 }}>
                    Video ready!
                  </p>
                  <a
                    href={processing.outputUrl}
                    target="_blank"
                    rel="noopener"
                    className="btn btn--primary"
                    style={{ width: '100%', textAlign: 'center' }}
                    download
                  >
                    Download Video
                  </a>
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
          {!isProcessing && processing.phase !== 'done' && (
            <div className="explorer__sidebar-section">
              <h3>Design Style</h3>
              <StyleSelector
                styles={styles}
                selectedStyle={selectedStyle}
                onSelect={setSelectedStyle}
              />
            </div>
          )}

          {/* Generate Controls */}
          {!isProcessing && processing.phase !== 'done' && (
            <div className="explorer__sidebar-section">
              <h3>Generate</h3>
              <div className="restyle-controls">
                {!hasPixVerseKey ? (
                  <div className="api-warning">
                    Add your <code>PIXVERSE_API_KEY</code> to enable video restyling.
                    Get one at <a href="https://platform.pixverse.ai" target="_blank" rel="noopener">platform.pixverse.ai</a>.
                  </div>
                ) : (
                  <>
                    {/* Cost estimate */}
                    {videoDuration > 0 && selectedStyle && (
                      <div style={{
                        marginBottom: 12,
                        padding: '10px 12px',
                        background: 'var(--bg)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        lineHeight: 1.7,
                      }}>
                        <div>{Math.round(videoDuration)}s video</div>
                        <div>~{estimatedCredits} PixVerse credits</div>
                        <div>~${estimatedCost} estimated cost</div>
                        {videoDuration > 16 && (
                          <div style={{ color: 'var(--warning)', marginTop: 4 }}>
                            Max 16 seconds — video will be trimmed
                          </div>
                        )}
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
