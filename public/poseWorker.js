/**
 * poseWorker.js (Classic Worker)
 * Placed in public/ to bypass Vite bundler bugs with MediaPipe tasks-vision.
 */

// 1) Define a CommonJS environment so the CDN CJS bundle can load
self.module = { exports: {} };
self.exports = self.module.exports;

// 2) Load the tasks-vision CommonJS bundle securely via local file to bypass CDN MIME type warnings
importScripts('/vision_bundle.js');

// 3) Extract the exports
const { PoseLandmarker, FilesetResolver } = self.module.exports;

let poseLandmarker = null;
let initError = null;

async function init() {
  try {
    const vision = await FilesetResolver.forVisionTasks('/wasm');

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/models/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.55,
      minPosePresenceConfidence: 0.55,
      minTrackingConfidence: 0.6,
      outputSegmentationMasks: false,
    });

    self.postMessage({ type: 'READY' });
  } catch (err) {
    initError = err;
    try {
      // Fallback: try CPU delegate
      const vision = await FilesetResolver.forVisionTasks('/wasm');
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/pose_landmarker_lite.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.55,
        minPosePresenceConfidence: 0.55,
        minTrackingConfidence: 0.6,
        outputSegmentationMasks: false,
      });
      self.postMessage({ type: 'READY' });
    } catch (fallbackErr) {
      self.postMessage({ type: 'ERROR', message: fallbackErr.message || fallbackErr.toString() });
    }
  }
}

init();

self.onmessage = (event) => {
  const { type, imageBitmap, timestamp } = event.data;
  if (type !== 'DETECT') return;

  if (!poseLandmarker) {
    if (imageBitmap) imageBitmap.close();
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
