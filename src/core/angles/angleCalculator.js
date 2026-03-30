/**
 * angleCalculator.js
 * Reusable joint angle computation for any three 2D/3D landmarks.
 */

/**
 * Calculate the angle (in degrees) at joint B, formed by points A-B-C.
 * Works with {x, y} or {x, y, z} landmark objects.
 *
 * @param {{ x: number, y: number }} a - First point (e.g. shoulder)
 * @param {{ x: number, y: number }} b - Vertex point (e.g. elbow)
 * @param {{ x: number, y: number }} c - End point (e.g. wrist)
 * @returns {number} Normalized angle in degrees [0, 180]
 */
export function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);

  let angle = Math.abs(radians * (180 / Math.PI));

  // Normalize to [0, 180]
  if (angle > 180) {
    angle = 360 - angle;
  }

  return angle;
}

/**
 * Clamp angle to [0, 180] for display and thresholds.
 * @param {number} degrees
 * @returns {number}
 */
export function normalizeAngleDegrees(degrees) {
  if (degrees == null || Number.isNaN(degrees)) return 0;
  return Math.max(0, Math.min(180, degrees));
}

/**
 * Calculate angle between two vectors from a common point.
 * Useful for back/trunk angle calculations.
 *
 * @param {{ x: number, y: number }} origin - Common origin point
 * @param {{ x: number, y: number }} p1 - First direction point
 * @param {{ x: number, y: number }} p2 - Second direction point
 * @returns {number} Angle in degrees [0, 180]
 */
export function calculateVectorAngle(origin, p1, p2) {
  const v1 = { x: p1.x - origin.x, y: p1.y - origin.y };
  const v2 = { x: p2.x - origin.x, y: p2.y - origin.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}
