import { useState, useEffect, useCallback } from 'react';
import type { AppView, UploadResult, RestyledImage, DesignStyle } from './types';
import { checkHealth, getStyles, listScenes } from './api';
import Landing from './components/Landing';
import ProcessingView from './components/ProcessingView';
import SceneExplorer from './components/SceneExplorer';
import VideoExplorer from './components/VideoExplorer';
import './App.css';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [hasPixVerseKey, setHasPixVerseKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [styles, setStyles] = useState<DesignStyle[]>([]);
  const [splatUrl, setSplatUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [gallery, setGallery] = useState<RestyledImage[]>([]);
  const [existingScenes, setExistingScenes] = useState<string[]>([]);

  useEffect(() => {
    checkHealth().then(h => {
      setHasPixVerseKey(h.hasPixVerseKey);
      setHasGeminiKey(h.hasGeminiKey);
    }).catch(() => {});
    getStyles().then(setStyles).catch(() => {});
    listScenes().then(setExistingScenes).catch(() => {});
  }, []);

  const handleUpload = useCallback((result: UploadResult) => {
    setUploadResult(result);

    if (result.type === 'splat') {
      setSplatUrl(result.path);
      setView('explorer');
    } else {
      setVideoUrl(result.path);
      setView('video-explorer');
    }
  }, []);

  const handleReconstructionComplete = useCallback((splatPath: string) => {
    setSplatUrl(splatPath);
    setView('explorer');
  }, []);

  const handleLoadScene = useCallback((scenePath: string) => {
    setSplatUrl(scenePath);
    setView('explorer');
  }, []);

  const handleAddToGallery = useCallback((image: RestyledImage) => {
    setGallery(prev => [image, ...prev]);
  }, []);

  const handleBackToLanding = useCallback(() => {
    setView('landing');
    setSplatUrl(null);
    setVideoUrl(null);
    setUploadResult(null);
  }, []);

  return (
    <div className="app">
      {view === 'landing' && (
        <Landing
          onUpload={handleUpload}
          existingScenes={existingScenes}
          onLoadScene={handleLoadScene}
          hasGeminiKey={hasGeminiKey}
        />
      )}

      {view === 'processing' && uploadResult && (
        <ProcessingView
          uploadResult={uploadResult}
          onComplete={handleReconstructionComplete}
          onBack={handleBackToLanding}
        />
      )}

      {view === 'video-explorer' && videoUrl && uploadResult && (
        <VideoExplorer
          videoUrl={videoUrl}
          filename={uploadResult.filename}
          styles={styles}
          onBack={handleBackToLanding}
          hasPixVerseKey={hasPixVerseKey}
        />
      )}

      {view === 'explorer' && splatUrl && (
        <SceneExplorer
          splatUrl={splatUrl}
          styles={styles}
          gallery={gallery}
          onAddToGallery={handleAddToGallery}
          onBack={handleBackToLanding}
          hasGeminiKey={hasGeminiKey}
        />
      )}
    </div>
  );
}
