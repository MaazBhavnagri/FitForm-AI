/**
 * pushupConfig.js
 * All push-up detection thresholds and constants.
 * Modify here to tune sensitivity without touching logic files.
 */

export const PUSHUP_CONFIG = {
  // ─── Elbow ∠(shoulder, elbow, wrist) ─────────────────────────
  TOP_ANGLE_MIN: 160,
  TOP_ANGLE_MAX: 180,
  BOTTOM_ANGLE_MIN: 70,
  BOTTOM_ANGLE_MAX: 100,

  // ─── Body line ∠(shoulder, hip, ankle) at hip ───────────────
  /** TOP: must be > this; BOTTOM: must stay > this (plank integrity) */
  BODY_LINE_TOP_MIN: 150,
  BODY_LINE_BOTTOM_MIN: 150,
  /** Below this → sagging / invalid rep */
  BODY_SAG_MAX: 140,

  // Leg straight = full push-up; below this = knee push-up
  MIN_LEG_STRAIGHT_DEG: 150,
  KNEE_BENT_MAX_DEG: 130,

  // ─── Leg ∠(hip, knee, ankle) at knee ───────────────────────
  /** TOP: knees extended; below → knee push-up */
  KNEE_EXTENDED_MIN: 150,

  // ─── Rep validation ────────────────────────────────────────
  MIN_REP_DURATION_MS: 400,   // Ignore reps faster than this (noise)

  // ─── Landmark confidence ───────────────────────────────────
  CONFIDENCE_THRESHOLD: 0.5,

  // ─── Smoothing ─────────────────────────────────────────────
  SMOOTHING_WINDOW: 5,

  // ─── Direction sensitivity ─────────────────────────────────
  // Minimum angle delta (°) to register a direction change
  DIRECTION_THRESHOLD: 1.5,

  // ─── MediaPipe landmark indices (Pose Landmarker 33 points) ─
  LANDMARKS: {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    NOSE: 0,
  },

  // ─── Skeleton edges to draw ────────────────────────────────
  // Pairs of landmark indices that form skeleton bone lines
  SKELETON_EDGES: [
    [11, 13], [13, 15], // Left arm
    [12, 14], [14, 16], // Right arm
    [11, 12],            // Shoulders
    [11, 23], [12, 24], // Torso sides
    [23, 24],            // Hips
    [23, 25], [25, 27], // Left leg
    [24, 26], [26, 28], // Right leg
  ],

  // ─── Back segment edges (highlighted red when bad) ─────────
  BACK_EDGES: [
    [11, 23], [12, 24], [11, 12], [23, 24],
  ],
};
