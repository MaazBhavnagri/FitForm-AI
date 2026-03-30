import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Camera from '../components/Camera.jsx';
import { usePose } from '../hooks/usePose.js';
import { voiceCoach } from '../utils/helpers.js';
import FeedbackModal from '../components/FeedbackModal.jsx';

export default function Workout() {
  const navigate = useNavigate();

  const {
    videoRef,
    canvasRef,
    result,
    fps,
    cameraActive,
    cameraError,
    workerReady,
    isStarting,
    latestLandmarks,
    exerciseLabel,
    startCamera,
    stopCamera,
    toggleCamera,
    resetSession,
  } = usePose();

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // When camera active state changes to true, we show the setup guide
  useEffect(() => {
    if (cameraActive && selectedExercise) {
      setShowSetupGuide(true);
    } else {
      setShowSetupGuide(false);
    }
  }, [cameraActive, selectedExercise]);

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    voiceCoach.setEnabled(next);
  };

  const handleStop = () => {
    stopCamera();
    resetSession();
    // Keep selectedExercise so they can just "Restart" without navigating back
  };

  const handleStart = () => {
    startCamera(selectedExercise);
  };

  const handleReset = () => {
    resetSession();
  };

  // Determine actual display state
  const isDetecting = (!workerReady || !result || result.repCount === undefined);
  const dynamicExerciseName = selectedExercise === 'pushup' ? 'Push-up' : 'Squat';
  const displayLabel = isDetecting ? 'Detecting...' : dynamicExerciseName;

  return (
    <div className="min-h-[100dvh] bg-[#0a0b14] flex flex-col items-center overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className="w-full flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0 z-40 bg-[#0a0b14]">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
            FitForm <span className="text-violet-400">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setFeedbackOpen(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Feedback
          </button>
          
          <button
            onClick={toggleVoice}
            title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
            className={`p-2 rounded-lg transition-colors border ${
              voiceEnabled
                ? 'border-violet-500/30 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20'
                : 'border-slate-700/50 text-slate-500 bg-slate-800/50 hover:bg-slate-700/60'
            }`}
          >
            {voiceEnabled ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Output Area (Full Screen Mobile) ───────────────── */}
      <main className="flex-1 w-full max-w-[1200px] flex flex-col p-2 sm:p-4 overflow-hidden relative">
        <motion.div
          className="relative flex-1 w-full h-full rounded-[2rem] overflow-hidden shadow-2xl bg-[#0f1020] border border-slate-800 flex flex-col"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Always render Camera so refs are alive immediately */}
          <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
            <Camera
              videoRef={videoRef}
              canvasRef={canvasRef}
              latestLandmarks={latestLandmarks}
              backOk={(result?.backAngle ?? 180) >= 145}
              exerciseLabel=""
            />
          </div>

          <AnimatePresence mode="wait">
            {!cameraActive && !cameraError && !selectedExercise && (
              <motion.div
                key="exercise-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0b14] p-6 text-center"
              >
                <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">Select Exercise</h2>
                <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg justify-center">
                  <button onClick={() => setSelectedExercise('pushup')} className="flex-1 p-8 rounded-3xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/60 hover:border-violet-500/50 transition-all group shadow-xl">
                    <div className="w-20 h-20 mx-auto bg-slate-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform p-3 shadow-lg">
                      <img src="/images/pushup_icon.png" alt="Push-ups" className="w-full h-full object-contain drop-shadow-sm" />
                    </div>
                    <span className="text-xl font-bold text-white block">Push-Ups</span>
                  </button>
                  <button onClick={() => setSelectedExercise('squat')} className="flex-1 p-8 rounded-3xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/60 hover:border-blue-500/50 transition-all group shadow-xl">
                    <div className="w-20 h-20 mx-auto bg-slate-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform p-3 shadow-lg">
                      <img src="/images/squat_icon.png" alt="Squats" className="w-full h-full object-contain drop-shadow-sm" />
                    </div>
                    <span className="text-xl font-bold text-white block">Squats</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Start Screen (Pre-Camera) ── */}
            {!cameraActive && !cameraError && selectedExercise && (
              <motion.div
                key="start-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6"
              >
                <div className="max-w-md w-full text-center flex flex-col items-center">
                  <div className="w-24 h-24 bg-slate-200 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl p-4">
                     {selectedExercise === 'pushup' ? <img src="/images/pushup_icon.png" alt="Push-up" className="w-full h-full object-contain" /> : <img src="/images/squat_icon.png" alt="Squat" className="w-full h-full object-contain" />}
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4">
                    Ready for {selectedExercise === 'pushup' ? 'Push-Ups' : 'Squats'}?
                  </h2>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                    Make sure you wear tight athletic clothes for the AI to track your joints accurately. 
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button
                      onClick={() => setSelectedExercise(null)}
                      className="px-6 py-4 rounded-2xl bg-slate-800 text-white font-semibold flex-1 hover:bg-slate-700 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleStart}
                      disabled={isStarting}
                      className="px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-lg flex-[2] shadow-xl hover:shadow-violet-900/60 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                    >
                      {isStarting ? 'Opening Camera...' : 'Start Session'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Camera Error ── */}
            {cameraError && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
                <p className="text-slate-400 mb-6 max-w-xs">{cameraError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                >
                  Reload Page
                </button>
              </motion.div>
            )}

            {/* ── Setup Guide Overlay (Dismissible) ── */}
            {cameraActive && showSetupGuide && (
              <motion.div
                key="setup-guide"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-x-4 top-24 z-50 bg-black/80 backdrop-blur-xl border border-violet-500/50 rounded-3xl p-6 sm:p-8 max-w-sm mx-auto shadow-2xl flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 bg-violet-600/30 rounded-full flex items-center justify-center mb-4 text-violet-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Setup Guide</h3>
                <p className="text-slate-300 mb-6 text-sm leading-relaxed">
                  {selectedExercise === 'pushup'
                    ? "Stand sideways to the camera. Move back so your full body is visible in the frame."
                    : "Stand straight facing the side. Move back so your entire body from head to toes is in the frame."}
                </p>
                <button
                  onClick={() => setShowSetupGuide(false)}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-colors"
                >
                  Got it
                </button>
              </motion.div>
            )}

            {/* ── Active Camera HUD ── */}
            {cameraActive && (
              <motion.div
                key="hud"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between pt-6 pb-28 px-4 sm:px-8"
              >
                {/* HUD Top: Exercise Name & Rep Count (Left) & FPS (Right) */}
                <div className="flex justify-between items-start w-full">
                  <div className="bg-black/50 backdrop-blur-md px-5 py-3 sm:px-6 sm:py-4 rounded-[2rem] border border-white/10 shadow-xl flex flex-col items-center min-w-[120px]">
                    <span className="text-xs font-bold text-violet-400 tracking-[0.15em] uppercase mb-1">
                      {displayLabel}
                    </span>
                    <span className="text-5xl sm:text-6xl leading-none font-black text-white">
                      {result?.repCount || 0}
                    </span>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                    <span className={`text-[10px] font-bold ${fps >= 25 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {fps} FPS
                    </span>
                  </div>
                </div>

                {/* HUD Center: Loading Model Spinner (if not ready) */}
                {!workerReady && (
                  <div className="self-center flex flex-col items-center bg-black/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 mt-10">
                    <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mb-3" />
                    <span className="text-sm font-bold text-violet-400">Loading AI...</span>
                  </div>
                )}

                {/* HUD Bottom: Feedback Text */}
                {workerReady && (
                  <div className="flex flex-col items-center w-full mt-auto mb-4 sm:mb-6">
                    {/* Dynamic Feedback Text */}
                    <div className="bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 max-w-lg text-center shadow-lg w-full mx-auto">
                      <p className={`text-lg sm:text-xl font-bold ${
                        !result?.feedbackPrimary 
                          ? 'text-white' 
                          : result.feedbackPrimary.includes('straight') || result.feedbackPrimary.includes('fast') || result.feedbackPrimary.includes('caving')
                            ? 'text-red-400'
                          : result.feedbackPrimary.includes('lower') || result.feedbackPrimary.includes('more')
                            ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}>
                        {result?.feedbackPrimary || (
                          (result?.elbowAngle != null || result?.leftKneeAngle != null) 
                            ? "Looking good! Keep it up." 
                            : `Get into position...`
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Session Controls (Bottom Fixed) ── */}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent z-40 flex items-end justify-center pb-6 px-4 pointer-events-none">
            {selectedExercise && (
              <div className="flex gap-3 sm:gap-4 pointer-events-auto items-center">
                {!cameraActive ? (
                  <button
                    onClick={handleStart}
                    disabled={isStarting}
                    className="px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-violet-600 text-white font-bold tracking-wide hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900/50 disabled:opacity-50"
                  >
                    Start
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleStop}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-400 transition-colors shadow-lg shadow-red-900/50"
                      title="Stop Camera"
                    >
                      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                    </button>
                    {cameraActive && workerReady && (result?.repCount > 0) && (
                      <button
                        onClick={handleReset}
                        className="px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition-colors shadow-lg hidden sm:block"
                      >
                        Reset Reps
                      </button>
                    )}
                  </>
                )}
                
                {/* Mobile Reset Reps Button (smaller) */}
                {cameraActive && workerReady && (result?.repCount > 0) && (
                  <button
                    onClick={handleReset}
                    className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors shadow-lg sm:hidden"
                    title="Reset Reps"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Global Modals */}
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
