import { validatePosture } from '../pose/poseValidation.js';
import { computeFrameAngles } from '../biomechanics/frameAngles.js';

export class ExerciseDetector {
  constructor() {
    this._lockedExercise = null;
    this._candidateExercise = null;
    this._candidateFrames = 0;
    this._LOCK_FRAMES = 5;
    this._idleFrames = 0;
    this._IDLE_UNLOCK_FRAMES = 300;
  }

  detect(landmarks) {
    if (this._lockedExercise !== null) {
      if (landmarks && landmarks.length >= 33) {
        const angles = computeFrameAngles(landmarks);
        if (angles) {
          const { kneeAngle, hipAngle } = angles;
          if (kneeAngle > 160 && hipAngle > 150) {
            this._idleFrames++;
            if (this._idleFrames > this._IDLE_UNLOCK_FRAMES) {
              this._lockedExercise = null;
              this._idleFrames = 0;
              return { exercise: null, locked: false, label: 'Detecting…' };
            }
          } else {
            this._idleFrames = 0;
          }
        }
      }
      const name =
        this._lockedExercise.charAt(0).toUpperCase() +
        this._lockedExercise.slice(1);
      return { exercise: this._lockedExercise, locked: true, label: name };
    }

    const frameOk = validatePosture(landmarks);
    if (!frameOk.ok) {
      this._candidateExercise = null;
      this._candidateFrames = 0;
      return { exercise: null, locked: false, label: frameOk.message };
    }

    const candidate = this._classifyGesture(landmarks);

    if (candidate === this._candidateExercise) {
      this._candidateFrames++;
    } else {
      this._candidateExercise = candidate;
      this._candidateFrames = candidate ? 1 : 0;
    }

    if (this._candidateFrames >= this._LOCK_FRAMES && candidate !== null) {
      this._lockedExercise = candidate;
      this._candidateFrames = 0;
      const name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      return { exercise: candidate, locked: true, label: name };
    }

    return { exercise: null, locked: false, label: 'Detecting…' };
  }

  /**
   * Push-up: bodyAngle > 140 AND elbowAngle < 140
   * Squat: kneeAngle < 140 AND bodyAngle < 120
   */
  _classifyGesture(landmarks) {
    const angles = computeFrameAngles(landmarks);
    if (!angles) return null;

    const { elbowAngle, kneeAngle, bodyAngle } = angles;

    const squatCue = kneeAngle < 140 && bodyAngle < 120;
    const pushupCue = bodyAngle > 140 && elbowAngle < 140;

    if (squatCue && !pushupCue) return 'squat';
    if (pushupCue && !squatCue) return 'pushup';
    if (pushupCue && squatCue) {
      return kneeAngle < elbowAngle ? 'squat' : 'pushup';
    }
    return null;
  }

  reset() {
    this._lockedExercise = null;
    this._candidateExercise = null;
    this._candidateFrames = 0;
    this._idleFrames = 0;
  }
}
