/**
 * frameAngles.js
 * Per-frame joint angles (MediaPipe landmarks), all in [0, 180]°.
 *
 * elbowAngle = ∠(shoulder, elbow, wrist)
 * kneeAngle  = ∠(hip, knee, ankle)
 * hipAngle   = ∠(shoulder, hip, knee)
 * bodyAngle  = ∠(shoulder, hip, ankle)  — trunk line relative to thigh–shin plane projection
 */

import { calculateAngle, normalizeAngleDegrees } from '../angles/angleCalculator.js';

/**
 * @param {Array<{x:number,y:number,visibility?:number}>|null} landmarks
 * @param {number} visibilityThreshold
 * @returns {{ elbowAngle: number, kneeAngle: number, hipAngle: number, bodyAngle: number } | null}
 */
export function computeFrameAngles(landmarks, visibilityThreshold = 0.5) {
  if (!landmarks || landmarks.length < 33) return null;

  const ok = (i) => {
    const p = landmarks[i];
    return p != null && (p.visibility ?? 1) >= visibilityThreshold;
  };

  const need = (indices) => indices.every((i) => ok(i));

  const Ls = 11,
    Rs = 12,
    Le = 13,
    Re = 14,
    Lw = 15,
    Rw = 16;
  const Lh = 23,
    Rh = 24,
    Lk = 25,
    Rk = 26,
    La = 27,
    Ra = 28;

  let elbowAngle = null;
  if (need([Ls, Le, Lw]) && need([Rs, Re, Rw])) {
    const left = calculateAngle(landmarks[Ls], landmarks[Le], landmarks[Lw]);
    const right = calculateAngle(landmarks[Rs], landmarks[Re], landmarks[Rw]);
    elbowAngle = normalizeAngleDegrees((left + right) / 2);
  }

  let kneeAngle = null;
  if (need([Lh, Lk, La]) && need([Rh, Rk, Ra])) {
    const left = calculateAngle(landmarks[Lh], landmarks[Lk], landmarks[La]);
    const right = calculateAngle(landmarks[Rh], landmarks[Rk], landmarks[Ra]);
    kneeAngle = normalizeAngleDegrees((left + right) / 2);
  }

  let hipAngle = null;
  if (need([Ls, Lh, Lk]) && need([Rs, Rh, Rk])) {
    const left = calculateAngle(landmarks[Ls], landmarks[Lh], landmarks[Lk]);
    const right = calculateAngle(landmarks[Rs], landmarks[Rh], landmarks[Rk]);
    hipAngle = normalizeAngleDegrees((left + right) / 2);
  }

  let bodyAngle = null;
  if (need([Ls, Lh, La]) && need([Rs, Rh, Ra])) {
    const left = calculateAngle(landmarks[Ls], landmarks[Lh], landmarks[La]);
    const right = calculateAngle(landmarks[Rs], landmarks[Rh], landmarks[Ra]);
    bodyAngle = normalizeAngleDegrees((left + right) / 2);
  }

  if (elbowAngle == null || kneeAngle == null || hipAngle == null || bodyAngle == null) {
    return null;
  }

  return { elbowAngle, kneeAngle, hipAngle, bodyAngle };
}
