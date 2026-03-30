/**
 * StatsPanel.jsx
 * Secondary statistics: depth score, elbow angle, FPS, speed feedback.
 */
import { motion } from 'framer-motion';

/**
 * @param {{ result, fps: number, exerciseLabel: string }} props
 */
export default function StatsPanel({ result, fps, exerciseLabel }) {
  const isSquat = result?._exercise === 'squat' || exerciseLabel === 'SQUAT';
  
  const primaryAngle = isSquat 
    ? (result?.leftKneeAngle ?? result?.rightKneeAngle) 
    : result?.elbowAngle;
    
  const backAngle = result?.backAngle;
  const speedFeedback = result?.feedbackSecondary ?? '';
  const backOk = backAngle != null ? (isSquat ? backAngle >= 145 : backAngle >= 150) : true;

  const backColor = backOk ? 'text-emerald-400' : 'text-red-400';

  const fpsColor =
    fps >= 25 ? 'text-emerald-400' :
    fps >= 15 ? 'text-amber-400' :
    'text-red-400';

  return (
    <div className="glass-card p-4 flex flex-col gap-4">
      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
        Session Stats
      </p>

      {/* ── Primary Joint Angle ────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">{isSquat ? 'Knee Angle' : 'Elbow Angle'}</span>
        <span className="text-sm font-bold text-violet-300">
          {primaryAngle != null ? `${primaryAngle}°` : '–'}
        </span>
      </div>

      {/* ── Back Angle ─────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">Back Angle</span>
        <span className={`text-sm font-bold ${backColor}`}>
          {backAngle != null ? `${backAngle}°` : '–'}
        </span>
      </div>

      {/* ── Posture ────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400 font-medium">Posture</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          backOk
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {backOk ? 'Straight ✓' : 'Bent ✗'}
        </span>
      </div>

      {/* ── Secondary ──────────────────────────────────── */}
      {speedFeedback ? (
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400 font-medium">Secondary</span>
          <span className="text-xs font-semibold text-slate-300">
            {speedFeedback}
          </span>
        </div>
      ) : null}

      {/* ── FPS ────────────────────────────────────────── */}
      <div className="flex justify-between items-center border-t border-slate-700/40 pt-3">
        <span className="text-xs text-slate-500 font-medium">Detection FPS</span>
        <span className={`text-xs font-bold ${fpsColor}`}>{fps} fps</span>
      </div>
    </div>
  );
}
