/**
 * poseValidation.js
 * Frame-level checks before exercise analysis (full body + coarse alignment).
 * Does not replace exercise-specific form checks inside analyzers.
 */

const NOSE = 0;
const L_SH = 11;
const R_SH = 12;
const L_HIP = 23;
const R_HIP = 24;
const L_ANK = 27;
const R_ANK = 28;

function vis(landmarks, idx, threshold) {
  const p = landmarks[idx];
  return p && (p.visibility ?? 1) >= threshold;
}

/**
 * @param {Array<{x:number,y:number,visibility?:number}>|null} landmarks
 * @param {number} [confidence=0.5]
 * @returns {{ ok: boolean, reason: string|null, message: string }}
 */
export function validatePosture(landmarks, confidence = 0.5) {
  if (!landmarks || landmarks.length < 33) {
    return {
      ok: false,
      reason: 'no_pose',
      message: 'No pose detected — stay in frame',
    };
  }

  if (!vis(landmarks, NOSE, confidence)) {
    return {
      ok: false,
      reason: 'head',
      message: 'Face the camera — head not visible',
    };
  }

  if (!vis(landmarks, L_ANK, confidence) || !vis(landmarks, R_ANK, confidence)) {
    return {
      ok: false,
      reason: 'ankles',
      message: 'Step back — feet and ankles must be visible',
    };
  }

  if (
    !vis(landmarks, L_SH, confidence) ||
    !vis(landmarks, R_SH, confidence) ||
    !vis(landmarks, L_HIP, confidence) ||
    !vis(landmarks, R_HIP, confidence)
  ) {
    return {
      ok: false,
      reason: 'torso',
      message: 'Show shoulders and hips — upper body not fully visible',
    };
  }

  const shY = (landmarks[L_SH].y + landmarks[R_SH].y) / 2;
  const hipY = (landmarks[L_HIP].y + landmarks[R_HIP].y) / 2;
  const ankY = (landmarks[L_ANK].y + landmarks[R_ANK].y) / 2;

  const upper = Math.abs(hipY - shY);
  const lower = Math.abs(ankY - hipY);
  if (upper < 0.03 || lower < 0.03) {
    return {
      ok: false,
      reason: 'alignment',
      message: 'Adjust camera — full body length not visible',
    };
  }

  return { ok: true, reason: null, message: '' };
}
