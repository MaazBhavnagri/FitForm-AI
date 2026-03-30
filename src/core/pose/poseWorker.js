/**
 * poseWorker.js
 * Self-contained Web Worker for MediaPipe Pose Landmarker.
 * 
 * Uses ESM imports (works correctly when bundled by Vite via ?worker).
 * In production: fully bundled, zero issues.
 * In dev: Vite's module-worker transforms handle ESM.
 */

import { PoseLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

let poseLandmarker = null;
let initError = null;

async function init() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });

    self.postMessage({ type: 'READY' });
  } catch (err) {
    initError = err;
    // Fallback: try CPU delegate
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      });
      self.postMessage({ type: 'READY' });
    } catch (fallbackErr) {
      self.postMessage({ type: 'ERROR', message: fallbackErr.message });
    }
  }
}

init();

self.onmessage = (event) => {
  const { type, imageBitmap, timestamp } = event.data;
  if (type !== 'DETECT') return;

  if (!poseLandmarker) {
    if (imageBitmap) imageBitmap.close();
    // Still initializing, silently ignore
    return;
  }

  try {
    const results = poseLandmarker.detectForVideo(imageBitmap, timestamp);
    self.postMessage({
      type: 'RESULT',
      landmarks: results.landmarks ?? [],
      worldLandmarks: results.worldLandmarks ?? [],
    });
  } catch (err) {
    self.postMessage({ type: 'ERROR', message: err.message });
  } finally {
    if (imageBitmap) imageBitmap.close();
  }
};
