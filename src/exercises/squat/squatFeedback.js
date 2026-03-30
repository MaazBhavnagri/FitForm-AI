const _voiceDebounce = new Map();
const VOICE_COOLDOWN_MS = 4000;

export const SQUAT_FEEDBACK = {

  // severity 3 — Safety
  KNEE_VALGUS_LEFT: {
    msg: 'Left knee is caving in — push it out',
    severity: 3, type: 'safety', voice: true
  },
  KNEE_VALGUS_RIGHT: {
    msg: 'Right knee is caving in — push it out',
    severity: 3, type: 'safety', voice: true
  },
  BACK_FORWARD_LEAN: {
    msg: 'Keep your chest up — too much forward lean',
    severity: 3, type: 'safety', voice: true
  },
  ASYMMETRY_DETECTED: {
    msg: 'Uneven squat — distribute weight equally',
    severity: 3, type: 'safety', voice: true
  },

  // severity 2 — Form coaching
  GO_LOWER: {
    msg: 'Go lower — reach parallel depth',
    severity: 2, type: 'form', voice: false
  },
  SIT_BACK_MORE: {
    msg: 'Sit back more — hinge at the hips',
    severity: 2, type: 'form', voice: false
  },
  FULL_EXTENSION: {
    msg: 'Fully stand up at the top',
    severity: 2, type: 'form', voice: false
  },
  HALF_REP: {
    msg: 'Half rep — not counted, go all the way down',
    severity: 2, type: 'form', voice: true
  },
  SHALLOW_SQUAT: {
    msg: 'Too shallow — break parallel at the knees',
    severity: 2, type: 'form', voice: true
  },
  FEET_TOO_NARROW: {
    msg: 'Widen your stance slightly',
    severity: 2, type: 'form', voice: false
  },

  // severity 2 — Pace
  TOO_FAST: {
    msg: 'Slow down — control the movement',
    severity: 2, type: 'pace', voice: true
  },
  GOOD_PACE: {
    msg: 'Good pace, keep it up',
    severity: 2, type: 'pace', voice: false
  },

  // severity 1 — Motivation
  PERFECT_REP: {
    msg: 'Perfect squat',
    severity: 1, type: 'motivation', voice: true
  },
  GOOD_DEPTH: {
    msg: 'Great depth',
    severity: 1, type: 'motivation', voice: false
  },
  REST_DETECTED: {
    msg: 'Resume when ready',
    severity: 1, type: 'motivation', voice: false
  },
  CANNOT_SEE_LEGS: {
    msg: 'Cannot see legs clearly — step back from camera',
    severity: 2, type: 'form', voice: false
  },
};

export function resolveSquatFeedback(activeKeys) {
  const now = Date.now();
  const active = activeKeys
    .map(k => {
      const entry = SQUAT_FEEDBACK[k];
      if (!entry || typeof entry.severity !== 'number') return null;
      return { key: k, ...entry };
    })
    .filter(item => item !== null && typeof item.severity === 'number')
    .sort((a, b) => b.severity - a.severity);

  const voiceFeedback = active.find(f => {
    if (!f.voice) return false;
    const last = _voiceDebounce.get(f.key) ?? 0;
    if (now - last < VOICE_COOLDOWN_MS) return false;
    _voiceDebounce.set(f.key, now);
    return true;
  }) ?? null;

  return {
    primary:       active[0] ?? null,
    secondary:     active[1] ?? null,
    voiceFeedback,
  };
}
