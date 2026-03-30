/**
 * usePose.js
 * Main React hook managing webcam, Web Worker, pose analysis, and voice feedback.
 * Camera does NOT auto-start — call startCamera() / stopCamera() manually.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { PushUpAnalyzer } from '../exercises/pushup/pushupLogic.js';
import { SquatAnalyzer } from '../exercises/squat/squatLogic.js';
import { voiceCoach, FPSTracker } from '../utils/helpers.js';
import { drawSkeleton } from '../components/Camera.jsx';

export function usePose() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const streamRef = useRef(null);
  
  const targetExerciseRef = useRef(null);
  const analyzersRef = useRef({
    pushup: new PushUpAnalyzer(),
    squat: new SquatAnalyzer(),
  });

  const fpsTrackerRef = useRef(new FPSTracker());
  const rafIdRef = useRef(null);
  const isProcessingRef = useRef(false);
  const latestLandmarksRef = useRef(null);
  const prevRepCount = useRef(0);

  const [result, setResult] = useState(null);
  const [exerciseLabel, setExerciseLabel] = useState(null);
  const [fps, setFps] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // ── Start the Web Worker once on mount ────────────────────────
  useEffect(() => {
    const worker = new Worker('/poseWorker.js');
    worker.onmessage = (event) => {
      const { type, landmarks, message } = event.data;

      if (type === 'READY') {
        setWorkerReady(true);
        return;
      }
      if (type === 'ERROR') {
        console.error('[Worker]', message);
        return;
      }
      if (type === 'RESULT') {
        isProcessingRef.current = false;
        const pose = landmarks?.[0] ?? null;
        latestLandmarksRef.current = pose;

        const currentExercise = targetExerciseRef.current;
        let analysisResult = null;
        
        if (currentExercise && analyzersRef.current[currentExercise]) {
          analysisResult = analyzersRef.current[currentExercise].analyze(pose);
          setResult({ ...analysisResult, _exercise: currentExercise });
        } else {
          setResult(null);
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas && video && video.readyState >= 2) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw > 0 && vh > 0) {
            if (canvas.width !== vw || canvas.height !== vh) {
              canvas.width = vw;
              canvas.height = vh;
            }
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, vw, vh);
            ctx.drawImage(video, 0, 0, vw, vh);
            if (pose) {
              drawSkeleton(
                ctx,
                pose,
                vw,
                vh,
                (analysisResult?.backAngle ?? 180) >= 150
              );
            }
          }
        }

        fpsTrackerRef.current.tick();
        setFps(fpsTrackerRef.current.fps);

        if (analysisResult) {
          if (analysisResult.repCount !== prevRepCount.current) {
            voiceCoach.speakRepCount(analysisResult.repCount);
            prevRepCount.current = analysisResult.repCount;
          } else if (analysisResult.voiceFeedback) {
            voiceCoach.speakDirect(analysisResult.voiceFeedback);
          }
        }
      }
    };
    worker.onerror = (e) => console.error('[Worker error]', e);
    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── rAF loop (only runs while cameraActive) ────────────────────
  const loop = useCallback(() => {
    const video = videoRef.current;
    const worker = workerRef.current;

    if (!video || video.readyState < 2 || !worker || isProcessingRef.current) {
      rafIdRef.current = requestAnimationFrame(loop);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      rafIdRef.current = requestAnimationFrame(loop);
      return;
    }

    const now = performance.now();

    isProcessingRef.current = true;

    createImageBitmap(video)
      .then((bitmap) => {
        worker.postMessage(
          { type: 'DETECT', imageBitmap: bitmap, timestamp: now },
          [bitmap]
        );
      })
      .catch(() => {
        isProcessingRef.current = false;
      });

    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Start camera ──────────────────────────────────────────────
  const startCamera = useCallback(async (exerciseObj) => {
    const exId = typeof exerciseObj === 'string' ? exerciseObj : 'pushup';
    targetExerciseRef.current = exId;
    setExerciseLabel(exId.toUpperCase());
    
    setCameraError(null);
    setIsStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = resolve;
        });
        await videoRef.current.play();
      }

      setCameraActive(true);
      setIsStarting(false);
      rafIdRef.current = requestAnimationFrame(loop);
    } catch (err) {
      setCameraError(err.message || 'Camera access denied');
      setIsStarting(false);
    }
  }, [loop]);

  // ── Stop camera ───────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    latestLandmarksRef.current = null;
    isProcessingRef.current = false;
    fpsTrackerRef.current = new FPSTracker();
    
    targetExerciseRef.current = null;
    analyzersRef.current.pushup.reset();
    analyzersRef.current.squat.reset();
    prevRepCount.current = 0;

    setCameraActive(false);
    setExerciseLabel(null);
    setFps(0);
    setResult(null);
  }, []);

  // ── Toggle helper ─────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraActive, startCamera, stopCamera]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const resetSession = useCallback(() => {
    analyzersRef.current.pushup.reset();
    analyzersRef.current.squat.reset();
    prevRepCount.current = 0;
    setResult(null);
  }, []);

  return {
    videoRef,
    canvasRef,
    result,
    fps,
    cameraActive,
    cameraError,
    workerReady,
    isStarting,
    latestLandmarks: latestLandmarksRef,
    exerciseLabel,
    startCamera,
    stopCamera,
    toggleCamera,
    resetSession,
  };
}
