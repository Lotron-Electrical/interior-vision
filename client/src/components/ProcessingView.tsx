import { useState, useEffect, useRef } from 'react';
import type { UploadResult } from '../types';
import { startReconstruction, getReconstructionStatus } from '../api';

interface Props {
  uploadResult: UploadResult;
  onComplete: (splatPath: string) => void;
  onBack: () => void;
}

export default function ProcessingView({ uploadResult, onComplete, onBack }: Props) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Starting reconstruction...');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const { jobId } = await startReconstruction(uploadResult.filename);
        setStatusText('Processing your video...');

        pollRef.current = setInterval(async () => {
          if (cancelled) return;

          try {
            const status = await getReconstructionStatus(jobId);
            setProgress(status.progress);

            if (status.progress < 30) setStatusText('Extracting frames from video...');
            else if (status.progress < 50) setStatusText('Detecting features and matching...');
            else if (status.progress < 70) setStatusText('Building 3D point cloud...');
            else if (status.progress < 90) setStatusText('Training Gaussian Splats...');
            else setStatusText('Finalizing scene...');

            if (status.status === 'completed') {
              if (pollRef.current) clearInterval(pollRef.current);

              if (status.splatPath) {
                onComplete(status.splatPath);
              } else {
                setError(status.error || 'Reconstruction completed but no splat file generated.');
              }
            }

            if (status.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current);
              setError(status.error || 'Reconstruction failed.');
            }
          } catch {
            // Retry on poll failures
          }
        }, 1000);
      } catch (err: any) {
        setError(err.message);
      }
    }

    run();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [uploadResult.filename, onComplete]);

  return (
    <div className="processing">
      <div className="processing__card">
        <h2 className="processing__title">Building Your 3D Scene</h2>

        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="processing__status">{statusText}</p>
        <p className="processing__status" style={{ marginTop: 8 }}>
          {progress}% complete
        </p>

        {error && (
          <div className="processing__error">
            <strong>Note:</strong> {error}
            <br /><br />
            For full 3D reconstruction from video, you need to process your video through
            a Gaussian Splatting tool first:
            <br /><br />
            <strong>Option 1:</strong> Use <a href="https://vid2scene.com/" target="_blank" rel="noopener">vid2scene.com</a> (free, cloud-based)
            <br />
            <strong>Option 2:</strong> Use <a href="https://poly.cam/" target="_blank" rel="noopener">Polycam</a> (mobile app)
            <br />
            <strong>Option 3:</strong> Use <a href="https://lumalabs.ai/" target="_blank" rel="noopener">Luma AI</a> (mobile/web)
            <br /><br />
            Then upload the resulting .splat file directly.
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button className="btn btn--secondary" onClick={onBack}>
            Back to Upload
          </button>
        </div>
      </div>
    </div>
  );
}
