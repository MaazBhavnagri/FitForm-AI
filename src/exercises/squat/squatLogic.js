import { calculateAngle } from '../../core/angles/angleCalculator.js';
import { MovingAverageFilter } from '../../core/filters/smoothing.js';
import { areLandmarksConfident } from '../../core/filters/confidenceFilter.js';
import { SquatStateMachine, SquatState } from '../../core/state/stateMachine.js';
import { SQUAT_CONFIG as C } from './squatConfig.js';
import { SQUAT_FEEDBACK, resolveSquatFeedback } from './squatFeedback.js';

const L = C.LANDMARKS;

export class SquatAnalyzer {
  constructor() {
    this._kneeFilterLeft  = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._kneeFilterRight = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._hipFilterLeft   = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._hipFilterRight  = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._backFilterLeft  = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._backFilterRight = new MovingAverageFilter(C.SMOOTHING_WINDOW);
    this._feedbackQueue   = [];
    this._restNotified    = false;
    this._lastMovementTime = Date.now();
    this._prevKneeAngle   = null;
    this._repCount        = 0;
    this._lastDepthScore  = 0;
    this._backOk          = true;

    this._stateMachine = new SquatStateMachine({
      topMin: C.KNEE_TOP_MIN,
      topMax: C.TOP_ANGLE_MAX,
      bottomMin: C.KNEE_BOTTOM_MIN,
      bottomMax: C.KNEE_BOTTOM_MAX,
      minRepMs: C.MIN_REP_DURATION_MS,
      onRepCounted: (data) => this._onRep(data),
    });

    this._leftKneeAngle = null;
    this._rightKneeAngle = null;
    this._backAngle = null;
  }

  _pushFeedback(key) {
    if (!this._feedbackQueue.includes(key)) {
      this._feedbackQueue.push(key);
    }
  }

  analyze(landmarks) {
    this._feedbackQueue = [];

    // STEP 1 — Validate
    if (!landmarks || landmarks.length < 33) {
      return this._emptyResult('No pose detected');
    }

    const requiredLandmarks = [
      L.LEFT_SHOULDER, L.RIGHT_SHOULDER,
      L.LEFT_HIP, L.RIGHT_HIP,
      L.LEFT_KNEE, L.RIGHT_KNEE,
      L.LEFT_ANKLE, L.RIGHT_ANKLE,
      L.LEFT_FOOT, L.RIGHT_FOOT
    ];

    const isVisible = (idx) => landmarks[idx] && landmarks[idx].visibility > C.CONFIDENCE_THRESHOLD;

    if (requiredLandmarks.some(idx => !isVisible(idx))) {
      return this._emptyResult('Incomplete pose: legs not visible');
    }

    // STEP 2 — Compute both knee angles independently
    const rawLeftKnee = calculateAngle(landmarks[L.LEFT_HIP], landmarks[L.LEFT_KNEE], landmarks[L.LEFT_ANKLE]);
    const rawRightKnee = calculateAngle(landmarks[L.RIGHT_HIP], landmarks[L.RIGHT_KNEE], landmarks[L.RIGHT_ANKLE]);
    
    this._leftKneeAngle = this._kneeFilterLeft.push(rawLeftKnee);
    this._rightKneeAngle = this._kneeFilterRight.push(rawRightKnee);
    const avgKneeAngle = (this._leftKneeAngle + this._rightKneeAngle) / 2;

    // STEP 3 — Compute both hip angles independently
    const rawLeftHip = calculateAngle(landmarks[L.LEFT_SHOULDER], landmarks[L.LEFT_HIP], landmarks[L.LEFT_KNEE]);
    const rawRightHip = calculateAngle(landmarks[L.RIGHT_SHOULDER], landmarks[L.RIGHT_HIP], landmarks[L.RIGHT_KNEE]);
    
    const leftHipAngle = this._hipFilterLeft.push(rawLeftHip);
    const rightHipAngle = this._hipFilterRight.push(rawRightHip);
    const avgHipAngle = (leftHipAngle + rightHipAngle) / 2;

    // STEP 4 — Compute back angle
    let backAngle = null;
    if (areLandmarksConfident(landmarks, [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_ANKLE], C.CONFIDENCE_THRESHOLD)) {
      const rawBackLeft = calculateAngle(landmarks[L.LEFT_SHOULDER], landmarks[L.LEFT_HIP], landmarks[L.LEFT_ANKLE]);
      backAngle = this._backFilterLeft.push(rawBackLeft);
    } else if (areLandmarksConfident(landmarks, [L.RIGHT_SHOULDER, L.RIGHT_HIP, L.RIGHT_ANKLE], C.CONFIDENCE_THRESHOLD)) {
      const rawBackRight = calculateAngle(landmarks[L.RIGHT_SHOULDER], landmarks[L.RIGHT_HIP], landmarks[L.RIGHT_ANKLE]);
      backAngle = this._backFilterRight.push(rawBackRight);
    }
    this._backAngle = backAngle;

    // STEP 5 — Feed avgKneeAngle + avgHipAngle into state machine
    // Wait, state machine only takes primary angle in original pushup...
    // The prompt says "State machine must require BOTH angles to be in range for a state transition to fire — not just knee alone"
    // I need to adapt the state machine or just let the state machine handle knee, and override it?
    // Actually, prompt says: "State machine must require BOTH angles to be in range for a state transition to fire — not just knee alone"
    // I can pass both angles to transition, or handle it in SquatStateMachine.
    
    const prevState = this._stateMachine.state;
    const prevRepCount = this._repCount;
    // We will update SquatStateMachine to take (kneeAngle, hipAngle) instead of just single angle.
    const newState = this._stateMachine.transition(avgKneeAngle, avgHipAngle);
    const reachedBottomAfter = this._stateMachine.reachedBottom;

    // STEP 6 — Run all detections
    this._detectAsymmetry(this._leftKneeAngle, this._rightKneeAngle);
    this._detectValgus(landmarks);
    this._detectBackLean();
    this._detectHipHinge(avgHipAngle, newState);
    this._detectRestState(avgKneeAngle, newState);
    this._detectHalfRep(prevState, newState, reachedBottomAfter);
    this._detectFullExtension(newState, avgKneeAngle);

    // STEP 7 — Update feedback
    const repJustFinished = this._repCount > prevRepCount;
    this._updateFeedback(avgKneeAngle, newState, repJustFinished);

    // STEP 8 — return result
    return this._buildResult(newState);
  }

  _detectAsymmetry(leftKnee, rightKnee) {
    if (Math.abs(leftKnee - rightKnee) > C.ASYMMETRY_THRESHOLD) {
      this._pushFeedback('ASYMMETRY_DETECTED');
    }
  }

  _detectValgus(landmarks) {
    const required = [L.LEFT_KNEE, L.LEFT_HIP, L.LEFT_FOOT, L.RIGHT_KNEE, L.RIGHT_HIP, L.RIGHT_FOOT];
    if (!areLandmarksConfident(landmarks, required, C.CONFIDENCE_THRESHOLD)) return;

    const leftKnee = landmarks[L.LEFT_KNEE];
    const rightKnee = landmarks[L.RIGHT_KNEE];
    const hipCenterX = (landmarks[L.LEFT_HIP].x + landmarks[L.RIGHT_HIP].x) / 2;

    if (leftKnee.x < hipCenterX - C.VALGUS_THRESHOLD) {
      this._pushFeedback('KNEE_VALGUS_LEFT');
    }
    if (rightKnee.x > hipCenterX + C.VALGUS_THRESHOLD) {
      this._pushFeedback('KNEE_VALGUS_RIGHT');
    }
  }

  _detectBackLean() {
    if (this._backAngle !== null && this._backAngle < C.BACK_STRAIGHT_MIN) {
      this._backOk = false;
      this._pushFeedback('BACK_FORWARD_LEAN');
    } else {
      this._backOk = true;
    }
  }

  _detectHipHinge(hipAngle, state) {
    const CLEARLY_DOWN = C.KNEE_TOP_MIN - 20;
    if (
      state === SquatState.GOING_DOWN &&
      this._leftKneeAngle < CLEARLY_DOWN &&   // only flag when clearly mid-descent
      hipAngle > C.HIP_BOTTOM_MAX + 15
    ) {
      this._pushFeedback('SIT_BACK_MORE');
    }
  }

  _detectRestState(avgKneeAngle, state) {
    if (this._prevKneeAngle !== null && Math.abs(avgKneeAngle - this._prevKneeAngle) > 3) {
      this._lastMovementTime = Date.now();
      this._restNotified = false;
    }
    this._prevKneeAngle = avgKneeAngle;

    if (!this._restNotified && Date.now() - this._lastMovementTime > 5000 && state === SquatState.TOP) {
      this._pushFeedback('REST_DETECTED');
      this._restNotified = true;
    }
  }

  _detectHalfRep(prevState, newState, reachedBottom) {
    if (prevState === SquatState.GOING_UP && newState === SquatState.TOP && !reachedBottom) {
      this._pushFeedback('HALF_REP');
    }
  }

  _detectFullExtension(state, kneeAngle) {
    if (state === SquatState.GOING_UP && kneeAngle < C.KNEE_TOP_MIN - 10) {
      this._pushFeedback('FULL_EXTENSION');
    }
  }

  _onRep({ repCount, depthAngle, durationMs }) {
    this._repCount = repCount;
    this._lastDepthScore = this._calcDepthScore(depthAngle);

    if (durationMs < 800) {
      this._pushFeedback('TOO_FAST');
    } else {
      this._pushFeedback('GOOD_PACE');
    }

    const isPerfect = this._lastDepthScore === 100 && this._backOk && durationMs >= 800 && durationMs <= 4000;
    
    if (isPerfect) {
      this._pushFeedback('PERFECT_REP');
    } else if (this._lastDepthScore === 100) {
      this._pushFeedback('GOOD_DEPTH');
    }
  }

  _calcDepthScore(depthAngle) {
    if (depthAngle == null) return 0;
    const ideal = 95;
    const shallowCutoff = 140;
    if (depthAngle <= ideal) return 100;
    if (depthAngle >= shallowCutoff) return 0;
    const score = 100 - ((depthAngle - ideal) / (shallowCutoff - ideal)) * 100;
    return Math.max(0, Math.round(score));
  }

  _updateFeedback(avgKneeAngle, newState, repJustFinished) {
    const ALMOST_THERE = C.KNEE_BOTTOM_MAX + 15;
    const CLEARLY_DOWN = C.KNEE_TOP_MIN - 20;

    if (
      newState === SquatState.GOING_DOWN &&
      avgKneeAngle < CLEARLY_DOWN &&
      avgKneeAngle > ALMOST_THERE &&
      this._backOk
    ) {
      this._pushFeedback('GO_LOWER');
    }

    if (this._backOk && newState === SquatState.STANDING && !repJustFinished) {
      this._feedbackQueue = this._feedbackQueue.filter(k => {
        const type = SQUAT_FEEDBACK[k]?.type;
        return type !== 'pace' && type !== 'motivation';
      });
    }
  }

  _buildResult(state) {
    const { primary, secondary, voiceFeedback } = resolveSquatFeedback(this._feedbackQueue);
    return {
      repCount: this._repCount,
      state: state,
      displayState: state,
      depthScore: this._lastDepthScore,
      backOk: this._backOk,
      leftKneeAngle: this._leftKneeAngle ? Math.round(this._leftKneeAngle) : null,
      rightKneeAngle: this._rightKneeAngle ? Math.round(this._rightKneeAngle) : null,
      backAngle: this._backAngle ? Math.round(this._backAngle) : null,
      asymmetry: this._leftKneeAngle && this._rightKneeAngle ? Math.round(Math.abs(this._leftKneeAngle - this._rightKneeAngle)) : 0,
      postureFeedback:   primary?.msg ?? '',
      secondaryFeedback: secondary?.msg ?? '',
      voiceFeedback:     voiceFeedback?.msg ?? '',
      poseDetected: true,
    };
  }

  _emptyResult(msg) {
    this._feedbackQueue = [];
    return {
      repCount: this._repCount,
      state: SquatState.IDLE,
      displayState: 'WAITING…',
      depthScore: 0,
      backOk: true,
      leftKneeAngle: null,
      rightKneeAngle: null,
      backAngle: null,
      asymmetry: 0,
      postureFeedback: msg,
      secondaryFeedback: '',
      voiceFeedback: '',
      poseDetected: false,
    };
  }
  
  reset() {
    this._kneeFilterLeft.reset();
    this._kneeFilterRight.reset();
    this._hipFilterLeft.reset();
    this._hipFilterRight.reset();
    this._backFilterLeft.reset();
    this._backFilterRight.reset();
    this._feedbackQueue = [];
    this._restNotified = false;
    this._lastMovementTime = Date.now();
    this._prevKneeAngle = null;
    this._repCount = 0;
    this._lastDepthScore = 0;
    this._backOk = true;
    this._stateMachine.reset();
    this._leftKneeAngle = null;
    this._rightKneeAngle = null;
    this._backAngle = null;
  }
}
