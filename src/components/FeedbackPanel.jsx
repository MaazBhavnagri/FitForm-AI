/**
 * FeedbackPanel.jsx
 * Shows rep count, current machine state, and real-time feedback text.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { PushUpState } from '../core/state/stateMachine.js';

const STATE_STYLES = {
  [PushUpState.TOP]:         { label: 'TOP',        bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', glow: 'state-top' },
  [PushUpState.GOING_DOWN]:  { label: 'GOING DOWN', bg: 'bg-amber-500/20',   text: 'text-amber-400',   border: 'border-amber-500/40',   glow: 'state-down' },
  [PushUpState.BOTTOM]:      { label: 'BOTTOM',     bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/40',     glow: 'state-bottom' },
  [PushUpState.GOING_UP]:    { label: 'GOING UP',   bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/40',    glow: 'state-up' },
  [PushUpState.IDLE]:        { label: 'WAITING…',   bg: 'bg-slate-500/20',   text: 'text-slate-400',   border: 'border-slate-500/30',   glow: '' },
};

/**
 * @param {{ result: import('../exercises/pushup/pushupLogic').AnalysisResult, exerciseLabel: string }} props
 */
export default function FeedbackPanel({ result, exerciseLabel }) {
  const isSquat = result?._exercise === 'squat' || exerciseLabel === 'SQUAT';
  const exerciseName = isSquat ? 'Squats' : 'Push-Ups';
  const positionText = isSquat ? 'Get into squat position…' : 'Get into push-up position…';

  const repCount = result?.repCount ?? 0;
  const state = result?.state ?? PushUpState.IDLE;
  const displayState = STATE_STYLES[state]?.label ?? 'WAITING…';
  const postureFeedback = result?.feedbackPrimary ?? '';
  const primaryAngle = isSquat ? (result?.leftKneeAngle ?? result?.rightKneeAngle) : result?.elbowAngle;
  const poseDetected = result != null && primaryAngle != null;

  const style = STATE_STYLES[state] ?? STATE_STYLES[PushUpState.IDLE];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Rep Counter ────────────────────────────────────── */}
      <div className="glass-card p-6 flex flex-col items-center justify-center relative">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">
          {exerciseName}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={repCount}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="relative"
          >
            <span className="text-8xl font-black gradient-text leading-none select-none">
              {repCount}
            </span>
          </motion.div>
        </AnimatePresence>
        <p className="text-xs text-slate-500 mt-2 font-medium">reps completed</p>
      </div>

      {/* ── State Badge ────────────────────────────────────── */}
      <div className={`glass-card p-4 flex items-center justify-center ${style.glow}`}>
        <div className={`px-5 py-2 rounded-full border ${style.bg} ${style.border} flex items-center gap-2`}>
          <span className={`text-sm font-bold tracking-wider ${style.text}`}>
            {displayState}
          </span>
          {poseDetected && (
            <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
          )}
        </div>
      </div>

      {/* ── Feedback Text ──────────────────────────────────── */}
      <div className="glass-card p-4 flex-1 flex flex-col justify-center min-h-[80px]">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">
          Feedback
        </p>
        <AnimatePresence mode="wait">
          {postureFeedback ? (
            <motion.p
              key={postureFeedback}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={`text-base font-semibold ${
                postureFeedback.includes('straight') || postureFeedback.includes('fast')
                  ? 'text-red-400'
                  : postureFeedback.includes('lower')
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {postureFeedback}
            </motion.p>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-slate-500 text-sm"
            >
              {poseDetected ? 'Looking good! Keep it up.' : positionText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
