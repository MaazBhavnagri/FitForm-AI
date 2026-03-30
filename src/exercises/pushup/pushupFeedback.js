export const FEEDBACK = {

  // severity 3 — Safety (always shown first, voice enabled)
  HIPS_SAGGING: {
    msg: 'Hips are sagging — engage your core',
    severity: 3, type: 'safety', voice: true
  },
  HIPS_TOO_HIGH: {
    msg: 'Lower your hips — you are in a pike position',
    severity: 3, type: 'safety', voice: true
  },
  ELBOW_HYPEREXTENSION: {
    msg: 'Do not lock your elbows at the top',
    severity: 3, type: 'safety', voice: true
  },
  TOO_DEEP: {
    msg: 'Too deep — risk of shoulder strain',
    severity: 3, type: 'safety', voice: true
  },

  // severity 2 — Form coaching (visual priority, selective voice)
  BACK_NOT_STRAIGHT: {
    msg: 'Keep body straight',
    severity: 2, type: 'form', voice: true
  },
  DO_FULL_PUSHUP_LEGS: {
    msg: 'Do full push-up (legs straight)',
    severity: 2, type: 'form', voice: true
  },
  FULL_ROM: {
    msg: 'Use full range of motion',
    severity: 2, type: 'form', voice: false
  },
  GO_LOWER: {
    msg: 'Go lower for a full rep',
    severity: 2, type: 'form', voice: false
  },
  FULL_EXTENSION: {
    msg: 'Fully extend your arms at the top',
    severity: 2, type: 'form', voice: false
  },
  HEAD_DROPPING: {
    msg: 'Keep your head neutral — do not drop it',
    severity: 2, type: 'form', voice: false
  },
  HALF_REP: {
    msg: 'Half rep — not counted, go all the way down',
    severity: 2, type: 'form', voice: true
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

  // severity 1 — Motivation (only shown when nothing else fires)
  PERFECT_REP: {
    msg: 'Perfect rep',
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
  CANNOT_SEE_ARMS: {
    msg: 'Cannot see arms clearly — adjust your position',
    severity: 2, type: 'form', voice: false
  },
};

const _voiceDebounce = new Map();
const VOICE_COOLDOWN_MS = 4000;

export function resolveTopFeedback(activeKeys) {
  const now = Date.now();
  const active = activeKeys
    .map(k => {
      const entry = FEEDBACK[k];
      if (!entry || typeof entry.severity !== 'number') return null;
      return { key: k, ...entry };
    })
    .filter(item => item !== null && typeof item.severity === 'number')
    .sort((a, b) => b.severity - a.severity);

  // Find first voice-enabled entry that is not in cooldown
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
