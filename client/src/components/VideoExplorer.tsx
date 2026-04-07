import { useState, useRef, useCallback } from 'react';
import type { DesignStyle, RestyledImage } from '../types';
import { restyleView } from '../api';
import StyleSelector from './StyleSelector';
import RestyledGallery from './RestyledGallery';

interface Props {
  videoUrl: string;
  styles: DesignStyle[];
  gallery: RestyledImage[];
  onAddToGallery: (image: RestyledImage) => void;
  onBack: () => void;
  hasGeminiKey: boolean;
}

export default function VideoExplorer({
  videoUrl,
  styles,
  gallery,
  onAddToGallery,
  onBack,
  hasGeminiKey,
}: Props) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [restyling, setRestyling] = useState(false);
  const [restyleError, setRestyleError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }, []);

  const handleRestyle = useCallback(async () => {
    if (!selectedStyle) return;

    // Pause video if playing
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPaused(true);
    }

    const dataUrl = captureFrame();
    if (!dataUrl) {
      setRestyleError('Could not capture frame. Make sure the video is loaded.');
      return;
    }

    setRestyling(true);
    setRestyleError(null);

    try {
      const base64 = dataUrl.split(',')[1];
      const mimeType = dataUrl.split(';')[0].split(':')[1];

      const result = await restyleView(base64, mimeType, selectedStyle);

      const styleName = styles.find(s => s.id === selectedStyle)?.name || selectedStyle;

      onAddToGallery({
        id: `restyle_${Date.now()}`,
        styleId: selectedStyle,
        styleName,
        originalDataUrl: dataUrl,
        restyledDataUrl: `data:${result.mimeType};base64,${result.imageBase64}`,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setRestyleError(err.message);
    } finally {
      setRestyling(false);
    }
  }, [selectedStyle, captureFrame, styles, onAddToGallery]);

  return (
    <div className="explorer">
      {/* Header */}
      <div className="explorer__header">
        <div className="explorer__header-left">
          <button className="btn btn--ghost btn--sm" onClick={onBack}>
            ← Back
          </button>
          <span className="explorer__logo">Interior Vision</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="explorer__body">
        {/* Video Player */}
        <div className="explorer__viewer">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            onPause={() => setIsPaused(true)}
            onPlay={() => setIsPaused(false)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#000',
            }}
          />
          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="viewer-controls">
            <span className="viewer-controls__hint">
              Pause the video on any room or angle, then click "Redesign This View"
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="explorer__sidebar">
          {/* Style Selection */}
          <div className="explorer__sidebar-section">
            <h3>Design Style</h3>
            <StyleSelector
              styles={styles}
              selectedStyle={selectedStyle}
              onSelect={setSelectedStyle}
            />
          </div>

          {/* Restyle Controls */}
          <div className="explorer__sidebar-section">
            <h3>Redesign</h3>
            <div className="restyle-controls">
              {!hasGeminiKey ? (
                <div className="api-warning">
                  Add your <code>GEMINI_API_KEY</code> to <code>.env</code> to enable restyling.
                </div>
              ) : (
                <>
                  <button
                    className="btn btn--primary"
                    style={{ width: '100%' }}
                    onClick={handleRestyle}
                    disabled={!selectedStyle || restyling}
                  >
                    {restyling ? (
                      <>
                        <div className="spinner" />
                        Redesigning...
                      </>
                    ) : (
                      'Redesign This View'
                    )}
                  </button>

                  {!selectedStyle && (
                    <p className="restyle-status">Select a design style first</p>
                  )}

                  {!isPaused && selectedStyle && (
                    <p className="restyle-status">Pause the video to capture a frame</p>
                  )}

                  {restyling && (
                    <p className="restyle-status">
                      Nano Banana 2 is reimagining your space... This may take 10-30 seconds.
                    </p>
                  )}

                  {restyleError && (
                    <div className="api-warning">{restyleError}</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Gallery */}
          <div className="explorer__sidebar-section">
            <h3>Gallery ({gallery.length})</h3>
            <RestyledGallery gallery={gallery} />
          </div>
        </div>
      </div>
    </div>
  );
}
