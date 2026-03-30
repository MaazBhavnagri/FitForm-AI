/**
 * pushupLogic.js
 * Central push-up analysis class.
 * Accepts raw MediaPipe landmarks and returns structured rep + quality data.
 */

import { calculateAngle, normalizeAngleDegrees } from '../../core/angles/angleCalculator.js';
import { MovingAverageFilter } from '../../core/filters/smoothing.js';
import { areLandmarksConfident } from '../../core/filters/confidenceFilter.js';
import { PushUpStateMachine, PushUpState } from '../../core/state/stateMachine.js';
import { PUSHUP_CONFIG as C } from './pushupConfig.js';
import { FEEDBACK, resolveTopFeedback } from './pushupFeedback.js';

const L = C.LANDMARKS;

/** @typedef {'FULL_PUSHUP' | 'KNEE_PUSHUP' | 'INVALID'} PushUpTypeKind */
export const PushUpType = Object.freeze({
  FULL_PUSHUP: 'FULL_PUSHUP',
  KNEE_PUSHUP: 'KNEE_PUSHUP',
  INVALID: 'INVALID',
});

export class PushUpAnalyzer {
  constructor() {
    this._lastSide = null;
    this._lastMovementTime = Date.now();
    this._prevElbowAngle = null;

    this._elbowFilterLeft = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._elbowFilterRight = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._torsoLineFilter = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._legLineFilter = new MovingAverageFilter(C.SMOOTHING_WINDOW);

    this._stateMachine = new PushUpStateMachine({
      topMin: C.TOP_ANGLE_MIN,
      topMax: C.TOP_ANGLE_MAX,
      bottomMin: C.BOTTOM_ANGLE_MIN,
      bottomMax: C.BOTTOM_ANGLE_MAX,
      minRepMs: C.MIN_REP_DURATION_MS,
      onRepCounted: (data) => this._onRep(data),
    });

    this._repCount = 0;
    this._lastRepData = null;
    this._lastDepthScore = 0;
    this._backOk = true;
    this._feedbackQueue = [];
    this._speedFeedback = '';
    this._rawElbowAngle = null;
    this._lastBackAngle = null;
    this._pushUpType = PushUpType.INVALID;
    this._restNotified = false;
  }

  _pushFeedback(key) {
    if (!this._feedbackQueue.includes(key)) {
      this._feedbackQueue.push(key);
    }
  }

  /**
   * Torso line: angle at hip — shoulder, hip, ankle.
   * @returns {number|null}
   */
  _torsoAngleAtHip(landmarks, side) {
    const s = side === 'left' ? L.LEFT_SHOULDER : L.RIGHT_SHOULDER;
    const h = side === 'left' ? L.LEFT_HIP : L.RIGHT_HIP;
    const a = side === 'left' ? L.LEFT_ANKLE : L.RIGHT_ANKLE;
    return calculateAngle(landmarks[s], landmarks[h], landmarks[a]);
  }

  /**
   * Leg extension: angle at knee — hip, knee, ankle.
   * @returns {number|null}
   */
  _legAngleAtKnee(landmarks, side) {
    const hi = side === 'left' ? L.LEFT_HIP : L.RIGHT_HIP;
    const k = side === 'left' ? L.LEFT_KNEE : L.RIGHT_KNEE;
    const an = side === 'left' ? L.LEFT_ANKLE : L.RIGHT_ANKLE;
    return calculateAngle(landmarks[hi], landmarks[k], landmarks[an]);
  }

  /**
   * @returns {{ rawTorso: number|null, rawLeg: number|null, side: 'both'|'left'|'right'|null }}
   */
  _computeTorsoLegRaw(landmarks, leftOk, rightOk) {
    if (leftOk && rightOk) {
      const tL = this._torsoAngleAtHip(landmarks, 'left');
      const tR = this._torsoAngleAtHip(landmarks, 'right');
      const lL = this._legAngleAtKnee(landmarks, 'left');
      const lR = this._legAngleAtKnee(landmarks, 'right');
      return {
        rawTorso: (tL + tR) / 2,
        rawLeg: (lL + lR) / 2,
        side: 'both',
      };
    }
    if (leftOk) {
      return {
        rawTorso: this._torsoAngleAtHip(landmarks, 'left'),
        rawLeg: this._legAngleAtKnee(landmarks, 'left'),
        side: 'left',
      };
    }
    if (rightOk) {
      return {
        rawTorso: this._torsoAngleAtHip(landmarks, 'right'),
        rawLeg: this._legAngleAtKnee(landmarks, 'right'),
        side: 'right',
      };
    }
    return { rawTorso: null, rawLeg: null, side: null };
  }

  /**
   * @returns {PushUpTypeKind}
   */
  _classifyPushUpType(torsoSmoothed, legSmoothed, hasTorsoLeg) {
    if (!hasTorsoLeg || torsoSmoothed == null || legSmoothed == null) {
      return PushUpType.INVALID;
    }
    if (legSmoothed < C.KNEE_BENT_MAX_DEG) {
      return PushUpType.KNEE_PUSHUP;
    }
    if (legSmoothed >= C.MIN_LEG_STRAIGHT_DEG) {
      return PushUpType.FULL_PUSHUP;
    }
    return PushUpType.INVALID;
  }

  /**
   * Main analysis entry point.
   */
  analyze(landmarks) {
    this._feedbackQueue = [];

    if (!landmarks || landmarks.length < 29) {
      return this._emptyResult();
    }

    const REQ_LEFT = [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST, L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE];
    const REQ_RIGHT = [L.RIGHT_SHOULDER, L.RIGHT_ELBOW, L.RIGHT_WRIST, L.RIGHT_HIP, L.RIGHT_KNEE, L.RIGHT_ANKLE];

    const isVisible = (idx) => landmarks[idx] && landmarks[idx].visibility > C.CONFIDENCE_THRESHOLD;

    const leftOk = REQ_LEFT.every(isVisible);
    const rightOk = REQ_RIGHT.every(isVisible);

    if (!leftOk && !rightOk) {
      this._stateMachine.reset();
      this._elbowFilterLeft.reset();
      this._elbowFilterRight.reset();
      this._torsoLineFilter.reset();
      this._legLineFilter.reset();
      this._pushUpType = PushUpType.INVALID;
      return this._emptyResult();
    }

    const { rawTorso, rawLeg } = this._computeTorsoLegRaw(landmarks, leftOk, rightOk);
    const hasTorsoLeg = rawTorso != null && rawLeg != null;

    let torsoSmoothed = null;
    let legSmoothed = null;
    if (hasTorsoLeg) {
      torsoSmoothed = normalizeAngleDegrees(this._torsoLineFilter.push(rawTorso));
      legSmoothed = normalizeAngleDegrees(this._legLineFilter.push(rawLeg));
    } else {
      this._torsoLineFilter.reset();
      this._legLineFilter.reset();
    }

    this._pushUpType = this._classifyPushUpType(torsoSmoothed, legSmoothed, hasTorsoLeg);

    // lines 173–175 — replace with:
    if (
      this._pushUpType === PushUpType.KNEE_PUSHUP &&
      (newState === PushUpState.GOING_DOWN ||
      newState === PushUpState.BOTTOM ||
      newState === PushUpState.GOING_UP)
    ) {
      this._pushFeedback('DO_FULL_PUSHUP_LEGS');
    }

    this._lastBackAngle = torsoSmoothed;
    this._backOk = torsoSmoothed == null || torsoSmoothed >= 150;
    if (!this._backOk && torsoSmoothed != null) {
      this._pushFeedback('BACK_NOT_STRAIGHT');
    }

    let rawElbow = null;
    let currentSide = null;

    if (leftOk && rightOk) {
      const angleL = calculateAngle(landmarks[L.LEFT_SHOULDER], landmarks[L.LEFT_ELBOW], landmarks[L.LEFT_WRIST]);
      const angleR = calculateAngle(landmarks[L.RIGHT_SHOULDER], landmarks[L.RIGHT_ELBOW], landmarks[L.RIGHT_WRIST]);
      const smL = normalizeAngleDegrees(this._elbowFilterLeft.push(angleL));
      const smR = normalizeAngleDegrees(this._elbowFilterRight.push(angleR));
      rawElbow = (smL + smR) / 2;
      currentSide = 'both';
    } else if (leftOk) {
      const angleL = calculateAngle(landmarks[L.LEFT_SHOULDER], landmarks[L.LEFT_ELBOW], landmarks[L.LEFT_WRIST]);
      rawElbow = normalizeAngleDegrees(this._elbowFilterLeft.push(angleL));
      currentSide = 'left';
    } else {
      const angleR = calculateAngle(landmarks[L.RIGHT_SHOULDER], landmarks[L.RIGHT_ELBOW], landmarks[L.RIGHT_WRIST]);
      rawElbow = normalizeAngleDegrees(this._elbowFilterRight.push(angleR));
      currentSide = 'right';
    }

    this._lastSide = currentSide;
    this._rawElbowAngle = rawElbow;

    if (rawElbow < C.BOTTOM_ANGLE_MIN) {
      this._pushFeedback('TOO_DEEP');
    }

    this._detectHipAlignment(landmarks, leftOk, rightOk);
    this._detectHeadDrop(landmarks);

    const allowRepCount = true; // Count reps regardless of leg visibility, rely on feedback cues instead

    const prevState = this._stateMachine.state;
    const prevRepCount = this._repCount;
    const newState = this._stateMachine.transition(rawElbow, { allowRepCount });
    const reachedBottomAfter = this._stateMachine.reachedBottom;

    this._detectElbowHyperextension(rawElbow, newState);

    if (
      newState === PushUpState.GOING_UP &&
      rawElbow < C.TOP_ANGLE_MIN - 10
    ) {
      this._pushFeedback('FULL_EXTENSION');
    }

    this._detectHalfRep(prevState, newState, reachedBottomAfter);
    this._detectRestState(rawElbow, newState);

    const repJustFinished = this._repCount > prevRepCount;

    this._updateFeedback(rawElbow, newState, repJustFinished);

    return this._buildResult(newState);
  }

  _detectHipAlignment(landmarks, leftOk, rightOk) {
    const check = (sIdx, hIdx, kIdx) => {
      if (!areLandmarksConfident(landmarks, [sIdx, hIdx, kIdx], C.CONFIDENCE_THRESHOLD)) return;
      const hip = landmarks[hIdx];
      const shoulder = landmarks[sIdx];
      const knee = landmarks[kIdx];
      const midY = (shoulder.y + knee.y) / 2;
      if (hip.y > midY + 0.08) {
        this._pushFeedback('HIPS_SAGGING');
      } else if (hip.y < midY - 0.08) {
        this._pushFeedback('HIPS_TOO_HIGH');
      }
    };

    if (leftOk && rightOk) {
      check(L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE);
      check(L.RIGHT_SHOULDER, L.RIGHT_HIP, L.RIGHT_KNEE);
    } else if (leftOk) {
      check(L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE);
    } else if (rightOk) {
      check(L.RIGHT_SHOULDER, L.RIGHT_HIP, L.RIGHT_KNEE);
    }
  }

  _detectElbowHyperextension(elbowAngle, state) {
    if (
      elbowAngle > (C.TOP_ANGLE_MAX + 5) &&
      state === PushUpState.TOP
    ) {
      this._pushFeedback('ELBOW_HYPEREXTENSION');
    }
  }

  _detectHeadDrop(landmarks) {
    const nose = landmarks[0];
    const leftShoulder = landmarks[L.LEFT_SHOULDER];
    if (nose && nose.visibility > C.CONFIDENCE_THRESHOLD) {
      if (nose.y > leftShoulder.y + 0.08) {
        this._pushFeedback('HEAD_DROPPING');
      }
    }
  }

  _detectHalfRep(prevState, newState, reachedBottomBefore) {
    if (prevState === PushUpState.GOING_UP && newState === PushUpState.TOP && !reachedBottomBefore) {
      this._pushFeedback('HALF_REP');
    }
  }

  _detectRestState(elbowAngle, state) {
    if (
      this._prevElbowAngle !== null &&
      Math.abs(elbowAngle - this._prevElbowAngle) > 3
    ) {
      this._lastMovementTime = Date.now();
      this._restNotified = false;
    }
    this._prevElbowAngle = elbowAngle;

    if (
      !this._restNotified &&
      Date.now() - this._lastMovementTime > 5000 &&
      state === PushUpState.TOP
    ) {
      this._pushFeedback('REST_DETECTED');
      this._restNotified = true;
    }
  }

  _onRep({ repCount, depthAngle, durationMs }) {
    this._repCount = repCount;
    this._lastDepthScore = this._calcDepthScore(depthAngle);

    if (durationMs < 700) {
      this._speedFeedback = 'Too fast! Slow down.';
      this._pushFeedback('TOO_FAST');
    } else {
      this._speedFeedback = 'Good pace!';
      this._pushFeedback('GOOD_PACE');
    }

    const isPerfect = (
      this._lastDepthScore === 100 &&
      this._backOk === true &&
      durationMs >= 700 && durationMs <= 3000
    );

    if (isPerfect) {
      this._pushFeedback('PERFECT_REP');
    } else if (this._lastDepthScore === 100) {
      this._pushFeedback('GOOD_DEPTH');
    }
  }

  _calcDepthScore(depthAngle) {
    if (depthAngle == null) return 0;
    const ideal = 85;
    const shallowCutoff = 130;
    if (depthAngle <= ideal) return 100;
    if (depthAngle >= shallowCutoff) return 0;
    const score = 100 - ((depthAngle - ideal) / (shallowCutoff - ideal)) * 100;
    return Math.max(0, Math.round(score));
  }

  _updateFeedback(angle, state, repJustFinished) {
    if (state === PushUpState.TOP && !repJustFinished) {
      this._speedFeedback = '';
    }

    const ALMOST_THERE = C.BOTTOM_ANGLE_MAX + 15;
    const CLEARLY_DOWN = C.TOP_ANGLE_MIN - 20;

    if (
      state === PushUpState.GOING_DOWN &&
      angle < CLEARLY_DOWN &&
      angle > ALMOST_THERE &&
      this._backOk
    ) {
      this._pushFeedback('GO_LOWER');
    }

    // if (
    //   (state === PushUpState.GOING_DOWN || state === PushUpState.BOTTOM) &&
    //   angle > C.BOTTOM_ANGLE_MAX + 5 &&
    //   this._pushUpType === PushUpType.FULL_PUSHUP
    // ) {
    //   this._pushFeedback('FULL_ROM');
    // }

    if (this._backOk && state === PushUpState.TOP && !repJustFinished) {
      this._feedbackQueue = this._feedbackQueue.filter(k => {
        const type = FEEDBACK[k]?.type;
        return type !== 'pace' && type !== 'motivation';
      });
    }
  }

  _buildResult(state) {
    const { primary, secondary, voiceFeedback } = resolveTopFeedback(this._feedbackQueue);

    return {
      repCount: this._repCount,
      elbowAngle: this._rawElbowAngle ? Math.round(this._rawElbowAngle) : null,
      backAngle: this._lastBackAngle != null ? Math.round(this._lastBackAngle) : null,
      pushUpType: this._pushUpType,
      state: state,
      feedbackPrimary: primary?.msg ?? '',
      feedbackSecondary: secondary?.msg ?? '',
      voiceFeedback: voiceFeedback?.msg ?? '',
    };
  }

  _emptyResult() {
    this._feedbackQueue = [];
    return {
      repCount: this._repCount,
      elbowAngle: null,
      backAngle: null,
      pushUpType: PushUpType.INVALID,
      state: PushUpState.IDLE,
      feedbackPrimary: 'Cannot see arms clearly — adjust position',
      feedbackSecondary: '',
      voiceFeedback: '',
    };
  }

  /** Reset counters (e.g. new session) */
  reset() {
    this._stateMachine.reset();
    this._elbowFilterLeft.reset();
    this._elbowFilterRight.reset();
    this._torsoLineFilter.reset();
    this._legLineFilter.reset();
    this._repCount = 0;
    this._lastDepthScore = 0;
    this._backOk = true;
    this._feedbackQueue = [];
    this._speedFeedback = '';
    this._rawElbowAngle = null;
    this._lastBackAngle = null;
    this._pushUpType = PushUpType.INVALID;
    this._lastSide = null;
    this._prevElbowAngle = null;
    this._lastMovementTime = Date.now();
    this._restNotified = false;
  }

  get repCount() {
    return this._repCount;
  }
}

/**
 * @typedef {Object} AnalysisResult
 * @property {number} repCount
 * @property {string} state - PushUpState enum value
 * @property {string} displayState - Human-readable state label
 * @property {number|null} elbowAngle
 * @property {number} depthScore - 0–100
 * @property {boolean} backOk
 * @property {string} speedFeedback
 * @property {string} postureFeedback
 * @property {boolean} poseDetected
 */
