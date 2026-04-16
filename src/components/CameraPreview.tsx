import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useVision } from '../hooks/useVision';
import { cn } from '../lib/utils';
import { Maximize2, Minimize2, Activity } from 'lucide-react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  isCameraOn?: boolean;
  passion?: string;
  mode: 'debug' | 'pip' | 'hidden';
  onModeChange?: (mode: 'debug' | 'pip' | 'hidden') => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ stream, isCameraOn = true, passion = "", mode, onModeChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vision = useVision(stream);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!canvasRef.current || !vision.landmarks) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (vision.landmarks.landmarks && isCameraOn) {
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      vision.landmarks.landmarks.forEach(pose => {
        // 1. Draw Debug Skeleton if in debug mode
        if (mode === 'debug') {
          ctx.strokeStyle = '#00ffcc';
          ctx.lineWidth = 2;
          
          pose.forEach(landmark => {
            const x = landmark.x * width;
            const y = landmark.y * height;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.stroke();
          });

          const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
            [11, 23], [12, 24], [23, 24], // Torso
            [23, 25], [25, 27], [24, 26], [26, 28] // Legs
          ];

          ctx.beginPath();
          connections.forEach(([i, j]) => {
            const p1 = pose[i];
            const p2 = pose[j];
            if (p1 && p2) {
              ctx.moveTo(p1.x * width, p1.y * height);
              ctx.lineTo(p2.x * width, p2.y * height);
            }
          });
          ctx.stroke();
        }

        // 2. Draw AR Elements based on Passion (Always visible if camera is on)
        const p = passion.toLowerCase();
        
        const drawEmoji = (emoji: string, landmarkIndex: number, offset = { x: 0, y: 0 }, size = 30) => {
          const landmark = pose[landmarkIndex];
          if (landmark && landmark.visibility > 0.5) {
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, (landmark.x + offset.x) * width, (landmark.y + offset.y) * height);
          }
        };

        if (p.includes('paint') || p.includes('art')) {
          drawEmoji('🖌️', 16, { x: 0, y: -0.05 }, 35); // Brush in right hand
          drawEmoji('🎨', 15, { x: 0, y: -0.05 }, 35); // Palette in left hand
          // Floating sparkles
          ctx.font = '15px serif';
          ctx.fillText('✨', Math.random() * width, Math.random() * height);
        } else if (p.includes('sing') || p.includes('music') || p.includes('singer')) {
          drawEmoji('🎙️', 0, { x: 0, y: 0.15 }, 45); // Mic near mouth (landmark 0 is nose)
          drawEmoji('🎵', 11, { x: -0.1, y: -0.1 }, 25); // Note near left shoulder
          drawEmoji('🎶', 12, { x: 0.1, y: -0.1 }, 25); // Note near right shoulder
          drawEmoji('🏆', 16, { x: 0.1, y: 0 }, 30); // Award in hand
        } else if (p.includes('tech') || p.includes('entrepreneur') || p.includes('startup')) {
          drawEmoji('💻', 11, { x: -0.15, y: 0.1 }, 30); 
          drawEmoji('🚀', 12, { x: 0.15, y: -0.1 }, 30);
          drawEmoji('💡', 0, { x: 0, y: -0.2 }, 30); // Idea above head
        } else if (p.includes('health') || p.includes('wellness') || p.includes('yoga')) {
          drawEmoji('🧘', 0, { x: 0, y: -0.25 }, 40);
          drawEmoji('🌱', 15, { x: -0.05, y: 0 }, 25);
          drawEmoji('✨', 16, { x: 0.05, y: 0 }, 25);
        } else if (p.includes('sustainability') || p.includes('nature')) {
          drawEmoji('🌍', 11, { x: -0.1, y: -0.1 }, 30);
          drawEmoji('🌳', 12, { x: 0.1, y: -0.1 }, 30);
          drawEmoji('🦋', 15, { x: 0, y: 0 }, 25);
        } else if (p.includes('community') || p.includes('people')) {
          drawEmoji('🤝', 11, { x: -0.1, y: 0 }, 30);
          drawEmoji('❤️', 12, { x: 0.1, y: 0 }, 30);
          drawEmoji('✨', 0, { x: 0, y: -0.2 }, 25);
        }
      });
    }
  }, [vision.landmarks, mode, passion, isCameraOn]);

  if (mode === 'hidden') return null;

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-500",
        mode === 'pip' ? "fixed bottom-6 right-6 w-48 h-32 rounded-2xl z-50 shadow-2xl" : "w-full h-full rounded-none"
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
          !isCameraOn ? "opacity-0" : "opacity-60"
        )}
      />
      
      {!isCameraOn && (
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4 z-10">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-[8px] font-mono uppercase tracking-widest text-white/20">Presence Paused</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full animate-pulse",
          vision.landmarks ? "bg-emerald-400" : "bg-red-400"
        )} />
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
          Vision: {vision.emotion}
        </span>
      </div>

      <div className="absolute top-3 right-3 flex gap-2">
        <button
          onClick={() => onModeChange?.(mode === 'pip' ? 'debug' : 'pip')}
          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
        >
          {mode === 'pip' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
        </button>
      </div>

      {mode === 'debug' && (
        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-4">
          <div className="glass-card p-3 space-y-1">
            <div className="text-[8px] font-mono uppercase text-white/30">Energy</div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-400"
                animate={{ width: `${vision.energy * 100}%` }}
              />
            </div>
          </div>
          <div className="glass-card p-3 space-y-1">
            <div className="text-[8px] font-mono uppercase text-white/30">Sentiment</div>
            <div className="text-[10px] font-mono text-white/60">{vision.emotion}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
