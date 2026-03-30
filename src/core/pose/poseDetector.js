/**
 * poseDetector.js
 * MediaPipe PoseLandmarker wrapper for use inside a Web Worker.
 * Uses @mediapipe/tasks-vision with WASM runtime.
 */

import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

let poseLandmarker = null;
let isInitializing = false;
let initPromise = null;

/**
 * Initialize the MediaPipe PoseLandmarker (called once inside worker).
 * @returns {Promise<void>}
 */
export async function initPoseDetector() {
  if (poseLandmarker) return;
  if (isInitializing) return initPromise;

  isInitializing = true;
  initPromise = (async () => {
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

    isInitializing = false;
  })();

  return initPromise;
}

/**
 * Run pose detection on an ImageBitmap frame.
 * @param {ImageBitmap} imageBitmap
 * @param {number} timestamp - performance.now() timestamp in ms
 * @returns {{ landmarks: Array, worldLandmarks: Array } | null}
 */
export function detectPose(imageBitmap, timestamp) {
  if (!poseLandmarker) return null;

  try {
    const results = poseLandmarker.detectForVideo(imageBitmap, timestamp);
    return {
      landmarks: results.landmarks ?? [],
      worldLandmarks: results.worldLandmarks ?? [],
    };
  } catch (e) {
    console.error('[PoseDetector] Detection error:', e);
    return null;
  }
}
