/**
 * Camera.jsx
 * Renders the hidden video element and canvas overlay for skeleton drawing.
 */
import { useEffect, useRef, useState } from 'react';
import { PUSHUP_CONFIG as C } from '../exercises/pushup/pushupConfig.js';

// Skeleton colors
const COLOR_GOOD = '#10b981'; // emerald-500
const COLOR_BAD  = '#ef4444'; // red-500
const COLOR_JOINT = '#a78bfa'; // violet-400
const COLOR_JOINT_WARN = '#f87171'; // red-400

/**
 * @param {{ videoRef, canvasRef, latestLandmarks, backOk: boolean, exerciseLabel: string }} props
 */
export default function Camera({ videoRef, canvasRef, latestLandmarks, backOk, exerciseLabel }) {
  const rafRef = useRef(null);

  const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.5, 2.0];
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoomLevel = ZOOM_STEPS[zoomIndex];

  const handleZoomClick = async () => {
    const nextIndex = (zoomIndex + 1) % ZOOM_STEPS.length;
    const level = ZOOM_STEPS[nextIndex];
    setZoomIndex(nextIndex);

    const videoElement = videoRef.current;
    
    // Try native zoom first (Android Chrome only)
    if (videoElement && videoElement.srcObject) {
      try {
        const track = videoElement.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if (capabilities && capabilities.zoom) {
          const min = capabilities.zoom.min;
          const max = capabilities.zoom.max;
          const native = min + (level - 0.5) * ((max - min) / 1.5);
          await track.applyConstraints({ 
            advanced: [{ zoom: Math.min(Math.max(native, min), max) }] 
          });
          return;
        }
      } catch (e) {
        // Native zoom not supported, fall through to digital zoom
      }
    }

    // Digital zoom fallback
    const canvas = canvasRef.current;
    if (canvas && videoElement) {
      videoElement.style.transform = `scale(${level}) scaleX(-1)`;
      canvas.style.transform = `scale(${level}) scaleX(-1)`;
      videoElement.style.transformOrigin = 'center center';
      canvas.style.transformOrigin = 'center center';
    }
  };

  // Setup canvas size when video loads
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const onPlay = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };
    
    video.addEventListener('loadedmetadata', onPlay);
    return () => video.removeEventListener('loadedmetadata', onPlay);
  }, [videoRef, canvasRef]);

  return (
    <div className="camera-wrapper rounded-2xl overflow-hidden bg-black w-full h-full relative">
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="bg-emerald-500/80 backdrop-blur-md text-white font-black text-2xl uppercase tracking-wider px-4 py-2 rounded-lg border border-emerald-400/50 shadow-lg">
          {exerciseLabel || 'Detecting...'}
        </div>
      </div>
      {/* Hidden video - mirrored via CSS */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      {/* Skeleton canvas overlay - also mirrored to match video */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          pointerEvents: 'none',
          transform: 'scaleX(-1)',
        }}
      />
      <button
        id="zoom-btn"
        onClick={handleZoomClick}
        className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white font-bold text-xs px-4 py-2 rounded-full border border-white/20 z-20 pointer-events-auto hover:bg-black/80 transition-colors shadow-xl"
      >
        {zoomLevel}x
      </button>
    </div>
  );
}

export function drawSkeleton(ctx, landmarks, canvasW, canvasH, backOk) {
  const toCanvas = (lm) => ({
    x: lm.x * canvasW,
    y: lm.y * canvasH,
  });

  const backEdgeSet = new Set(
    C.BACK_EDGES.map(([a, b]) => `${a}-${b}`)
  );

  // Draw bone lines
  ctx.lineWidth = 3;
  for (const [i, j] of C.SKELETON_EDGES) {
    const lm1 = landmarks[i];
    const lm2 = landmarks[j];
    if (!lm1 || !lm2) continue;

    const v1 = lm1.visibility ?? 0;
    const v2 = lm2.visibility ?? 0;
    if (v1 < 0.5 || v2 < 0.5) continue;

    const key = `${i}-${j}`;
    const isBackEdge = backEdgeSet.has(key);
    ctx.strokeStyle = (isBackEdge && !backOk) ? COLOR_BAD : COLOR_GOOD;

    const p1 = toCanvas(lm1);
    const p2 = toCanvas(lm2);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Draw joint circles
  const jointIndices = new Set(C.SKELETON_EDGES.flat());
  for (const idx of jointIndices) {
    const lm = landmarks[idx];
    if (!lm || (lm.visibility ?? 0) < 0.5) continue;

    const pt = toCanvas(lm);
    const isBackJoint = [11, 12, 23, 24].includes(idx);
    ctx.fillStyle = (isBackJoint && !backOk) ? COLOR_JOINT_WARN : COLOR_JOINT;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
