export const SQUAT_CONFIG = {
  LANDMARKS: {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_FOOT: 31,
    RIGHT_FOOT: 32,
  },

  /** TOP: ∠(hip, knee, ankle) */
  KNEE_TOP_MIN: 160,
  KNEE_TOP_MAX: 180,

  /** BOTTOM: ∠(hip, knee, ankle) */
  KNEE_BOTTOM_MIN: 85,   // accepts parallel depth
  KNEE_BOTTOM_MAX: 115,  // accepts slightly above parallel too

  /** TOP: ∠(shoulder, hip, knee) — open hip */
  HIP_TOP_MIN: 150,

  /** BOTTOM: ∠(shoulder, hip, knee) — closed hip */
  HIP_BOTTOM_MAX: 105,

  /** BOTTOM: ∠(shoulder, hip, ankle) must be > this (upright torso) */
  BACK_BOTTOM_MIN: 140,

  /** Below this at rep completion → excessive forward lean */
  BACK_REP_MIN: 130,

  // Legacy display threshold (lean warning)
  BACK_STRAIGHT_MIN: 140,

  ASYMMETRY_THRESHOLD: 15,
  VALGUS_THRESHOLD: 0.04,
  MIN_REP_DURATION_MS: 800,
  SMOOTHING_WINDOW: 6,
  CONFIDENCE_THRESHOLD: 0.5,
  TOP_ANGLE_MAX: 185,
};
