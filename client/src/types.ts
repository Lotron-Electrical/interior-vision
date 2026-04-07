export interface DesignStyle {
  id: string;
  name: string;
  description: string;
}

export interface UploadResult {
  filename: string;
  path: string;
  size: number;
  type: 'splat' | 'video';
}

export interface ReconstructionStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  splatPath?: string;
  error?: string;
}

export interface RestyledImage {
  id: string;
  styleId: string;
  styleName: string;
  originalDataUrl: string;
  restyledDataUrl: string;
  timestamp: number;
}

export type AppView = 'landing' | 'processing' | 'explorer';
