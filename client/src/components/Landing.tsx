import { useState, useRef } from 'react';
import type { UploadResult } from '../types';
import { uploadFile } from '../api';

interface Props {
  onUpload: (result: UploadResult) => void;
  existingScenes: string[];
  onLoadScene: (path: string) => void;
  hasGeminiKey: boolean;
}

export default function Landing({ onUpload, existingScenes, onLoadScene, hasGeminiKey }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    setFileName(file.name);

    if (file.size > 100 * 1024 * 1024) {
      setError(`File is ${formatSize(file.size)} — max upload is ~100MB on the free tier. Compress your .splat file or use a smaller video.`);
      setUploading(false);
      return;
    }

    try {
      const result = await uploadFile(file, (percent) => {
        setUploadProgress(percent);
      });
      onUpload(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setFileName(null);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="landing">
      <div className="landing__hero">
        <h1 className="landing__title">Interior Vision</h1>
        <p className="landing__subtitle">
          Upload a video or 3D scan of your home, choose a design style,
          and explore your redesigned space in an immersive 3D environment.
          Powered by Gaussian Splatting and Nano Banana 2.
        </p>
      </div>

      <div className="landing__actions">
        {/* Upload Card */}
        <div className="landing__card">
          <h3>Upload Your Space</h3>
          <p>
            Upload a video walkthrough (.mp4, .mov) or a 3D scan file (.splat, .ply)
          </p>

          <div
            className={`upload-zone ${dragActive ? 'upload-zone--active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".mp4,.mov,.avi,.webm,.mkv,.splat,.ply,.ksplat"
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <>
                <div className="upload-zone__text" style={{ marginBottom: 12 }}>
                  Uploading {fileName} ({uploadProgress}%)
                </div>
                <div className="progress-bar" style={{ maxWidth: 300, margin: '0 auto' }}>
                  <div
                    className="progress-bar__fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="upload-zone__icon">📁</div>
                <div className="upload-zone__text">
                  {dragActive
                    ? 'Drop your file here'
                    : 'Drag & drop or click to browse'
                  }
                </div>
                <div className="upload-zone__formats">
                  Video: MP4, MOV, AVI, WebM &nbsp;|&nbsp; 3D: .splat, .ply, .ksplat &nbsp;|&nbsp; Max ~100MB
                </div>
              </>
            )}
          </div>

          {error && <div className="api-warning" style={{ marginTop: 12 }}>{error}</div>}
        </div>

        {/* Tips Card */}
        <div className="landing__card">
          <h3>Tips for Best Results</h3>
          <p style={{ color: 'var(--text)', lineHeight: 1.8 }}>
            <strong>For video uploads:</strong><br />
            Walk slowly through each room. Keep the camera steady.
            Cover all angles — move in a smooth path, don't rush.
            Good lighting makes a huge difference.<br /><br />
            <strong>For 3D scans:</strong><br />
            Use apps like Polycam, Scaniverse, or Luma AI to create a
            Gaussian Splat (.splat) file from your phone. Upload it directly
            for instant exploration.
          </p>
        </div>

        {/* Existing Scenes */}
        {existingScenes.length > 0 && (
          <div className="landing__card">
            <h3>Your Scenes</h3>
            <p>Previously uploaded 3D scenes ready to explore</p>
            <div className="scenes-list">
              {existingScenes.map(scene => (
                <button
                  key={scene}
                  className="scene-item"
                  onClick={() => onLoadScene(scene)}
                >
                  {scene.split('/').pop()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* API Key Warning */}
        {!hasGeminiKey && (
          <div className="api-warning">
            PixVerse API key not configured. Video restyling requires a key.
            Get one at <a href="https://platform.pixverse.ai" target="_blank" rel="noopener">platform.pixverse.ai</a>.
          </div>
        )}
      </div>
    </div>
  );
}
