declare module '@mkkellogg/gaussian-splats-3d' {
  import * as THREE from 'three';

  export class Viewer {
    constructor(options?: {
      scene?: THREE.Scene;
      renderer?: THREE.WebGLRenderer;
      camera?: THREE.PerspectiveCamera;
      selfDrivenMode?: boolean;
      useBuiltInControls?: boolean;
    });

    addSplatScene(
      url: string,
      options?: {
        splatAlphaRemovalThreshold?: number;
        showLoadingUI?: boolean;
        position?: number[];
        rotation?: number[];
        scale?: number[];
      }
    ): Promise<void>;

    start(): void;
    update(): void;
    render(): void;
    dispose(): void;
  }
}
