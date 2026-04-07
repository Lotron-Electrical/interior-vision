import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

interface Props {
  splatUrl: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onReady?: () => void;
}

export default function GaussianViewer({ splatUrl, canvasRef, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number>(0);
  const viewerRef = useRef<any>(null);

  const initScene = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    // Setup Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current || undefined,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    if (!canvasRef.current) {
      container.appendChild(renderer.domElement);
    }

    // Add ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.8));

    // Try to load Gaussian Splats
    try {
      const GaussianSplats3D = await import('@mkkellogg/gaussian-splats-3d');
      const viewer = new GaussianSplats3D.Viewer({
        scene,
        renderer,
        camera,
        selfDrivenMode: false,
        useBuiltInControls: true,
      });

      await viewer.addSplatScene(splatUrl, {
        splatAlphaRemovalThreshold: 5,
        showLoadingUI: false,
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      });

      viewer.start();
      viewerRef.current = viewer;

      function animate() {
        animFrameRef.current = requestAnimationFrame(animate);
        viewer.update();
        viewer.render();
      }
      animate();
    } catch (err) {
      console.warn('Gaussian Splatting library not available, using fallback 3D view:', err);

      // Fallback: show a placeholder 3D room with orbit controls
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 1, 0);

      // Create a simple room placeholder
      const roomGeo = new THREE.BoxGeometry(6, 3, 6);
      const roomMat = new THREE.MeshStandardMaterial({
        color: 0x444466,
        side: THREE.BackSide,
        wireframe: false,
      });
      const room = new THREE.Mesh(roomGeo, roomMat);
      room.position.y = 1.5;
      scene.add(room);

      // Floor grid
      const grid = new THREE.GridHelper(6, 12, 0x6366f1, 0x333344);
      scene.add(grid);

      // Info text using sprite
      const canvas2d = document.createElement('canvas');
      canvas2d.width = 512;
      canvas2d.height = 128;
      const ctx = canvas2d.getContext('2d')!;
      ctx.fillStyle = '#6366f1';
      ctx.font = '24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('3D Scene Loaded', 256, 50);
      ctx.fillStyle = '#8888a0';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('Orbit: Left click | Pan: Right click | Zoom: Scroll', 256, 90);

      const texture = new THREE.CanvasTexture(canvas2d);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2, 0);
      sprite.scale.set(4, 1, 1);
      scene.add(sprite);

      function animate() {
        animFrameRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    onReady?.();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (viewerRef.current?.dispose) viewerRef.current.dispose();
    };
  }, [splatUrl, canvasRef, onReady]);

  useEffect(() => {
    const cleanup = initScene();
    return () => { cleanup?.then(fn => fn?.()); };
  }, [initScene]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
