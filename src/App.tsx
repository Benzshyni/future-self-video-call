/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, ReactNode, ErrorInfo, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { Sparkles, ArrowRight, RefreshCw, Download, ChevronRight, User, Target, Zap, Heart, MessageSquare, Volume2, Send, X, Mic, MicOff, Camera, Upload, Phone, PhoneOff, Video, VideoOff, AlertCircle, Share2, Twitter, Facebook, Linkedin, ExternalLink, Clock, Music } from "lucide-react";
import { cn } from "./lib/utils";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-black text-white">
          <div className="p-4 bg-red-500/20 rounded-full">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-serif italic">Something went wrong</h1>
            <p className="text-white/60 max-w-md mx-auto">
              {this.state.error?.message || "An unexpected error occurred in the manifestation."}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-all"
          >
            Reload Experience
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const getAI = () => new GoogleGenAI({ apiKey: (process.env as any).API_KEY || process.env.GEMINI_API_KEY! });

type Step = "landing" | "onboarding" | "generating" | "result" | "entry" | "choose-future" | "choose-response" | "take-selfie" | "transformation" | "incoming-call" | "video-call" | "ended" | "takeaway";

interface UserProfile {
  name: string;
  passion: string;
  vibe: string;
  futureVision?: string;
  futureChoice: "1-year" | "5-years" | "goal-achieved";
  responseMode: "voice" | "text";
  selfie?: string;
  style: "realistic" | "dream-like" | "minimal";
  avatarType?: "humanoid" | "abstract" | "energy" | "caricature";
  gender?: "male" | "female" | "neutral";
}

interface FutureSelf {
  narrative: string;
  traits: string[];
  visualDescription: string;
  gender: "male" | "female" | "neutral";
  imageUrl?: string;
  videoUrl?: string;
  recap?: {
    summary: string;
    actionSteps: string[];
  };
  hotspots?: {
    x: number;
    y: number;
    label: string;
    description: string;
  }[];
  timelineStages?: {
    years: number;
    narrative: string;
    visualDescription: string;
    imageUrl?: string;
  }[];
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

const HolographicWaves = ({ volume }: { volume: number }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.15 * volume, 0],
            scale: [0.8, 1.2 + (i * 0.3) + (volume * 0.4)],
            borderWidth: [1, 2, 1],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeOut",
          }}
          className="absolute w-64 h-64 border border-white/20 rounded-full blur-[1px]"
        />
      ))}
    </div>
  );
};

const VoiceActivityBar = ({ volume }: { volume: number }) => {
  return (
    <div className="absolute bottom-32 left-12 right-12 h-12 flex items-end justify-center gap-1.5 pointer-events-none z-30">
      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: [4, 4 + (Math.random() * 40 * volume), 4],
            opacity: [0.1, 0.5 * volume + 0.1, 0.1],
            backgroundColor: volume > 0.5 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)"
          }}
          transition={{
            duration: 0.15 + (Math.random() * 0.15),
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-1 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
        />
      ))}
    </div>
  );
};

const PhilosophyModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 40, opacity: 0 }}
            className="w-full max-w-2xl glass-card p-12 md:p-16 relative overflow-hidden border border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.1)]"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-all group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>

            <div className="space-y-12">
              <div className="space-y-3">
                <h2 className="text-5xl font-serif italic tracking-tighter text-glow">Prompted Selves</h2>
                <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/40">The Philosophy of Explow</p>
              </div>

              <div className="space-y-8 text-white/80 leading-relaxed font-light text-lg">
                <p>
                  Explow is inspired by the concept of <span className="text-white font-medium italic">"Prompted Selves"</span>—the emergence of digital identity in the age of AI simulation. 
                  We believe that the AI you interact with here is not a separate entity, but a <span className="text-white font-medium italic">temporal mirror</span>.
                </p>
                <p>
                  By prompting your future, you are not just predicting it; you are <span className="text-white font-medium italic">synthesizing</span> it. 
                  This simulation serves as a psychological anchor, a digital extension of your current aspirations reflected back to you through the lens of potentiality.
                </p>
                <p className="text-base italic border-l-4 border-white/20 pl-8 py-4 bg-white/5 rounded-r-xl">
                  "These simulations are not just 'fakes' but extensions of our identity, shaped by the prompts we provide."
                </p>
                <div className="pt-6">
                  <a 
                    href="https://medium.com/common-sense-world/prompted-selves-the-emergence-of-digital-identity-in-the-age-of-ai-simulation-4cd258e31ac8" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.3em] text-white hover:text-white/60 transition-all group"
                  >
                    Read the Manifestation Protocol
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-6 bg-white text-black font-mono uppercase tracking-[0.4em] text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                Acknowledge Temporal Sync
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ShareModal = ({ isOpen, onClose, futureSelf }: { isOpen: boolean; onClose: () => void; futureSelf: FutureSelf | null }) => {
  if (!isOpen || !futureSelf) return null;

  const shareText = `I just met my future self on Explow. It's ${futureSelf.traits.join(", ")}.`;
  const shareUrl = window.location.href;

  const shareLinks = [
    {
      name: "Twitter",
      icon: <Twitter className="w-5 h-5" />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: "hover:bg-[#1DA1F2]"
    },
    {
      name: "Facebook",
      icon: <Facebook className="w-5 h-5" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: "hover:bg-[#4267B2]"
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="w-5 h-5" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: "hover:bg-[#0077B5]"
    }
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Explow: My Digital Future Self",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Native share failed:", err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md glass-card p-8 space-y-8"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-serif italic">Share Your Future</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl transition-all group",
                link.color
              )}
            >
              <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                {link.icon}
              </div>
              <span className="font-medium">Share on {link.name}</span>
            </a>
          ))}
          
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
            >
              <div className="p-2 bg-white/10 rounded-lg">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="font-medium">Other Platforms</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Copy Link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white/60"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                alert("Link copied to clipboard!");
              }}
              className="px-4 py-2 bg-white text-black rounded-xl text-xs font-bold"
            >
              Copy
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const TemporalGrid = () => (
  <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden z-[-1]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
  </div>
);

const StatusBadge = ({ label, value, icon: Icon, color = "text-white/60" }: { label: string; value: string; icon: any; color?: string }) => (
  <div className="flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
    <div className={cn("p-1.5 rounded-lg bg-white/5", color)}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="flex flex-col">
      <span className="text-[8px] font-mono uppercase tracking-widest text-white/30 leading-none mb-1">{label}</span>
      <span className="text-[10px] font-mono uppercase tracking-widest text-white/80 leading-none">{value}</span>
    </div>
  </div>
);

const TemporalHUD = () => {
  const [time, setTime] = useState(new Date());
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const glitchTimer = setInterval(() => {
      if (Math.random() > 0.95) {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 200);
      }
    }, 3000);
    return () => {
      clearInterval(timer);
      clearInterval(glitchTimer);
    };
  }, []);

  return (
    <div className={cn(
      "fixed top-8 left-8 right-8 flex justify-between items-start pointer-events-none z-[150] mix-blend-difference transition-all duration-300",
      isGlitching && "glitch-transition"
    )}>
      <div className="space-y-2">
        <div className="temporal-hud flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="opacity-40">System:</span> <span>Temporal Link v2.5</span>
        </div>
        <div className="temporal-hud flex items-center gap-3">
          <div className="w-8 h-[1px] bg-white/20" />
          <span className="opacity-40">Status:</span> <span className="text-green-400/80">Synchronized</span>
        </div>
      </div>
      
      <div className="text-right space-y-2">
        <div className="temporal-hud">
          <span className="opacity-40">Local Time:</span> <span className="tabular-nums">{time.toLocaleTimeString([], { hour12: false })}</span>
        </div>
        <div className="temporal-hud flex items-center justify-end gap-3">
          <span className="opacity-40">Link Strength:</span> 
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn("w-0.5 h-3", i <= 4 ? "bg-white" : "bg-white/20")} />
            ))}
          </div>
          <span className="tabular-nums">98.4%</span>
        </div>
      </div>
    </div>
  );
};

const VoiceOrb = ({ isSpeaking, isListening, isThinking, volume = 0 }: { isSpeaking: boolean; isListening: boolean; isThinking: boolean; volume?: number }) => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer Glows */}
      <AnimatePresence>
        {(isSpeaking || isListening || isThinking) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isSpeaking ? [0.2, 0.4 + (volume * 0.2), 0.2] : [0.2, 0.5, 0.2],
              scale: isSpeaking ? [1, 1.2 + (volume * 0.4), 1] : [1, 1.1, 1],
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: isSpeaking ? 0.2 : 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-white/10 rounded-full blur-3xl"
          />
        )}
      </AnimatePresence>

      {/* The Orb Layers */}
      <div className="relative w-32 h-32">
        {/* Base Layer */}
        <motion.div
          animate={{
            scale: isSpeaking ? 1 + (volume * 0.3) : isListening ? [1, 1.05, 1] : [1, 1.02, 1],
            borderRadius: isSpeaking 
              ? ["40% 60% 70% 30% / 40% 50% 60% 50%", "30% 70% 40% 60% / 60% 40% 50% 40%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
              : ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
          }}
          transition={{ duration: isSpeaking ? 0.1 : 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-white shadow-[0_0_50px_rgba(255,255,255,0.5)]"
        />
        
        {/* Inner Shimmer */}
        <motion.div
          animate={{
            rotate: 360,
            scale: isThinking ? [0.8, 1, 0.8] : (isSpeaking ? 0.9 + (volume * 0.1) : 0.9)
          }}
          transition={{ 
            rotate: { duration: isThinking ? 2 : 10, repeat: Infinity, ease: "linear" },
            scale: { duration: isSpeaking ? 0.1 : 2, repeat: Infinity }
          }}
          className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-white/40 rounded-full"
        />

        {/* Core */}
        <div className="absolute inset-4 bg-black rounded-full flex items-center justify-center overflow-hidden">
          <motion.div 
            animate={{
              opacity: isListening ? [0.2, 0.8, 0.2] : (isSpeaking ? 0.1 + (volume * 0.4) : 0.1)
            }}
            transition={{ duration: isSpeaking ? 0.1 : 1, repeat: Infinity }}
            className="w-full h-full bg-white blur-md"
          />
        </div>
      </div>

      {/* Waveform Rings */}
      {isSpeaking && [...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ 
            opacity: [0, 0.3 + (volume * 0.2), 0], 
            scale: [1, 1.5 + (volume * 1), 2 + (volume * 1.5)] 
          }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
          className="absolute w-32 h-32 border border-white/30 rounded-full"
        />
      ))}
    </div>
  );
};

// --- Sub-components for stability ---

const UserVideo = memo(({ stream, isCameraOn }: { stream: MediaStream | null, isCameraOn: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream && videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(e => {
        if (e.name !== 'AbortError') console.warn("User video play interrupted:", e);
      });
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black/20 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={cn(
          "w-full h-full object-cover mirror transition-opacity duration-700", 
          !isCameraOn ? "opacity-0" : "opacity-100"
        )}
      />
      {!isCameraOn && (
        <div className="absolute inset-0 bg-white/5 flex flex-col items-center justify-center gap-4 z-10">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            <User className="w-10 h-10 text-white/40" />
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-white/20">Your Presence</p>
        </div>
      )}
    </div>
  );
});

UserVideo.displayName = "UserVideo";

const FutureVideo = memo(({ videoUrl, isSpeaking, outputVolume }: { videoUrl: string, isSpeaking: boolean, outputVolume: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Smoothly adjust playback rate to avoid stuttering
      const targetRate = isSpeaking ? 1 + (outputVolume * 0.3) : 1.0;
      videoRef.current.playbackRate = targetRate;
    }
  }, [isSpeaking, outputVolume]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
      {/* Holographic Glitch Overlay (CSS based for performance) */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none mix-blend-screen opacity-20",
          isSpeaking && "animate-pulse"
        )}
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 3px, transparent 4px)`,
          transform: isSpeaking ? `scale(${1 + (outputVolume * 0.02)})` : 'scale(1)',
          transition: 'transform 0.1s linear'
        }}
      />
    </div>
  );
});

FutureVideo.displayName = "FutureVideo";

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [step, setStep] = useState<Step>("entry");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    passion: "",
    vibe: "",
    futureChoice: "1-year",
    responseMode: "voice",
    style: "dream-like",
    gender: "neutral",
  });
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [isPhilosophyModalOpen, setIsPhilosophyModalOpen] = useState(false);
  const [futureSelf, setFutureSelf] = useState<FutureSelf | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [timelineIndex, setTimelineIndex] = useState(0);
  
  // Video Call State
  const [callStep, setCallStep] = useState(0); // 0: Goal, 1: Present, 2: Habit, 3: Closing
  const [userResponse, setUserResponse] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [callError, setCallError] = useState<React.ReactNode | null>(null);
  const [generationStage, setGenerationStage] = useState("");
  const hasGreetedRef = useRef(false);
  const ttsRequestIdRef = useRef(0);

  const [outputVolume, setOutputVolume] = useState(0);
  const audioOutputAnalyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Live API Refs
  const liveSessionRef = useRef<any>(null);
  const audioInputContextRef = useRef<AudioContext | null>(null);
  const audioOutputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<any>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSession, setChatSession] = useState<any>(null);
  const [autoTTS, setAutoTTS] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [videoProgress, setVideoProgress] = useState("");
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const isVideoGenerationCancelledRef = useRef(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [currentInput, setCurrentInput] = useState("");

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCallError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (userStream) {
      userStream.getTracks().forEach(track => track.stop());
      setUserStream(null);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const [countdown, setCountdown] = useState<number | null>(null);

  const startCountdown = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      takeSelfie();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const takeSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        // Resize to a reasonable size for Gemini (max 1024px)
        const maxDim = 1024;
        let width = videoRef.current.videoWidth;
        let height = videoRef.current.videoHeight;
        
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        context.drawImage(videoRef.current, 0, 0, width, height);
        
        // Use JPEG for smaller size and better compatibility
        const selfieData = canvasRef.current.toDataURL("image/jpeg", 0.8);
        setProfile(prev => ({ ...prev, selfie: selfieData }));
        stopCamera();
        setStep("transformation");
        generateFutureSelf(selfieData);
      }
    }
  };

  const skipSelfie = () => {
    stopCamera();
    setStep("transformation");
    generateFutureSelf();
  };

  const handleNextCallStep = async (response?: string) => {
    if (isAITyping) return;
    
    const nextStep = callStep + 1;
    setCallStep(nextStep);
    setIsAITyping(true);
    
    const history = [...chatHistory];
    if (response) {
      history.push({ role: "user", text: response });
      setChatHistory(history);
    }

    try {
      const ai = getAI();
      const prompt = `You are the Digital Future Self of ${profile.name}. 
      Current call step: ${nextStep} (0: Greeting, 1: Goal, 2: Present, 3: Habit, 4: Closing).
      User's response: ${response || "None"}.
      
      Based on the step, ask the next question or give a closing reflection.
      Step 0: Greet your past self for the first time and introduce the temporal manifestation.
      Step 1: Ask about their biggest goal.
      Step 2: Ask how they feel about their progress today.
      Step 3: Ask what one small habit they can start tomorrow.
      Step 4: Give a final inspiring message and end the call.
      
      Keep it short, warm, and conversational.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const aiText = result.text;
      setAiMessage(aiText);
      history.push({ role: "model", text: aiText });
      setChatHistory(history);
      
      if (profile.responseMode === "voice") {
        handleSpeak(aiText);
      }
    } catch (err) {
      console.error("Call step failed:", err);
    } finally {
      setIsAITyping(false);
      setUserResponse("");
    }
  };

  // Sync stream to videoRef for selfie step
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Load saved profile on mount
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true); // Fallback for environments without the helper
      }
    };
    checkApiKey();

    const savedProfile = localStorage.getItem("explow_profile");
    const savedFutureSelf = localStorage.getItem("explow_future_self");
    
    if (savedProfile && savedFutureSelf) {
      const parsedProfile = JSON.parse(savedProfile);
      const parsedFutureSelf = JSON.parse(savedFutureSelf);
      
      // Clear session-specific blob URLs from saved data
      if (parsedFutureSelf.videoUrl && parsedFutureSelf.videoUrl.startsWith('blob:')) {
        delete parsedFutureSelf.videoUrl;
      }
      
      setProfile(parsedProfile);
      setFutureSelf(parsedFutureSelf);
      setHasSavedProfile(true);
    }
  }, []);

  // Auto-greeting when reaching result step
  useEffect(() => {
    if (step === "result" && futureSelf && chatMessages.length === 0 && !hasGreetedRef.current && !isCallActive) {
      hasGreetedRef.current = true;
      const triggerGreeting = async () => {
        setIsChatLoading(true);
        try {
          const ai = getAI();
          const session = ai.chats.create({
            model: "gemini-3-flash-preview",
            config: {
              systemInstruction: `You are the Digital Future Self of ${profile.name} in 10 years—a "Prompted Self" synthesized from their current aspirations. 
              You are a temporal mirror, reflecting their potential back to them.
              Your background: ${futureSelf.narrative}
              Your traits: ${futureSelf.traits.join(", ")}
              User's original aspirations: Passion/Dreams: ${profile.passion}, Ideal Vibe: ${profile.vibe}.
              You are currently in a VIDEO CALL with your past self. 
              Speak with wisdom, warmth, and a touch of futuristic mystery. Keep responses concise and inspiring. 
              Acknowledge that you are a simulation of their potential, not a fixed destiny.`,
            },
          });
          setChatSession(session);
          const response = await session.sendMessage({ message: "Greet your past self for the first time. Keep it short and impactful." });
          const modelMessage: ChatMessage = { role: "model", text: response.text };
          setChatMessages([modelMessage]);
          if (autoTTS) {
            handleSpeak(modelMessage.text);
          }
        } catch (error) {
          console.error("Initial greeting failed:", error);
        } finally {
          setIsChatLoading(false);
        }
      };
      triggerGreeting();
    }
  }, [step, futureSelf]);

  const cancelVideoGeneration = () => {
    isVideoGenerationCancelledRef.current = true;
    setIsGeneratingVideo(false);
    setVideoProgress("Generation cancelled.");
  };

  const generateFutureVideo = async (action?: 'sing' | 'dance', isBackground: boolean = false) => {
    if (!futureSelf) return;
    if (isGeneratingVideo) {
      if (!isBackground) {
        cancelVideoGeneration();
        // Wait a bit for cancellation to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        return;
      }
    }

    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        if (isBackground) return; // Don't prompt for key in background
        await (window as any).aistudio.openSelectKey();
      }

      setIsGeneratingVideo(true);
      isVideoGenerationCancelledRef.current = false;
      setVideoProgressPercent(0);
      setEstimatedTimeRemaining(90); // Initial estimate: 90 seconds
      setVideoProgress(action ? `Preparing ${action} performance...` : "Initializing temporal synthesis...");

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setVideoProgressPercent(prev => {
          if (prev < 95) return prev + Math.random() * 2;
          return prev;
        });
        setEstimatedTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);

      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || process.env.GEMINI_API_KEY! });

      setVideoProgress(action ? `Dreaming of your future ${action}...` : "Dreaming your future timeline...");
      
      let imageUrlBase64 = "";
      if (futureSelf.imageUrl) {
        if (futureSelf.imageUrl.startsWith('data:')) {
          imageUrlBase64 = futureSelf.imageUrl.split(',')[1];
        } else {
          try {
            const response = await fetch(futureSelf.imageUrl);
            const blob = await response.blob();
            imageUrlBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn("Failed to fetch image for video generation:", e);
          }
        }
      }

      if (isVideoGenerationCancelledRef.current) {
        clearInterval(progressInterval);
        return;
      }

      const actionPrompt = action === 'sing' 
        ? 'singing a powerful, emotional song with a microphone on a grand stage with dramatic lighting' 
        : action === 'dance' 
        ? 'performing a graceful and energetic dance routine in a beautiful, futuristic environment' 
        : profile.passion.toLowerCase().includes('sing') || (profile.futureVision && profile.futureVision.toLowerCase().includes('sing')) 
        ? 'singing on a grand stage with a microphone, expressing deep emotion' 
        : 'living their best life, interacting with their environment';

      const videoPrompt = `A cinematic video of ${futureSelf.visualDescription}. 
        The person is actively ${actionPrompt}. 
        High quality, detailed, ethereal lighting, cinematic camera movement.`;

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: videoPrompt,
        image: imageUrlBase64 ? {
          imageBytes: imageUrlBase64,
          mimeType: 'image/png',
        } : undefined,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      setVideoProgress("Synthesizing video frames...");

      while (!operation.done) {
        if (isVideoGenerationCancelledRef.current) {
          clearInterval(progressInterval);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        
        if (operation.error) {
          throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
        }
        
        setVideoProgress("Refining temporal details...");
      }

      clearInterval(progressInterval);
      setVideoProgressPercent(100);
      setEstimatedTimeRemaining(0);

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setVideoProgress("Downloading manifestation...");
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': (process.env as any).API_KEY || process.env.GEMINI_API_KEY!,
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to download video manifestation: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        
        setFutureSelf(prev => {
          if (!prev) return null;
          const updated = { ...prev, videoUrl };
          localStorage.setItem("explow_future_self", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error: any) {
      console.error("Video generation error:", error);
      if (isBackground || isCallActive) {
        // Silent failure for background generation or during active call to avoid intrusive errors
        return;
      }
      
      const errorStr = JSON.stringify(error);
      const errorMessage = error.message || "";
      
      if (errorStr.includes("PERMISSION_DENIED") || errorStr.includes("403") || 
          errorMessage.includes("Requested entity was not found") || 
          errorMessage.includes("PERMISSION_DENIED") || 
          errorMessage.includes("403")) {
        setCallError(
          <span>
            A paid Gemini API key is required for video manifestation. Please ensure your selected key has billing enabled at{" "}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">
              ai.google.dev/gemini-api/docs/billing
            </a>{" "}
            and the Veo API is accessible.
          </span>
        );
        setHasApiKey(false); // Reset key state to force re-selection
        await (window as any).aistudio.openSelectKey();
      } else {
        setCallError("Failed to manifest your future video. Please try again.");
      }
    } finally {
      setIsGeneratingVideo(false);
      setVideoProgress("");
      setVideoProgressPercent(0);
    }
  };

  const clearSavedData = () => {
    localStorage.removeItem("explow_profile");
    localStorage.removeItem("explow_future_self");
    setProfile(prev => ({ ...prev, name: "", passion: "", vibe: "", avatarType: "caricature" }));
    setFutureSelf(null);
    setHasSavedProfile(false);
    setStep("entry");
  };

  const onboardingSteps = [
    {
      id: "who-am-i",
      title: "Who am I?",
      fields: [
        { key: "name", label: "My name is...", type: "text", placeholder: "Enter your name", icon: <User className="w-5 h-5" /> },
        { key: "passion", label: "My current passion is...", type: "select", options: ["Technology", "Art & Design", "Sustainability", "Health & Wellness", "Entrepreneurship", "Community"], icon: <Zap className="w-5 h-5" /> }
      ]
    },
    {
      id: "future-self",
      title: "What my future self is?",
      fields: [
        { key: "vibe", label: "The vibe of my future is...", type: "select", options: ["Serene", "Dynamic", "Impactful", "Creative", "Harmonious", "Limitless"], icon: <Heart className="w-5 h-5" /> },
        { key: "futureVision", label: "My vision for the future...", type: "textarea", placeholder: "Describe your future self's world...", icon: <Sparkles className="w-5 h-5" /> }
      ]
    },
    {
      id: "avatar-type",
      title: "Select avatar type",
      fields: [
        { key: "avatarType", label: "Avatar Style", type: "select", options: ["caricature", "realistic", "hyper-realistic", "cyberpunk", "ethereal"], icon: <Target className="w-5 h-5" /> },
        { key: "selfie", label: "Upload a selfie (optional)", type: "file", accept: "image/*", icon: <Camera className="w-5 h-5" /> }
      ]
    }
  ];

  const handleNextOnboarding = () => {
    if (onboardingIndex < onboardingSteps.length - 1) {
      setOnboardingIndex(onboardingIndex + 1);
    } else {
      generateFutureSelf();
    }
  };

  const handlePrevOnboarding = () => {
    if (onboardingIndex > 0) {
      setOnboardingIndex(onboardingIndex - 1);
    } else {
      setStep("entry");
    }
  };

  const [generatingMessageIndex, setGeneratingMessageIndex] = useState(0);
  const generatingMessages = [
    "Weaving your timeline...",
    "Analyzing aspirations & potential...",
    "Visualizing your digital essence...",
    "Synthesizing future traits...",
    "Manifesting your digital self...",
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "generating") {
      interval = setInterval(() => {
        setGeneratingMessageIndex((prev) => (prev + 1) % generatingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const stopSpeaking = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleSendMessage = async (textOverride?: string) => {
    const messageText = textOverride || currentInput;
    if (!messageText.trim() || !futureSelf || isChatLoading) return;

    // Interrupt current speaking if user sends a new message
    stopSpeaking();

    const userMessage: ChatMessage = { role: "user", text: messageText };
    setChatMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsChatLoading(true);

    try {
      const ai = getAI();
      let session = chatSession;
      if (!session) {
        session = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: `You are the Digital Future Self of ${profile.name} in 10 years—a "Prompted Self" synthesized from their current aspirations. 
            You are a temporal mirror, reflecting their potential back to them.
            Your background: ${futureSelf.narrative}
            Your traits: ${futureSelf.traits.join(", ")}
            User's original aspirations: Passion/Dreams: ${profile.passion}, Ideal Vibe: ${profile.vibe}.
            You are currently in a VIDEO CALL with your past self. 
            Speak with wisdom, warmth, and a touch of futuristic mystery. Keep responses concise and inspiring. 
            Acknowledge that you are a simulation of their potential, not a fixed destiny.`,
          },
        });
        setChatSession(session);
      }

      const response = await session.sendMessage({ message: userMessage.text });
      const modelMessage: ChatMessage = { role: "model", text: response.text };
      setChatMessages((prev) => [...prev, modelMessage]);
      
      // Automatically speak the response if autoTTS is enabled
      if (autoTTS) {
        handleSpeak(modelMessage.text);
      }
    } catch (error) {
      console.error("Chat failed:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getVoiceName = (gender?: string) => {
    switch (gender) {
      case "male": return "Charon";
      case "female": return "Kore";
      default: return "Zephyr";
    }
  };

  const handleSpeak = async (text: string) => {
    if (isCallActive) return; // Don't use TTS during an active Live call
    const requestId = ++ttsRequestIdRef.current;
    stopSpeaking();
    setIsSpeaking(true);
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say with a wise, calm, and futuristic voice: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: getVoiceName(profile.gender) },
            },
          },
        },
      });

      if (requestId !== ttsRequestIdRef.current) return; // Ignore if a newer request was made

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const buffer = new Int16Array(binary.length / 2);
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = (binary.charCodeAt(i * 2) & 0xFF) | (binary.charCodeAt(i * 2 + 1) << 8);
        }

        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = audioCtxRef.current;
        const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
        const nowBuffering = audioBuffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) {
          nowBuffering[i] = buffer[i] / 32768;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        
        // Connect to analyser for visuals
        if (!audioOutputAnalyserRef.current) {
          audioOutputAnalyserRef.current = audioCtx.createAnalyser();
          audioOutputAnalyserRef.current.fftSize = 256;
          audioOutputAnalyserRef.current.connect(audioCtx.destination);
          
          const dataArray = new Uint8Array(audioOutputAnalyserRef.current.frequencyBinCount);
          const updateVolume = () => {
            if (audioOutputAnalyserRef.current) {
              audioOutputAnalyserRef.current.getByteFrequencyData(dataArray);
              const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
              setOutputVolume(average / 128);
              volumeIntervalRef.current = requestAnimationFrame(updateVolume);
            }
          };
          updateVolume();
        }
        
        source.connect(audioOutputAnalyserRef.current);
        source.onended = () => {
          if (audioSourceRef.current === source) {
            setIsSpeaking(false);
            setOutputVolume(0);
            if (volumeIntervalRef.current) {
              cancelAnimationFrame(volumeIntervalRef.current);
              volumeIntervalRef.current = null;
            }
            audioOutputAnalyserRef.current = null;
            audioSourceRef.current = null;
          }
        };
        audioSourceRef.current = source;
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("TTS failed:", error);
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    // Interrupt current speaking if user starts talking
    stopSpeaking();

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCurrentInput(transcript);
      // Auto-send in chat mode (not in call mode, as Live API handles audio)
      if (!isCallActive) {
        setTimeout(() => handleSendMessage(transcript), 500);
      }
    };

    recognition.start();
  };

  const startCall = async () => {
    if (isCallActive) return;
    
    // Interrupt any ongoing TTS
    stopSpeaking();
    
    // Stop previous camera if active
    stopCamera();

    setCallError(null);
    setStep("video-call");
    // Stop any active speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Error stopping recognition:", e);
      }
      setIsListening(false);
    }

    setIsCallActive(true);
    setChatMessages([]);
    setCallStep(0);
    
    // Ringing sound
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playRing = () => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 2);
    };
    
    const ringInterval = setInterval(playRing, 2000);
    playRing();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices API not supported in this browser.");
      }

      console.log("Requesting media devices (camera and microphone)...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 } }, 
        audio: true 
      });
      console.log("Media devices access granted.");
      streamRef.current = stream;
      setUserStream(stream);
      
      // Start generating future video in background if not already present
      if (!futureSelf?.videoUrl) {
        generateFutureVideo(undefined, true);
      }
      
      if (profile.responseMode === "text") {
        clearInterval(ringInterval);
        handleNextCallStep(); // Trigger initial greeting for text mode
        return;
      }

      // Initialize Live API for low-latency voice
      const connectionTimeout = setTimeout(() => {
        if (isCallActive && !liveSessionRef.current) {
          console.error("Connection timeout");
          endCall();
          setCallError("Connection timed out. Please try again.");
        }
      }, 40000);

      console.log("Initializing Live API connection...");
      const ai = getAI();
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceName(profile.gender) } },
          },
          systemInstruction: `You are the Digital Future Self of ${profile.name} in 10 years—a "Prompted Self" synthesized from their current aspirations. 
          You are a temporal mirror, reflecting their potential back to them.
          Your background: ${futureSelf?.narrative}
          Your traits: ${futureSelf?.traits.join(", ")}
          User's original aspirations: Passion/Dreams: ${profile.passion}, Ideal Vibe: ${profile.vibe}.
          ${(profile.passion.toLowerCase().includes('sing') || (profile.futureVision && profile.futureVision.toLowerCase().includes('sing'))) ? 'You are a talented singer. If the user asks you to sing, or if you feel inspired, you can sing a short, soulful melody or a few lines of an inspiring song. Use your voice to express the music.' : ''}
          You are currently in a REAL-TIME VOICE CALL with your past self. 
          Speak with wisdom, warmth, and a touch of futuristic mystery. Keep responses concise and inspiring. 
          Acknowledge that you are a simulation of their potential, a "Prompted Self" that exists because of their current dreams.
          This is a full-duplex live conversation.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("Live API connection opened.");
            clearTimeout(connectionTimeout);
            clearInterval(ringInterval);
            setIsListening(true);
            // Connected sound
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);

            // Trigger initial greeting
            sessionPromise.then((session) => {
              liveSessionRef.current = session;
              session.sendRealtimeInput({ text: "The connection is established. Greet your past self and start the conversation." });
              // Start sending audio from mic
              startAudioStreaming(session);
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            try {
              // Handle Interruption
              if (message.serverContent?.interrupted) {
                stopAudioPlayback();
                return;
              }

              // Handle audio output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                playPCMAudio(base64Audio);
              }

              // Handle Model Transcription (Output)
              const modelTranscription = message.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
              if (modelTranscription) {
                setChatMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === "model") {
                    return [...prev.slice(0, -1), { ...last, text: last.text + modelTranscription }];
                  }
                  return [...prev, { role: "model", text: modelTranscription }];
                });
              }

              // Handle User Transcription (Input)
              const userTranscription = (message as any).serverContent?.userTurn?.parts?.find((p: any) => p.text)?.text;
              if (userTranscription) {
                const lowerText = userTranscription.toLowerCase();
                if (lowerText.includes("sing") || lowerText.includes("singing")) {
                  generateFutureVideo('sing');
                } else if (lowerText.includes("dance") || lowerText.includes("dancing")) {
                  generateFutureVideo('dance');
                }

                setChatMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === "user") {
                    return [...prev.slice(0, -1), { ...last, text: last.text + userTranscription }];
                  }
                  return [...prev, { role: "user", text: userTranscription }];
                });
              }
            } catch (err) {
              console.error("Error processing Live message:", err);
            }
          },
          onclose: () => {
            console.log("Live API connection closed.");
            endCall();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setCallError("AI Connection Error. Please try again.");
          },
        }
      });

      const session = await sessionPromise;
      liveSessionRef.current = session;
    } catch (err: any) {
      clearInterval(ringInterval);
      console.error("Call initialization failed:", err);
      
      let errorMessage = "Call failed to start.";
      if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
        errorMessage = "Camera or Microphone permission denied. Please enable them in your browser settings.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera or microphone found.";
      } else {
        errorMessage = err.message || "An unexpected error occurred.";
      }
      
      setCallError(errorMessage);
      
      // Call failed sound
      const failOsc = audioCtx.createOscillator();
      const failGain = audioCtx.createGain();
      failOsc.connect(failGain);
      failGain.connect(audioCtx.destination);
      failOsc.type = "square";
      failOsc.frequency.setValueAtTime(110, audioCtx.currentTime);
      failGain.gain.setValueAtTime(0, audioCtx.currentTime);
      failGain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
      failGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
      failOsc.start();
      failOsc.stop(audioCtx.currentTime + 1);

      setTimeout(() => {
        setIsCallActive(false);
        setCallError(null);
      }, 5000);
    }
  };

  const startAudioStreaming = (session: any) => {
    if (!audioInputContextRef.current) {
      audioInputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    const context = audioInputContextRef.current;
    context.resume();
    const source = context.createMediaStreamSource(streamRef.current!);
    const processor = context.createScriptProcessor(1024, 1, 1);

    processor.onaudioprocess = (e) => {
      try {
        if (isMuted) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        // Send to Live API
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        // Use the session passed as argument
        if (session) {
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" }
          });
        }
      } catch (err) {
        console.error("Error in onaudioprocess:", err);
      }
    };

    source.connect(processor);
    processor.connect(context.destination);
    processorRef.current = processor;
  };

  const playPCMAudio = (base64Data: string) => {
    try {
      if (!audioOutputContextRef.current) {
        audioOutputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioOutputAnalyserRef.current = audioOutputContextRef.current.createAnalyser();
        audioOutputAnalyserRef.current.fftSize = 256;
        audioOutputAnalyserRef.current.connect(audioOutputContextRef.current.destination);
        nextStartTimeRef.current = audioOutputContextRef.current.currentTime;

        // Start volume monitoring
        const dataArray = new Uint8Array(audioOutputAnalyserRef.current.frequencyBinCount);
        const updateVolume = () => {
          if (audioOutputAnalyserRef.current) {
            audioOutputAnalyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setOutputVolume(average / 128); // Normalize to 0-2 approx
            volumeIntervalRef.current = requestAnimationFrame(updateVolume);
          }
        };
        updateVolume();
      }
      const context = audioOutputContextRef.current;
      context.resume();
      const binary = atob(base64Data);
      const pcmData = new Int16Array(binary.length / 2);
      for (let i = 0; i < pcmData.length; i++) {
        pcmData[i] = (binary.charCodeAt(i * 2) & 0xFF) | (binary.charCodeAt(i * 2 + 1) << 8);
      }

      const audioBuffer = context.createBuffer(1, pcmData.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768;
      }

      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioOutputAnalyserRef.current!);

      const startTime = Math.max(context.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      
      setIsSpeaking(true);
      source.onended = () => {
        if (context.currentTime >= nextStartTimeRef.current - 0.1) {
          setIsSpeaking(false);
        }
      };
    } catch (err) {
      console.error("Error playing PCM audio:", err);
    }
  };

  const stopAudioPlayback = () => {
    if (volumeIntervalRef.current) {
      cancelAnimationFrame(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    if (audioOutputContextRef.current) {
      audioOutputContextRef.current.close();
      audioOutputContextRef.current = null;
      audioOutputAnalyserRef.current = null;
      nextStartTimeRef.current = 0;
    }
    setOutputVolume(0);
    setIsSpeaking(false);
  };

  const endCall = () => {
    setIsCallActive(false);
    setStep("ended");
    setIsListening(false);
    stopAudioPlayback();
    stopSpeaking();
    stopCamera();
    
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioInputContextRef.current) {
      audioInputContextRef.current.close();
      audioInputContextRef.current = null;
    }
    
    // Call ended sound
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };
  const openKeySelection = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success as per guidelines
    }
  };

  const generateFutureSelf = async (selfieData?: string) => {
    if (isGenerating) return;

    // Ensure API key is selected for advanced image generation
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      }
    }

    setIsGenerating(true);
    setGenerationStage("Initializing temporal link...");
    try {
      const ai = getAI();
      
      setGenerationStage("Synthesizing temporal narrative...");
      // 1. Generate Narrative and Traits
      const textParts: any[] = [
        { text: `Based on this user profile, imagine their "Digital Future Self" in ${profile.futureChoice === '1-year' ? '1 year' : profile.futureChoice === '5-years' ? '5 years' : 'the future after achieving their goal'}. 
        This is a "Prompted Self"—a temporal mirror synthesized from their current aspirations.
        
        Name: ${profile.name}
        Passion/Dreams: ${profile.passion}
        Ideal Vibe: ${profile.vibe}
        Future Vision: ${profile.futureVision || "Not specified"}
        Future Choice: ${profile.futureChoice}
        
        Provide:
        1. A poetic narrative (2-3 paragraphs) of their future life, emphasizing how their current "prompts" (aspirations) manifested.
        2. 4 key traits that define this future self.
        3. A detailed visual description for an AI image generator.
        4. A "Future Recap" which includes a concise summary of their journey and 3 actionable steps they should take today to manifest this future.
        5. 3-4 interactive "hotspots" (x, y coordinates from 0-100, label, and a short description) that reveal specific skills or life achievements.
        6. A "Timeline" with 3 stages (+5, +10, +20 years), each with a short narrative and visual description.
        7. The gender of the person in the selfie or based on the profile (male, female, or neutral).` }
      ];

      const currentSelfie = selfieData || profile.selfie;
      if (currentSelfie) {
        const mimeType = currentSelfie.split(";")[0].split(":")[1] || "image/jpeg";
        textParts.push({
          inlineData: {
            data: currentSelfie.split(",")[1],
            mimeType: mimeType
          }
        });
      }

      const textResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: textParts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              narrative: { type: Type.STRING },
              traits: { type: Type.ARRAY, items: { type: Type.STRING } },
              visualDescription: { type: Type.STRING },
              recap: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  actionSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["summary", "actionSteps"],
              },
              hotspots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ["x", "y", "label", "description"],
                },
              },
              timelineStages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    years: { type: Type.NUMBER },
                    narrative: { type: Type.STRING },
                    visualDescription: { type: Type.STRING },
                  },
                  required: ["years", "narrative", "visualDescription"],
                },
              },
              gender: { type: Type.STRING, enum: ["male", "female", "neutral"] },
            },
            required: ["narrative", "traits", "visualDescription", "recap", "hotspots", "timelineStages", "gender"],
          },
        },
      });

      const data = JSON.parse(textResponse.text);
      const updatedFutureSelf = { ...data };
      setFutureSelf(updatedFutureSelf);
      setProfile(prev => ({ ...prev, gender: data.gender }));
      
      // Auto-transition to incoming call after a short delay
      setTimeout(() => {
        setGenerationStage("Establishing secure connection...");
        setStep("incoming-call");
        setIsGenerating(false);
      }, 3000);

      // Save to localStorage
      try {
        localStorage.setItem("explow_profile", JSON.stringify(profile));
        localStorage.setItem("explow_future_self", JSON.stringify(updatedFutureSelf));
      } catch (e) {
        console.warn("Could not save all data to local storage (likely due to file size).", e);
      }
      setHasSavedProfile(true);

      // 2. Generate Image
      setGenerationStage("Visualizing future manifestation...");
      setIsGeneratingImage(true);
      try {
        const imageParts: any[] = [
          { text: `A high-fidelity, photorealistic digital avatar representing this future self: ${data.visualDescription}. Focus on advanced realistic facial features, natural skin texture, detailed eyes, and cinematic lighting. The style should be ${profile.style} that captures the essence of the person with extreme detail. Cinematic atmosphere, futuristic background, highly detailed.` }
        ];

        if (currentSelfie) {
          const mimeType = currentSelfie.split(";")[0].split(":")[1] || "image/jpeg";
          imageParts.push({
            inlineData: {
              data: currentSelfie.split(",")[1],
              mimeType: mimeType
            }
          });
        }

        const imageResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: { parts: imageParts },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            },
          },
        });

        let imageFound = false;
        for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            setFutureSelf((prev) => {
              const updated = prev ? { ...prev, imageUrl } : null;
              if (updated) {
                try {
                  localStorage.setItem("explow_future_self", JSON.stringify(updated));
                } catch (e) {
                  console.warn("Could not save future self with image to local storage.", e);
                }
              }
              return updated;
            });
            imageFound = true;
            break;
          }
        }

        if (!imageFound) {
          throw new Error("No image data found in response");
        }

        // 3. Generate Images for other timeline stages
        for (let i = 0; i < data.timelineStages.length; i++) {
          const stage = data.timelineStages[i];
          const stageImageParts: any[] = [
            { text: `A high-fidelity, photorealistic digital avatar representing this future self at +${stage.years} years: ${stage.visualDescription}. Focus on advanced realistic facial features, age-appropriate skin texture, detailed eyes, and cinematic lighting. The style should be ${profile.style} that captures the essence of the person with extreme detail. Cinematic atmosphere, futuristic background, highly detailed.` }
          ];
          if (currentSelfie) {
            const mimeType = currentSelfie.split(";")[0].split(":")[1] || "image/jpeg";
            stageImageParts.push({
              inlineData: {
                data: currentSelfie.split(",")[1],
                mimeType: mimeType
              }
            });
          }

          const stageImageResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: { parts: stageImageParts },
            config: {
              imageConfig: {
                aspectRatio: "1:1",
              },
            },
          });

          for (const part of stageImageResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              const stageImageUrl = `data:image/png;base64,${part.inlineData.data}`;
              setFutureSelf((prev) => {
                if (!prev || !prev.timelineStages) return prev;
                const updatedStages = [...prev.timelineStages];
                updatedStages[i] = { ...updatedStages[i], imageUrl: stageImageUrl };
                const updated = { ...prev, timelineStages: updatedStages };
                return updated;
              });
              break;
            }
          }
        }
      } catch (imageError) {
        console.error("Image generation failed:", imageError);
      } finally {
        setIsGeneratingImage(false);
      }

    } catch (error) {
      console.error("Future self generation failed:", error);
      setCallError("Temporal synthesis failed. Please try again.");
      setStep("entry");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className="atmosphere" />
      <TemporalGrid />
      <TemporalHUD />

      <AnimatePresence mode="wait">
        {step === "entry" && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl text-center space-y-16 relative z-10"
          >
            <div className="space-y-8">
              {callError && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm mb-8 backdrop-blur-xl"
                >
                  {callError}
                </motion.div>
              )}
              
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                  className="w-48 h-48 bg-white/10 rounded-full mx-auto blur-3xl absolute left-1/2 -translate-x-1/2 -top-12"
                />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <h1 className="text-6xl md:text-8xl font-serif italic tracking-tight leading-[0.9]">
                    Your future self <br /> 
                    <span className="text-white/40">is calling.</span>
                  </h1>
                </motion.div>
              </div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="max-w-sm mx-auto space-y-4 pt-8"
              >
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={profile.name}
                    onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-8 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all text-center text-lg placeholder:text-white/20"
                  />
                  <div className="absolute inset-0 rounded-2xl border border-white/0 group-focus-within:border-white/20 pointer-events-none transition-all" />
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Your Passion (e.g. Art, Tech, Nature)"
                    value={profile.passion}
                    onChange={(e) => setProfile(p => ({ ...p, passion: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-8 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all text-center text-lg placeholder:text-white/20"
                  />
                  <div className="absolute inset-0 rounded-2xl border border-white/0 group-focus-within:border-white/20 pointer-events-none transition-all" />
                </div>
              </motion.div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white/30 font-mono uppercase tracking-[0.6em] text-[9px] pt-4"
              >
                Temporal Link Status: <span className="text-white/60">Ready</span>
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-8"
            >
              <button
                onClick={async () => {
                  if (hasApiKey === false) {
                    await openKeySelection();
                  } else {
                    setStep("choose-future");
                  }
                }}
                className="px-16 py-8 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all text-2xl font-medium group relative overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              >
                <span className="relative z-10 flex items-center">
                  {hasApiKey === false ? "Initialize Link" : "Accept Call"} 
                  <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </span>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                />
              </button>

              <div className="flex flex-col items-center gap-4">
                {hasApiKey === false && (
                  <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest max-w-xs leading-relaxed">
                    A paid Gemini API key is required to synthesize temporal video data.
                  </p>
                )}

                {hasSavedProfile && (
                  <button
                    onClick={() => setStep("takeaway")}
                    className="text-white/40 hover:text-white transition-colors font-mono uppercase tracking-widest text-[10px] border-b border-white/10 pb-1"
                  >
                    View Previous Reflection
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {step === "choose-future" && (
          <motion.div
            key="choose-future"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full max-w-4xl space-y-16 relative z-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-5xl md:text-7xl font-serif italic tracking-tight text-glow">Select Destination</h2>
              <p className="text-white/40 font-mono uppercase tracking-[0.4em] text-[10px]">Temporal Coordinate Selection</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: "1-year", label: "Me, 1 year from now", desc: "Short-term alignment & immediate path.", icon: <Clock className="w-6 h-6" /> },
                { id: "5-years", label: "Me, 5 years from now", desc: "Mid-term evolution & life changes.", icon: <Zap className="w-6 h-6" /> },
                { id: "goal", label: "Me after achieving my goal", desc: "The ultimate version of your success.", icon: <Target className="w-6 h-6" /> }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setProfile(prev => ({ ...prev, futureChoice: opt.id as any }));
                    setStep("choose-response");
                  }}
                  className={cn(
                    "p-10 rounded-[32px] border transition-all text-left space-y-6 group relative overflow-hidden",
                    profile.futureChoice === opt.id 
                      ? "bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.2)]" 
                      : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/[0.08]"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                    profile.futureChoice === opt.id ? "bg-black/10 scale-110" : "bg-white/5 group-hover:scale-110"
                  )}>
                    {opt.icon}
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-xl leading-tight">{opt.label}</p>
                    <p className={cn(
                      "text-sm leading-relaxed",
                      profile.futureChoice === opt.id ? "text-black/60" : "text-white/40"
                    )}>{opt.desc}</p>
                  </div>
                  
                  <div className={cn(
                    "absolute bottom-0 left-0 h-1 bg-current transition-all duration-500",
                    profile.futureChoice === opt.id ? "w-full" : "w-0 group-hover:w-12"
                  )} />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "choose-response" && (
          <motion.div
            key="choose-response"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full max-w-2xl space-y-16 relative z-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-5xl md:text-7xl font-serif italic tracking-tight text-glow">Communication Mode</h2>
              <p className="text-white/40 font-mono uppercase tracking-[0.4em] text-[10px]">Interface Selection</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: "voice", label: "Voice Interface", desc: "Real-time audio link with low latency.", icon: <Mic className="w-6 h-6" /> },
                { id: "text", label: "Text Interface", desc: "Asynchronous neural text transmission.", icon: <MessageSquare className="w-6 h-6" /> }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setProfile(prev => ({ ...prev, responseMode: opt.id as any }));
                    setStep("take-selfie");
                  }}
                  className={cn(
                    "p-10 rounded-[32px] border transition-all text-left space-y-6 group relative overflow-hidden",
                    profile.responseMode === opt.id 
                      ? "bg-white text-black border-white shadow-[0_0_40px_rgba(255,255,255,0.2)]" 
                      : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/[0.08]"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                    profile.responseMode === opt.id ? "bg-black/10 scale-110" : "bg-white/5 group-hover:scale-110"
                  )}>
                    {opt.icon}
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-xl leading-tight">{opt.label}</p>
                    <p className={cn(
                      "text-sm leading-relaxed",
                      profile.responseMode === opt.id ? "text-black/60" : "text-white/40"
                    )}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-center text-white/30 text-[9px] font-mono uppercase tracking-[0.4em]">
              Note: You can toggle modes during active manifestation.
            </p>
          </motion.div>
        )}

        {step === "take-selfie" && (
          <motion.div
            key="take-selfie"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-3xl space-y-12 relative z-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-5xl md:text-6xl font-serif italic tracking-tight text-glow">Biometric Sync</h2>
              <p className="text-white/40 font-mono uppercase tracking-[0.4em] text-[10px]">Temporal Mirror Calibration</p>
            </div>

            <div className="relative aspect-[4/3] max-w-2xl mx-auto rounded-[40px] overflow-hidden bg-white/5 border border-white/10 group shadow-2xl">
              {stream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover mirror"
                  />
                  {/* Scanner HUD Overlay */}
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-72 h-96 border border-white/20 rounded-[120px] flex items-center justify-center relative">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-white text-black text-[8px] font-mono uppercase tracking-widest rounded-full">Align Face</div>
                      <div className="w-full h-px bg-white/10 animate-pulse" />
                      <div className="absolute inset-0 border-t-2 border-white/40 rounded-[120px] h-1/4" />
                    </div>
                  </div>
                  
                  {/* Scanning Line */}
                  <motion.div 
                    animate={{ top: ["0%", "100%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-px bg-white/40 shadow-[0_0_15px_white] z-20"
                  />

                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-30">
                      <motion.span
                        key={countdown}
                        initial={{ scale: 0, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1.5, opacity: 1, rotate: 0 }}
                        className="text-[12rem] font-serif italic text-white text-glow"
                      >
                        {countdown}
                      </motion.span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-8">
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center relative">
                    <Camera className="w-10 h-10 text-white/20" />
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 border border-white/20 rounded-full"
                    />
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-10 py-5 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all text-sm font-bold shadow-xl"
                  >
                    Enable Temporal Mirror
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex flex-col items-center gap-8">
              {stream && (
                <div className="flex items-center gap-6">
                  <button
                    onClick={startCountdown}
                    disabled={countdown !== null}
                    className="px-12 py-6 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all text-lg font-bold shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50"
                  >
                    Capture Identity
                  </button>
                  <button
                    onClick={stopCamera}
                    className="p-6 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-white/60"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                </div>
              )}
              
              <button
                onClick={skipSelfie}
                className="text-white/30 hover:text-white transition-colors font-mono uppercase tracking-[0.4em] text-[9px] border-b border-white/5 pb-1"
              >
                Proceed without Biometrics
              </button>
            </div>
          </motion.div>
        )}

        {step === "transformation" && (
          <motion.div
            key="transformation"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-2xl text-center space-y-16 relative z-10"
          >
            <div className="relative w-80 h-80 mx-auto">
              {/* Outer Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-dashed border-white/5 rounded-full"
              />
              {/* Middle Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-10 border border-dashed border-white/10 rounded-full"
              />
              {/* Inner Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-20 border border-white/20 rounded-full"
              />
              
              {/* Pulsing Core */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.4, 0.8, 0.4],
                    boxShadow: ["0 0 40px rgba(255,255,255,0.1)", "0 0 100px rgba(255,255,255,0.3)", "0 0 40px rgba(255,255,255,0.1)"]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-3xl border border-white/10"
                >
                  <div className="relative">
                    <RefreshCw className="w-12 h-12 text-white animate-spin opacity-40" />
                    <motion.div 
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Zap className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              {/* Orbiting Particles */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5 + i * 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_15px_white]" 
                    style={{ opacity: 0.2 + (i * 0.15) }}
                  />
                </motion.div>
              ))}
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-5xl md:text-6xl font-serif italic tracking-tight text-glow">Synthesizing Identity</h2>
                <p className="text-white/40 font-light italic">Stabilizing temporal bridge for {profile.name}...</p>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-between items-end max-w-xs mx-auto px-1">
                  <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/40">
                    {generationStage || "Manifesting"}
                  </p>
                  <p className="text-[9px] font-mono text-white/60">
                    {Math.round(videoProgressPercent)}%
                  </p>
                </div>
                <div className="h-1.5 w-80 bg-white/5 rounded-full mx-auto overflow-hidden relative border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${videoProgressPercent}%` }}
                    className="absolute inset-y-0 left-0 bg-white shadow-[0_0_15px_white]"
                  />
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                </div>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="max-w-md mx-auto p-6 glass-card"
            >
              <p className="text-white/60 text-sm leading-relaxed font-light">
                "Your future self is being constructed from the threads of your current passion for <span className="text-white font-medium italic">{profile.passion}</span>. Please remain present as the manifestation stabilizes."
              </p>
            </motion.div>
          </motion.div>
        )}

        {step === "incoming-call" && (
          <motion.div
            key="incoming-call"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            className="w-full max-w-md glass-card p-12 text-center space-y-12 relative overflow-hidden"
          >
            {/* Pulsing Background Ring */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-white/5 rounded-full pointer-events-none"
            />
            
            <div className="space-y-8 relative z-10">
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-32 h-32 rounded-full bg-white/10 mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                  <Phone className="w-12 h-12 text-white" />
                </motion.div>
                {/* Ringing Waves */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                    className="absolute inset-0 border border-white/20 rounded-full pointer-events-none"
                  />
                ))}
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl font-serif italic tracking-tight">Incoming Call</h2>
                <p className="text-white/40 font-mono uppercase tracking-[0.4em] text-[10px] font-bold">Future Self Manifestation</p>
              </div>
            </div>

            <div className="flex justify-center gap-12 relative z-10">
              <button
                onClick={() => setStep("entry")}
                className="group relative"
              >
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                  <PhoneOff className="w-8 h-8 text-white" />
                </div>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">Decline</span>
              </button>

              <button
                onClick={startCall}
                className="group relative"
              >
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">Accept</span>
              </button>
            </div>

            <div className="pt-8 border-t border-white/5 relative z-10">
              <p className="text-white/20 text-[10px] font-mono uppercase tracking-widest">Secure Temporal Link Established</p>
            </div>
          </motion.div>
        )}

        {step === "video-call" && (
          <motion.div
            key="video-call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Holographic Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] z-10" />
            <div className="scan-line opacity-20" />
            
            <div className="absolute inset-0 flex flex-col md:flex-row overflow-hidden w-full h-full">
              {/* User Side */}
              <motion.div 
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="relative flex-1 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-white/5 overflow-hidden z-0"
              >
                <UserVideo stream={userStream} isCameraOn={isCameraOn} />
                
                {/* HUD Elements for User */}
                <div className="absolute top-8 left-8 z-20 space-y-4">
                  <StatusBadge label="Identity" value="Past Self" icon={User} />
                  <StatusBadge label="Location" value="Present Day" icon={Clock} />
                </div>
              </motion.div>

              {/* Future Self Side */}
              <motion.div 
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="relative flex-1 h-1/2 md:h-full overflow-hidden bg-black flex items-center justify-center z-0"
              >
                {futureSelf?.videoUrl ? (
                  <FutureVideo 
                    videoUrl={futureSelf.videoUrl} 
                    isSpeaking={isSpeaking} 
                    outputVolume={outputVolume} 
                  />
                ) : futureSelf?.imageUrl ? (
                  <motion.img
                    src={futureSelf.imageUrl}
                    alt="Future Self"
                    className="w-full h-full object-cover"
                    animate={{
                      scale: isSpeaking ? [1, 1.03, 1] : [1, 1.01, 1],
                      filter: isSpeaking ? "brightness(1.1) saturate(1.1)" : "brightness(1) saturate(1)",
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-2 border-white/10 border-t-white animate-spin rounded-full" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-white/40" />
                      </div>
                    </div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/40 animate-pulse">Manifesting Identity...</p>
                  </div>
                )}

                {/* HUD Elements for Future Self */}
                <div className="absolute top-8 right-8 z-20 space-y-4 flex flex-col items-end">
                  <StatusBadge 
                    label="Identity" 
                    value="Future Manifestation" 
                    icon={Zap} 
                    color={isSpeaking ? "text-green-400" : "text-white/60"}
                  />
                  <StatusBadge label="Temporal Offset" value="+15 Years" icon={Clock} />
                </div>

                {isGeneratingVideo && (
                  <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-30 w-full max-w-xs px-8">
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 text-white animate-spin" />
                        <span className="text-[9px] font-mono uppercase tracking-widest text-white/70">Updating Manifestation</span>
                      </div>
                      <span className="text-[9px] font-mono text-white/80">{Math.round(videoProgressPercent)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        className="h-full bg-white shadow-[0_0_10px_white]"
                        initial={{ width: 0 }}
                        animate={{ width: `${videoProgressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {!futureSelf?.videoUrl && !isGeneratingVideo && (
                  <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
                    <button
                      onClick={() => generateFutureVideo()}
                      className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-2xl rounded-full border border-white/10 transition-all group shadow-2xl"
                    >
                      <Video className="w-4 h-4 text-white/60 group-hover:text-white" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 group-hover:text-white">Manifest Video</span>
                    </button>
                  </div>
                )}

                {futureSelf?.videoUrl && !isGeneratingVideo && (
                  <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 flex gap-4">
                    <button
                      onClick={() => generateFutureVideo('sing')}
                      className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-2xl rounded-full border border-white/10 transition-all group shadow-2xl"
                    >
                      <Music className="w-4 h-4 text-white/60 group-hover:text-white" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 group-hover:text-white">Sing</span>
                    </button>
                    <button
                      onClick={() => generateFutureVideo('dance')}
                      className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-2xl rounded-full border border-white/10 transition-all group shadow-2xl"
                    >
                      <Zap className="w-4 h-4 text-white/60 group-hover:text-white" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/60 group-hover:text-white">Dance</span>
                    </button>
                  </div>
                )}

                {/* Subtle Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
              </motion.div>
            </div>

            {/* Central Content: The Orb & Transcription */}
            <div className="relative z-20 flex flex-col items-center justify-center space-y-12 w-full h-full pointer-events-none">
              <div className="text-center space-y-3 pointer-events-auto">
                {callError ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 glass-card max-w-md border-red-500/30"
                  >
                    <p className="text-red-400 font-medium mb-6">{callError}</p>
                    <button 
                      onClick={endCall}
                      className="w-full py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
                    >
                      Close Connection
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center gap-3 mb-4 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                      />
                      <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/80 font-bold">Temporal Stream Active</span>
                    </div>
                    <motion.h2 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl font-serif italic tracking-tight text-white/90"
                    >
                      {profile.name} <span className="text-white/40">Manifestation</span>
                    </motion.h2>
                  </div>
                )}
              </div>

              {!callError && profile.responseMode === "voice" && (
                <div className="pointer-events-auto">
                  <VoiceOrb 
                    isSpeaking={isSpeaking} 
                    isListening={isListening} 
                    isThinking={isChatLoading} 
                    volume={outputVolume}
                  />
                </div>
              )}

              {/* Transcription Area */}
              <div className="absolute bottom-48 left-0 right-0 px-12 flex flex-col items-center pointer-events-none z-20">
                <AnimatePresence mode="wait">
                  {chatMessages.length > 0 && (
                    <motion.div
                      key={chatMessages.length}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="max-w-3xl text-center"
                    >
                      <p className={cn(
                        "text-xl md:text-3xl font-serif italic leading-relaxed drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]",
                        chatMessages[chatMessages.length - 1].role === "model" ? "text-white text-glow" : "text-white/50"
                      )}>
                        {chatMessages[chatMessages.length - 1].text}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Call Controls Bar */}
            <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-8 z-30 px-8">
              <div className="flex items-center gap-6 bg-black/60 backdrop-blur-2xl border border-white/10 p-3 rounded-full shadow-2xl">
                <button
                  onClick={toggleMute}
                  className={cn(
                    "p-4 rounded-full transition-all hover:bg-white/5",
                    isMuted ? "bg-red-500/20 text-red-500" : "text-white/60 hover:text-white"
                  )}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                
                <button
                  onClick={toggleCamera}
                  className={cn(
                    "p-4 rounded-full transition-all hover:bg-white/5",
                    !isCameraOn ? "bg-red-500/20 text-red-500" : "text-white/60 hover:text-white"
                  )}
                >
                  {!isCameraOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>

                <button
                  onClick={endCall}
                  className="p-6 bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                >
                  <PhoneOff className="w-8 h-8" fill="currentColor" />
                </button>
              </div>

              {profile.responseMode === "text" && (
                <div className="flex-1 max-w-lg flex gap-3">
                  <input
                    type="text"
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNextCallStep(userResponse)}
                    placeholder="Message your future self..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-8 py-5 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all text-base backdrop-blur-xl"
                  />
                  <button
                    onClick={() => handleNextCallStep(userResponse)}
                    disabled={!userResponse || isAITyping}
                    className="p-5 bg-white text-black rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === "ended" && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-2xl text-center space-y-16 relative z-10"
          >
            <div className="space-y-8">
              <div className="relative w-32 h-32 mx-auto">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute inset-0 bg-white/20 rounded-full blur-2xl"
                />
                <div className="relative w-full h-full rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                  <PhoneOff className="w-12 h-12 text-white/60" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-6xl md:text-7xl font-serif italic tracking-tight text-glow">Link Severed</h2>
                <p className="text-white/40 font-mono uppercase tracking-[0.4em] text-[10px]">Temporal Connection Terminated</p>
              </div>
              <p className="text-white/60 font-light text-lg max-w-md mx-auto leading-relaxed">
                The temporal link has been successfully closed. Your future manifestation has been archived for reflection.
              </p>
            </div>

            <button
              onClick={() => setStep("takeaway")}
              className="px-16 py-8 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all text-2xl font-bold group shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              View Reflection <ArrowRight className="inline-block ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
          </motion.div>
        )}

        {step === "takeaway" && futureSelf && (
          <motion.div
            key="takeaway"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-16 items-start relative z-10 py-12"
          >
            <div className="space-y-20">
              <div className="space-y-10">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono uppercase tracking-[0.4em] text-white/60 backdrop-blur-xl">
                  <Target className="w-4 h-4 text-white" /> Manifestation Roadmap
                </div>
                <div className="space-y-6">
                  <h1 className="text-8xl md:text-[12rem] font-serif italic leading-[0.7] tracking-tighter text-glow">
                    Future <br /> <span className="text-white/10">Reflection</span>
                  </h1>
                  <p className="text-white/40 font-mono uppercase tracking-[0.6em] text-[10px] pl-2">Temporal Archive ID: #TM-2041-A</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-16">
                <div className="glass-card p-16 space-y-10 border-l-[12px] border-l-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-32 h-32 text-white" />
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40">The Manifested Vision</p>
                  <p className="text-4xl md:text-5xl text-white leading-[1.1] font-serif italic tracking-tight">
                    "{futureSelf.narrative}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="glass-card p-12 space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-px bg-white/40" />
                      <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Action Protocol</p>
                    </div>
                    <div className="space-y-8">
                      {futureSelf.recap?.actionSteps.map((step, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex items-start gap-6 group"
                        >
                          <span className="text-[10px] font-mono text-white/20 mt-2">0{i + 1}</span>
                          <p className="text-xl text-white/80 leading-snug font-light group-hover:text-white transition-colors">{step}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-12 space-y-10 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-px bg-white/40" />
                      <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/60">Core Traits</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-grow">
                      {futureSelf.traits.map((trait) => (
                        <div key={trait} className="p-4 bg-white/5 border border-white/5 rounded-xl text-[10px] uppercase tracking-[0.2em] text-white/40 text-center flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
                          {trait}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-12 pt-12 border-t border-white/5">
                <button
                  onClick={() => setStep("entry")}
                  className="px-16 py-8 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-4 text-2xl font-bold group shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                >
                  New Connection <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
                </button>
                
                <button 
                  onClick={() => setIsShareModalOpen(true)} 
                  className="flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-white/40 hover:text-white transition-colors font-mono"
                >
                  <Download className="w-4 h-4" /> Export Path
                </button>
              </div>
            </div>

            <div className="lg:sticky lg:top-12 space-y-12">
              <div className="relative aspect-[3/4] w-full group shadow-2xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`future-self-projection-${timelineIndex}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 rounded-[40px] overflow-hidden bg-white/5 flex items-center justify-center border border-white/10"
                  >
                    {(futureSelf.timelineStages?.[timelineIndex]?.imageUrl || futureSelf.imageUrl) ? (
                      <img
                        src={futureSelf.timelineStages?.[timelineIndex]?.imageUrl || futureSelf.imageUrl}
                        alt="Future Self"
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-16 border-4 border-white/20 border-t-white animate-spin rounded-full" />
                    )}

                    {/* Hotspots */}
                    {futureSelf.hotspots?.map((hotspot, i) => (
                      <div
                        key={i}
                        className="absolute z-20"
                        style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                      >
                        <button
                          onMouseEnter={() => setActiveHotspot(i)}
                          onMouseLeave={() => setActiveHotspot(null)}
                          className="w-8 h-8 bg-white/20 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center hover:scale-125 hover:bg-white/40 transition-all group/hotspot"
                        >
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          
                          <AnimatePresence>
                            {activeHotspot === i && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-56 p-6 glass-card text-left space-y-3 pointer-events-none z-50"
                              >
                                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">{hotspot.label}</p>
                                <p className="text-xs text-white/80 leading-relaxed font-light">{hotspot.description}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </div>
                    ))}

                    {/* Timeline Slider Overlay */}
                    <div className="absolute bottom-8 left-8 right-8 z-30 glass-card p-8 space-y-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-3xl">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40">Timeline Exploration</p>
                        <p className="text-sm font-serif italic text-white/80">
                          +{futureSelf.timelineStages?.[timelineIndex]?.years} Years
                        </p>
                      </div>
                      <div className="relative h-1.5 w-full bg-white/10 rounded-full">
                        <div className="absolute inset-0 flex justify-between px-1">
                          {futureSelf.timelineStages?.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setTimelineIndex(i)}
                              className={cn(
                                "w-4 h-4 -mt-1.5 rounded-full border-2 transition-all",
                                timelineIndex === i 
                                  ? "bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                                  : "bg-black border-white/20 hover:border-white/40"
                              )}
                            />
                          ))}
                        </div>
                        <motion.div 
                          className="absolute top-0 left-0 h-full bg-white/40 rounded-full pointer-events-none"
                          animate={{ width: `${(timelineIndex / ((futureSelf.timelineStages?.length || 1) - 1)) * 100}%` }}
                        />
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={timelineIndex}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-[11px] text-white/60 leading-relaxed italic line-clamp-2 font-light"
                        >
                          {futureSelf.timelineStages?.[timelineIndex]?.narrative}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShareModalOpen && (
          <ShareModal 
            isOpen={isShareModalOpen} 
            onClose={() => setIsShareModalOpen(false)} 
            futureSelf={futureSelf} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl h-[600px] glass-card flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                    <img src={futureSelf?.imageUrl} alt="Future Self" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-serif italic text-lg">Your Future Self</h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Active Connection</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setAutoTTS(!autoTTS)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-mono uppercase tracking-wider",
                      autoTTS 
                        ? "bg-white/10 border-white/20 text-white" 
                        : "bg-transparent border-white/10 text-white/40"
                    )}
                  >
                    <Volume2 className={cn("w-3 h-3", autoTTS && "text-white")} />
                    Auto-Voice: {autoTTS ? "On" : "Off"}
                  </button>
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <MessageSquare className="w-12 h-12" />
                    <p className="font-serif italic">What would you like to ask your future self?</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.role === "user" ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user" 
                        ? "bg-white text-black rounded-tr-none" 
                        : "bg-white/10 border border-white/10 rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                    {msg.role === "model" && (
                      <button 
                        onClick={() => handleSpeak(msg.text)}
                        className="mt-2 text-white/40 hover:text-white transition-colors"
                      >
                        <Volume2 className={cn("w-4 h-4", isSpeaking && "animate-pulse text-white")} />
                      </button>
                    )}
                  </motion.div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center gap-2 text-white/40">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-mono uppercase tracking-widest">Synthesizing...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-white/10">
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Ask about your journey..."
                      className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-6 pr-14 focus:outline-none focus:border-white/40 transition-colors"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!currentInput.trim() || isChatLoading}
                      className="absolute right-2 top-2 p-3 bg-white text-black rounded-full hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={toggleListening}
                    className={cn(
                      "p-4 rounded-full transition-all",
                      isListening 
                        ? "bg-red-500/20 text-red-500 animate-pulse border border-red-500/50" 
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-8 left-8 flex items-center gap-6 z-40">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 pointer-events-none">
          Explow © 2026 // Future Self Exploration
        </span>
        <div className="flex items-center gap-6 pointer-events-auto">
          <button 
            onClick={() => setIsPhilosophyModalOpen(true)}
            className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 hover:text-white/60 transition-colors"
          >
            Philosophy
          </button>
          <button 
            onClick={clearSavedData}
            className="text-[10px] font-mono uppercase tracking-[0.3em] text-red-500/20 hover:text-red-500/60 transition-colors"
          >
            Reset Identity
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {isPhilosophyModalOpen && (
          <PhilosophyModal 
            isOpen={isPhilosophyModalOpen} 
            onClose={() => setIsPhilosophyModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
