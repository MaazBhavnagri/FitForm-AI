/**
 * stateMachine.js
 * TRUE state machine for exercise rep detection.
 * Reusable — can be configured for any exercise with phase thresholds.
 */

/** Enum of push-up states */
export const PushUpState = Object.freeze({
  TOP: 'TOP',
  GOING_DOWN: 'GOING_DOWN',
  BOTTOM: 'BOTTOM',
  GOING_UP: 'GOING_UP',
  IDLE: 'IDLE',
});

/**
 * PushUpStateMachine
 *
 * Rules:
 *  TOP      → angle 160–180
 *  BOTTOM   → angle 70–100 (valid depth)
 *  Rep counted ONLY on: TOP → GOING_DOWN → BOTTOM → GOING_UP → TOP
 */
export class PushUpStateMachine {
  /**
   * @param {Object} config
   * @param {number} config.topMin      - Min angle for TOP state (default 160)
   * @param {number} config.topMax      - Max angle for TOP state (default 180)
   * @param {number} config.bottomMin   - Min angle for BOTTOM state (default 70)
   * @param {number} config.bottomMax   - Max angle for BOTTOM state (default 100)
   * @param {number} config.minRepMs    - Min valid rep duration in ms (default 400)
   * @param {Function} config.onRepCounted - Callback({ repCount, depthAngle })
   */
  constructor(config = {}) {
    this.topMin = config.topMin ?? 160;
    this.topMax = config.topMax ?? 180;
    this.bottomMin = config.bottomMin ?? 70;
    this.bottomMax = config.bottomMax ?? 100;
    this.minRepMs = config.minRepMs ?? 400;
    this.onRepCounted = config.onRepCounted ?? (() => {});

    this.state = PushUpState.IDLE;
    this.repCount = 0;
    this.reachedBottom = false;
    this.phaseStartTime = null;
    this.prevAngle = null;
    this.depthAngle = null; // angle at the deepest point
    this._lastTopTime = null;
  }

  /**
   * Feed the current smoothed elbow angle to advance the state machine.
   * @param {number} angle - Smoothed elbow angle in degrees
   * @param {{ allowRepCount?: boolean }} [meta] - If allowRepCount is false, transitions run but reps are not incremented (e.g. knee push-ups).
   * @returns {string} New state
   */
  transition(angle, meta = {}) {
    const allowRepCount = meta.allowRepCount !== false;
    const now = performance.now();
    const direction = this._getDirection(angle);
    this.prevAngle = angle;

    const inTop = angle >= this.topMin && angle <= this.topMax;
    const inBottom = angle >= this.bottomMin && angle <= this.bottomMax;
    const goingDown = direction === 'decreasing';
    const goingUp = direction === 'increasing';

    switch (this.state) {
      case PushUpState.IDLE:
        // Wait for person to get into top position first
        if (inTop) {
          this.state = PushUpState.TOP;
          this._lastTopTime = now;
          this.reachedBottom = false;
        }
        break;

      case PushUpState.TOP:
        if (goingDown && !inTop) {
          this.state = PushUpState.GOING_DOWN;
          this.phaseStartTime = now;
          this.reachedBottom = false;
          this.depthAngle = angle;
        }
        break;

      case PushUpState.GOING_DOWN:
        // Track deepest angle
        if (angle < (this.depthAngle ?? angle)) {
          this.depthAngle = angle;
        }

        if (inBottom) {
          this.state = PushUpState.BOTTOM;
          this.reachedBottom = true;
        } else if (goingUp && !inBottom) {
          // Started going up without reaching bottom → invalid rep
          this.state = PushUpState.GOING_UP;
          this.reachedBottom = false;
        }
        break;

      case PushUpState.BOTTOM:
        if (goingUp) {
          this.state = PushUpState.GOING_UP;
        }
        break;

      case PushUpState.GOING_UP:
        if (inTop) {
          const elapsed = now - (this.phaseStartTime ?? now);
          if (
            allowRepCount &&
            this.reachedBottom &&
            elapsed >= this.minRepMs
          ) {
            this.repCount++;
            this.onRepCounted({
              repCount: this.repCount,
              depthAngle: this.depthAngle,
              durationMs: elapsed,
            });
          }
          this.state = PushUpState.TOP;
          this._lastTopTime = now;
          this.reachedBottom = false;
          this.depthAngle = null;
        }
        break;
    }

    return this.state;
  }

  /**
   * Determine movement direction based on previous angle.
   * @param {number} angle
   * @returns {'increasing' | 'decreasing' | 'stable'}
   */
  _getDirection(angle) {
    if (this.prevAngle === null) return 'stable';
    const delta = angle - this.prevAngle;
    if (delta < -1.5) return 'decreasing'; // arm bending
    if (delta > 1.5) return 'increasing';  // arm extending
    return 'stable';
  }

  /** Reset machine (call when pose is lost) */
  reset() {
    this.state = PushUpState.IDLE;
    this.reachedBottom = false;
    this.phaseStartTime = null;
    this.prevAngle = null;
    this.depthAngle = null;
    this._lastTopTime = null;
  }

  /** Returns current state label for display */
  get displayState() {
    const map = {
      [PushUpState.TOP]: 'TOP',
      [PushUpState.GOING_DOWN]: 'GOING DOWN',
      [PushUpState.BOTTOM]: 'BOTTOM',
      [PushUpState.GOING_UP]: 'GOING UP',
      [PushUpState.IDLE]: 'WAITING…',
    };
    return map[this.state] ?? this.state;
  }
}

export const SquatState = Object.freeze({
  TOP: 'TOP',
  GOING_DOWN: 'GOING_DOWN',
  BOTTOM: 'BOTTOM',
  GOING_UP: 'GOING_UP',
  IDLE: 'IDLE',
});

export class SquatStateMachine {
  constructor(config = {}) {
    this.topMin = config.topMin ?? 155;
    this.topMax = config.topMax ?? 180;
    this.bottomMin = config.bottomMin ?? 85;
    this.bottomMax = config.bottomMax ?? 110;
    this.minRepMs = config.minRepMs ?? 800;
    this.onRepCounted = config.onRepCounted ?? (() => {});

    // Config injected thresholds for hips
    this.hipTopMin = 155;
    this.hipBottomMax = 105;

    this.state = SquatState.IDLE;
    this.repCount = 0;
    this.reachedBottom = false;
    this.phaseStartTime = null;
    this.prevKneeAngle = null;
    this.depthAngle = null;
  }

  transition(kneeAngle, hipAngle) {
    const now = performance.now();
    const direction = this._getDirection(kneeAngle);
    this.prevKneeAngle = kneeAngle;

    const inTop = kneeAngle >= this.topMin && hipAngle >= this.hipTopMin;
    const inBottom = kneeAngle <= this.bottomMax && hipAngle <= this.hipBottomMax;
    const goingDown = direction === 'decreasing';
    const goingUp = direction === 'increasing';

    switch (this.state) {
      case SquatState.IDLE:
        if (inTop) {
          this.state = SquatState.TOP;
          this.reachedBottom = false;
        }
        break;

      case SquatState.TOP:
        if (goingDown && !inTop) {
          this.state = SquatState.GOING_DOWN;
          this.phaseStartTime = now;
          this.reachedBottom = false;
          this.depthAngle = kneeAngle;
        }
        break;

      case SquatState.GOING_DOWN:
        if (kneeAngle < (this.depthAngle ?? kneeAngle)) {
          this.depthAngle = kneeAngle;
        }
        if (inBottom) {
          this.state = SquatState.BOTTOM;
          this.reachedBottom = true;
        } else if (goingUp && !inBottom) {
          this.state = SquatState.GOING_UP;
          this.reachedBottom = false;
        }
        break;

      case SquatState.BOTTOM:
        if (goingUp) {
          this.state = SquatState.GOING_UP;
        }
        break;

      case SquatState.GOING_UP:
        if (inTop) {
          const elapsed = now - (this.phaseStartTime ?? now);
          if (this.reachedBottom && elapsed >= this.minRepMs) {
            this.repCount++;
            this.onRepCounted({
              repCount: this.repCount,
              depthAngle: this.depthAngle,
              durationMs: elapsed,
            });
          }
          this.state = SquatState.TOP;
          this.reachedBottom = false;
          this.depthAngle = null;
        }
        break;
    }

    return this.state;
  }

  _getDirection(angle) {
    if (this.prevKneeAngle === null) return 'stable';
    const delta = angle - this.prevKneeAngle;
    if (delta < -1.5) return 'decreasing';
    if (delta > 1.5) return 'increasing';
    return 'stable';
  }

  reset() {
    this.state = SquatState.IDLE;
    this.reachedBottom = false;
    this.phaseStartTime = null;
    this.prevKneeAngle = null;
    this.depthAngle = null;
  }
}
