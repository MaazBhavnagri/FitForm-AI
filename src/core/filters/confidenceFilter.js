/**
 * confidenceFilter.js
 * Filters MediaPipe landmarks by visibility/confidence score.
 */

/**
 * Check if a single landmark meets the confidence threshold.
 * @param {Object} landmark - MediaPipe landmark { x, y, z, visibility }
 * @param {number} threshold - Minimum visibility score (default: 0.5)
 * @returns {boolean}
 */
export function isLandmarkConfident(landmark, threshold = 0.5) {
  if (!landmark) return false;
  const score = landmark.visibility ?? landmark.score ?? 0;
  return score >= threshold;
}

/**
 * Check if ALL listed landmark indices are sufficiently confident.
 * @param {Array} landmarks - Array of landmark objects
 * @param {number[]} indices - Which indices to check
 * @param {number} threshold
 * @returns {boolean}
 */
export function areLandmarksConfident(landmarks, indices, threshold = 0.5) {
  if (!landmarks || landmarks.length === 0) return false;
  return indices.every((i) => isLandmarkConfident(landmarks[i], threshold));
}

/**
 * Build a map of landmark index → landmark for quick access.
 * Filters out landmarks below threshold.
 * @param {Array} landmarks
 * @param {number} threshold
 * @returns {Map<number, Object>}
 */
export function buildConfidentMap(landmarks, threshold = 0.5) {
  const map = new Map();
  if (!landmarks) return map;
  landmarks.forEach((lm, i) => {
    if (isLandmarkConfident(lm, threshold)) {
      map.set(i, lm);
    }
  });
  return map;
}
