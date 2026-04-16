import { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult } from '@mediapipe/tasks-vision';

export interface VisionResult {
  landmarks: PoseLandmarkerResult | null;
  emotion: string;
  energy: number;
}

export const useVision = (stream: MediaStream | null) => {
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [visionResult, setVisionResult] = useState<VisionResult>({
    landmarks: null,
    emotion: 'neutral',
    energy: 0,
  });
  const requestRef = useRef<number>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const initPose = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });
      setPoseLandmarker(landmarker);
    };
    initPose();
  }, []);

  const detect = useCallback(() => {
    if (!poseLandmarker || !videoRef.current || videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(detect);
      return;
    }

    const startTimeMs = performance.now();
    const results = poseLandmarker.detectForVideo(videoRef.current, startTimeMs);

    // Simple Emotion/Energy Heuristics based on pose
    let emotion = 'neutral';
    let energy = 0;

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      
      // Energy: Average movement/spread of key points
      // For simplicity, let's just look at shoulder/hip distance or something
      // But real energy would be delta over time.
      // Let's just do a placeholder for now.
      energy = 0.5; 

      // Emotion Heuristic (Very basic)
      // Shoulders up = tense? Slumped = sad?
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const nose = landmarks[0];

      if (leftShoulder.y < nose.y && rightShoulder.y < nose.y) {
        emotion = 'tense';
      } else if (leftShoulder.y > 0.6) {
        emotion = 'relaxed';
      }
    }

    setVisionResult({
      landmarks: results,
      emotion,
      energy,
    });

    requestRef.current = requestAnimationFrame(detect);
  }, [poseLandmarker]);

  useEffect(() => {
    if (stream && poseLandmarker) {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.play();
      videoRef.current = video;
      requestRef.current = requestAnimationFrame(detect);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, poseLandmarker, detect]);

  return visionResult;
};
