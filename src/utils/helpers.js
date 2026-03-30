/**
 * helpers.js
 * Voice coach (SpeechSynthesis) + utility functions.
 */

// ─── Voice Coach ───────────────────────────────────────────────────────────

/** Minimum milliseconds between consecutive speech of the same type */
const VOICE_DEBOUNCE_MS = 3000;

class VoiceCoach {
  constructor() {
    this._lastSpoken = new Map(); // message key → timestamp
    this._synth = window.speechSynthesis;
    this._enabled = true;
  }

  /**
   * Speak a message, debounced per key.
   * @param {string} text - The text to speak
   * @param {string} key - Debounce key (e.g. 'back_warn', 'rep_count')
   * @param {number} debounceMs - Silence period for this key
   */
  speak(text, key = text, debounceMs = VOICE_DEBOUNCE_MS) {
    if (!this._enabled || !this._synth) return;

    const now = Date.now();
    const last = this._lastSpoken.get(key) ?? 0;
    if (now - last < debounceMs) return;

    this._lastSpoken.set(key, now);

    // Cancel any pending utterances
    this._synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    this._synth.speak(utterance);
  }

  speakRepCount(count) {
    this.speak(String(count), 'rep_count', 100); // almost no debounce for counts
  }

  warnGoLower() {
    this.speak('Go lower', 'go_lower');
  }

  warnBackStraight() {
    this.speak('Keep your back straight', 'back_straight');
  }

  warnTooFast() {
    this.speak('Too fast! Slow down', 'too_fast');
  }

  speakDirect(text) {
    if (!this._enabled || !this._synth || !text) return;
    this._synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    this._synth.speak(utterance);
  }

  setEnabled(enabled) {
    this._enabled = enabled;
    if (!enabled) this._synth?.cancel();
  }
}

// Singleton
export const voiceCoach = new VoiceCoach();


// ─── FPS Tracker ───────────────────────────────────────────────────────────

export class FPSTracker {
  constructor(sampleSize = 60) {
    this._timestamps = [];
    this._sampleSize = sampleSize;
  }

  tick() {
    const now = performance.now();
    this._timestamps.push(now);
    if (this._timestamps.length > this._sampleSize) {
      this._timestamps.shift();
    }
  }

  get fps() {
    if (this._timestamps.length < 2) return 0;
    const span = this._timestamps[this._timestamps.length - 1] - this._timestamps[0];
    return Math.round(((this._timestamps.length - 1) / span) * 1000);
  }
}


// ─── Color helpers ──────────────────────────────────────────────────────────

export function lerpColor(c1, c2, t) {
  const parse = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}
