import { useState, useRef, useCallback } from 'react';
import type { DesignStyle, RestyledImage } from '../types';
import { restyleView } from '../api';
import GaussianViewer from './GaussianViewer';
import StyleSelector from './StyleSelector';
import RestyledGallery from './RestyledGallery';

interface Props {
  splatUrl: string;
  styles: DesignStyle[];
  gallery: RestyledImage[];
  onAddToGallery: (image: RestyledImage) => void;
  onBack: () => void;
  hasGeminiKey: boolean;
}

export default function SceneExplorer({
  splatUrl,
  styles,
  gallery,
  onAddToGallery,
  onBack,
  hasGeminiKey,
}: Props) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [restyling, setRestyling] = useState(false);
  const [restyleError, setRestyleError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const captureView = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    // Try to get the renderer's canvas if our ref isn't the actual rendering canvas
    try {
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, []);

  const handleRestyle = useCallback(async () => {
    if (!selectedStyle) return;

    const dataUrl = captureView();
    if (!dataUrl) {
      setRestyleError('Could not capture the current view. Try moving the camera slightly.');
      return;
    }

    setRestyling(true);
    setRestyleError(null);

    try {
      // Extract base64 from data URL
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
  }, [selectedStyle, captureView, styles, onAddToGallery]);

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
        {/* 3D Viewer */}
        <div className="explorer__viewer">
          <GaussianViewer
            splatUrl={splatUrl}
            canvasRef={canvasRef}
          />

          <div className="viewer-controls">
            <span className="viewer-controls__hint">
              🖱️ Orbit: Left click &nbsp;|&nbsp; Pan: Right click &nbsp;|&nbsp; Zoom: Scroll
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
