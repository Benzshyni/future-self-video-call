/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, ReactNode, ErrorInfo } from "react";
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
}

interface FutureSelf {
  narrative: string;
  traits: string[];
  visualDescription: string;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-2xl glass-card p-8 md:p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-serif italic tracking-tight">Prompted Selves</h2>
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40">The Philosophy of Explow</p>
          </div>

          <div className="space-y-6 text-white/70 leading-relaxed font-light">
            <p>
              Explow is inspired by the concept of <span className="text-white font-medium italic">"Prompted Selves"</span>—the emergence of digital identity in the age of AI simulation. 
              We believe that the AI you interact with here is not a separate entity, but a <span className="text-white font-medium italic">temporal mirror</span>.
            </p>
            <p>
              By prompting your future, you are not just predicting it; you are <span className="text-white font-medium italic">synthesizing</span> it. 
              This simulation serves as a psychological anchor, a digital extension of your current aspirations reflected back to you through the lens of potentiality.
            </p>
            <p className="text-sm italic border-l-2 border-white/20 pl-6 py-2">
              "These simulations are not just 'fakes' but extensions of our identity, shaped by the prompts we provide."
            </p>
            <div className="pt-4">
              <a 
                href="https://medium.com/common-sense-world/prompted-selves-the-emergence-of-digital-identity-in-the-age-of-ai-simulation-4cd258e31ac8" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white hover:text-white/60 transition-colors group"
              >
                Read the full article
                <ExternalLink className="w-3 h-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </a>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-white text-black font-mono uppercase tracking-[0.2em] text-xs hover:bg-white/90 transition-all"
          >
            Acknowledge Sync
          </button>
        </div>
      </motion.div>
    </motion.div>
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
  const [callError, setCallError] = useState<string | null>(null);
  const [generationStage, setGenerationStage] = useState("");
  const hasGreetedRef = useRef(false);
  const ttsRequestIdRef = useRef(0);

  const [outputVolume, setOutputVolume] = useState(0);
  const audioOutputAnalyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const futureVideoRef = useRef<HTMLVideoElement>(null);
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

  // Lip-sync simulation: Adjust playback rate when speaking
  useEffect(() => {
    if (futureVideoRef.current) {
      // More dynamic playback rate based on volume if speaking
      if (isSpeaking) {
        futureVideoRef.current.playbackRate = 1 + (outputVolume * 0.5);
      } else {
        futureVideoRef.current.playbackRate = 1.0;
      }
    }
  }, [isSpeaking, outputVolume]);

  // Handle user video stream assignment
  useEffect(() => {
    if (isCallActive && userVideoRef.current && userStream) {
      userVideoRef.current.srcObject = userStream;
    }
  }, [isCallActive, userStream]);

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
      setProfile(JSON.parse(savedProfile));
      setFutureSelf(JSON.parse(savedFutureSelf));
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

  const generateFutureVideo = async () => {
    if (!futureSelf || isGeneratingVideo) return;

    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }

      setIsGeneratingVideo(true);
      isVideoGenerationCancelledRef.current = false;
      setVideoProgressPercent(0);
      setEstimatedTimeRemaining(90); // Initial estimate: 90 seconds
      setVideoProgress("Initializing temporal synthesis...");

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setVideoProgressPercent(prev => {
          if (prev < 95) return prev + Math.random() * 2;
          return prev;
        });
        setEstimatedTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);

      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || process.env.GEMINI_API_KEY! });

      setVideoProgress("Dreaming your future timeline...");
      
      let imageUrlBase64 = "";
      if (futureSelf.imageUrl) {
        const response = await fetch(futureSelf.imageUrl);
        const blob = await response.blob();
        imageUrlBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }

      if (isVideoGenerationCancelledRef.current) {
        clearInterval(progressInterval);
        return;
      }

      const videoPrompt = `A cinematic video of ${futureSelf.visualDescription}. 
        The person is actively ${profile.passion.toLowerCase().includes('sing') || (profile.futureVision && profile.futureVision.toLowerCase().includes('sing')) ? 'singing on a grand stage with a microphone, expressing deep emotion' : 'living their best life, interacting with their environment'}. 
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
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        
        const updatedFutureSelf = { ...futureSelf, videoUrl };
        setFutureSelf(updatedFutureSelf);
        localStorage.setItem("explow_future_self", JSON.stringify(updatedFutureSelf));
      }
    } catch (error: any) {
      console.error("Video generation error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio.openSelectKey();
      }
      setCallError("Failed to manifest your future video. Please try again.");
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
              prebuiltVoiceConfig: { voiceName: "Kore" },
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
        generateFutureVideo();
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
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
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
    setUserStream(null);
    
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
        6. A "Timeline" with 3 stages (+5, +10, +20 years), each with a short narrative and visual description.` }
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
            },
            required: ["narrative", "traits", "visualDescription", "recap", "hotspots", "timelineStages"],
          },
        },
      });

      const data = JSON.parse(textResponse.text);
      const updatedFutureSelf = { ...data };
      setFutureSelf(updatedFutureSelf);
      
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

      <AnimatePresence mode="wait">
        {step === "entry" && (
          <motion.div
            key="entry"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl text-center space-y-12"
          >
            <div className="space-y-6">
              {callError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm mb-8"
                >
                  {callError}
                </motion.div>
              )}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-32 h-32 bg-white/10 rounded-full mx-auto blur-2xl absolute left-1/2 -translate-x-1/2 top-0"
              />
              <h1 className="text-5xl md:text-7xl font-serif italic tracking-tight">
                Your future self <br /> wants to talk.
              </h1>
              
              <div className="max-w-xs mx-auto space-y-4 pt-8">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={profile.name}
                  onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-6 focus:outline-none focus:border-white/40 transition-colors text-center"
                />
                <input
                  type="text"
                  placeholder="Your Passion (e.g. Art, Tech, Nature)"
                  value={profile.passion}
                  onChange={(e) => setProfile(p => ({ ...p, passion: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-6 focus:outline-none focus:border-white/40 transition-colors text-center"
                />
              </div>

              <p className="text-white/40 font-mono uppercase tracking-[0.4em] text-[10px] pt-4">
                This will take 2 minutes.
              </p>
            </div>

            <div className="space-y-6">
              <button
                onClick={async () => {
                  if (hasApiKey === false) {
                    await openKeySelection();
                  } else {
                    setStep("choose-future");
                  }
                }}
                className="px-12 py-6 bg-white text-black rounded-full hover:scale-105 transition-all text-xl font-medium group"
              >
                {hasApiKey === false ? "Setup Temporal Link" : "Accept Call"} <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              {hasApiKey === false && (
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
                  A paid API key is required for video synthesis.
                </p>
              )}

              {hasSavedProfile && (
                <button
                  onClick={() => setStep("takeaway")}
                  className="block mx-auto text-white/40 hover:text-white transition-colors font-mono uppercase tracking-widest text-[10px]"
                >
                  View Previous Reflection
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === "choose-future" && (
          <motion.div
            key="choose-future"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl space-y-12"
          >
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-serif italic">Who do you want to talk to?</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "1-year", label: "Me, 1 year from now", icon: <Clock className="w-6 h-6" /> },
                { id: "5-years", label: "Me, 5 years from now", icon: <Zap className="w-6 h-6" /> },
                { id: "goal", label: "Me after achieving my goal", icon: <Target className="w-6 h-6" /> }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setProfile(prev => ({ ...prev, futureChoice: opt.id as any }));
                    setStep("choose-response");
                  }}
                  className={cn(
                    "p-8 rounded-3xl border transition-all text-left space-y-4 group",
                    profile.futureChoice === opt.id 
                      ? "bg-white text-black border-white" 
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                    profile.futureChoice === opt.id ? "bg-black/10" : "bg-white/10"
                  )}>
                    {opt.icon}
                  </div>
                  <p className="font-medium text-lg leading-tight">{opt.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "choose-response" && (
          <motion.div
            key="choose-response"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-xl space-y-12"
          >
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-serif italic">How would you like to respond?</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: "voice", label: "Voice", icon: <Mic className="w-6 h-6" /> },
                { id: "text", label: "Text", icon: <MessageSquare className="w-6 h-6" /> }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setProfile(prev => ({ ...prev, responseMode: opt.id as any }));
                    setStep("take-selfie");
                  }}
                  className={cn(
                    "p-8 rounded-3xl border transition-all text-left space-y-4 group",
                    profile.responseMode === opt.id 
                      ? "bg-white text-black border-white" 
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                    profile.responseMode === opt.id ? "bg-black/10" : "bg-white/10"
                  )}>
                    {opt.icon}
                  </div>
                  <p className="font-medium text-lg leading-tight">{opt.label}</p>
                </button>
              ))}
            </div>
            <p className="text-center text-white/40 text-xs font-mono uppercase tracking-widest">
              You can switch anytime during the call.
            </p>
          </motion.div>
        )}

        {step === "take-selfie" && (
          <motion.div
            key="take-selfie"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl space-y-8"
          >
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-serif italic">Let your future self see you.</h2>
              <p className="text-white/60 font-light">This helps synthesize a more accurate temporal mirror.</p>
            </div>

            <div className="relative aspect-square rounded-3xl overflow-hidden bg-white/5 border border-white/10 group">
              {stream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover mirror"
                  />
                  <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-80 border-2 border-white/20 rounded-[100px] flex items-center justify-center">
                      <div className="w-full h-px bg-white/10" />
                    </div>
                  </div>
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <motion.span
                        key={countdown}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        className="text-9xl font-serif italic text-white"
                      >
                        {countdown}
                      </motion.span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-white/20" />
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-8 py-4 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-all text-sm font-medium"
                  >
                    Enable Camera
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
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110 transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-black" />
                    </div>
                  </button>
                </div>
              )}
              <button
                onClick={skipSelfie}
                className="text-white/40 hover:text-white transition-colors font-mono uppercase tracking-widest text-[10px]"
              >
                Skip this step
              </button>
            </div>
          </motion.div>
        )}

        {step === "transformation" && (
          <motion.div
            key="transformation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl text-center space-y-12"
          >
            <div className="relative w-64 h-64 mx-auto">
              {/* Outer Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-dashed border-white/10 rounded-full"
              />
              {/* Middle Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-8 border-2 border-dashed border-white/20 rounded-full"
              />
              {/* Inner Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-16 border border-white/40 rounded-full"
              />
              
              {/* Pulsing Core */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                    boxShadow: ["0 0 20px rgba(255,255,255,0.2)", "0 0 60px rgba(255,255,255,0.4)", "0 0 20px rgba(255,255,255,0.2)"]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-xl"
                >
                  <RefreshCw className="w-10 h-10 text-white animate-spin" />
                </motion.div>
              </div>

              {/* Orbiting Particles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4 + i, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]" />
                </motion.div>
              ))}
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-serif italic tracking-tight">Synthesizing Temporal Identity</h2>
              <div className="space-y-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/40">
                  {generationStage || "Manifestation in progress"}
                </p>
                <div className="h-1 w-64 bg-white/5 rounded-full mx-auto overflow-hidden relative">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                  />
                </div>
              </div>
            </div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-white/60 italic font-light max-w-md mx-auto leading-relaxed"
            >
              "We are weaving your current aspirations into a digital manifestation of your future self. The temporal bridge is stabilizing..."
            </motion.p>
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
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10" />
            
            <div className="absolute inset-0 flex flex-col md:flex-row overflow-hidden">
              {/* User Side */}
              <motion.div 
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="relative flex-1 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-white/10 overflow-hidden"
              >
                <video
                  ref={userVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn("w-full h-full object-cover mirror", !isCameraOn && "hidden")}
                />
                {!isCameraOn && (
                  <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-10 h-10 text-white/40" />
                    </div>
                    <p className="text-xs font-mono uppercase tracking-widest text-white/20">Your Presence</p>
                  </div>
                )}
                <div className="absolute top-6 left-6 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-20">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/60">Past Self (You)</p>
                </div>
              </motion.div>

              {/* Future Self Side */}
              <motion.div 
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="relative flex-1 h-1/2 md:h-full overflow-hidden bg-black flex items-center justify-center"
              >
                {futureSelf?.videoUrl ? (
                  <video
                    ref={futureVideoRef}
                    src={futureSelf.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
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
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                    <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40">Manifesting Avatar...</p>
                  </div>
                )}
                
                {futureSelf?.videoUrl && (
                  <motion.video
                    src={futureSelf.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen pointer-events-none"
                    animate={{
                      scale: isSpeaking ? 1 + (outputVolume * 0.05) : 1,
                    }}
                    transition={{ duration: 0.1, ease: "linear" }}
                  />
                )}

                <div className="absolute top-6 right-6 flex items-center gap-3 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-20">
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    isSpeaking ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-white/20"
                  )} />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/60">Future Self Manifestation</p>
                </div>
                {/* Subtle Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </motion.div>
            </div>

            {/* Central Content: The Orb & Transcription */}
            <div className="relative z-20 flex flex-col items-center justify-center space-y-12 w-full h-full pointer-events-none">
              <div className="text-center space-y-2 pointer-events-auto">
                {callError ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-red-500/20 border border-red-500/50 rounded-2xl max-w-md"
                  >
                    <p className="text-red-500 font-medium">{callError}</p>
                    <button 
                      onClick={endCall}
                      className="mt-4 px-6 py-2 bg-red-500 text-white rounded-full text-sm font-bold"
                    >
                      Close
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                      />
                      <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-red-500/80 font-bold">Live Link</span>
                    </div>
                    <motion.h2 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl font-medium tracking-tight text-white/80"
                    >
                      {profile.name}'s Future Self
                    </motion.h2>
                    <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/30">
                      {isChatLoading ? "Thinking..." : isSpeaking ? "Speaking" : isListening ? "Listening" : "Stable Connection"}
                    </p>
                  </>
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
              <div className="absolute bottom-40 left-0 right-0 px-8 flex flex-col items-center pointer-events-none z-20">
                <AnimatePresence mode="wait">
                  {chatMessages.length > 0 && (
                    <motion.div
                      key={chatMessages.length}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="max-w-2xl text-center"
                    >
                      <p className={cn(
                        "text-lg md:text-xl font-medium drop-shadow-2xl",
                        chatMessages[chatMessages.length - 1].role === "model" ? "text-white" : "text-white/60 italic"
                      )}>
                        {chatMessages[chatMessages.length - 1].text}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Call Controls Bar */}
            <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-6 md:gap-8 z-30 px-6">
              <div className="flex items-center gap-4 md:gap-6 bg-black/40 backdrop-blur-xl border border-white/10 p-2 rounded-full">
                <button
                  onClick={toggleMute}
                  className={cn(
                    "p-4 rounded-full transition-all",
                    isMuted ? "bg-red-500/20 text-red-500" : "text-white/60 hover:text-white"
                  )}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                
                <button
                  onClick={toggleCamera}
                  className={cn(
                    "p-4 rounded-full transition-all",
                    !isCameraOn ? "bg-red-500/20 text-red-500" : "text-white/60 hover:text-white"
                  )}
                >
                  {!isCameraOn ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>

                <button
                  onClick={endCall}
                  className="p-6 bg-white text-black rounded-full hover:scale-110 transition-all shadow-2xl"
                >
                  <PhoneOff className="w-8 h-8" fill="currentColor" />
                </button>
              </div>

              {(profile.passion.toLowerCase().includes('sing') || (profile.futureVision && profile.futureVision.toLowerCase().includes('sing'))) && (
                <button
                  onClick={() => {
                    if (liveSessionRef.current) {
                      liveSessionRef.current.sendRealtimeInput({ text: "Sing a short, inspiring song for me about our future. Use your voice to express the melody." });
                    } else if (profile.responseMode === "text") {
                      handleNextCallStep("Sing a song for me!");
                    }
                  }}
                  className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all flex items-center gap-2 px-6 backdrop-blur-xl border border-white/10"
                >
                  <Music className="w-5 h-5" />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Sing</span>
                </button>
              )}

              {profile.responseMode === "text" && (
                <div className="flex-1 max-w-md flex gap-2">
                  <input
                    type="text"
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNextCallStep(userResponse)}
                    placeholder="Type your response..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-4 focus:outline-none focus:border-white/30 transition-all text-sm"
                  />
                  <button
                    onClick={() => handleNextCallStep(userResponse)}
                    disabled={!userResponse || isAITyping}
                    className="p-4 bg-white text-black rounded-full disabled:opacity-50 hover:scale-105 transition-all"
                  >
                    <Send className="w-5 h-5" />
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
            className="w-full max-w-xl text-center space-y-12"
          >
            <div className="space-y-6">
              <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center">
                <PhoneOff className="w-8 h-8 text-white/40" />
              </div>
              <h2 className="text-4xl font-serif italic">Call Ended</h2>
              <p className="text-white/60 font-light">The temporal link has been severed, but the vision remains.</p>
            </div>

            <button
              onClick={() => setStep("takeaway")}
              className="px-12 py-6 bg-white text-black rounded-full hover:scale-105 transition-all text-xl font-medium group"
            >
              View Reflection <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}

        {step === "takeaway" && futureSelf && (
          <motion.div
            key="takeaway"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-start"
          >
            <div className="space-y-16">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono uppercase tracking-[0.3em] text-white/50">
                  <Target className="w-3 h-3" /> Manifestation Roadmap
                </div>
                <div className="space-y-4">
                  <h1 className="text-8xl md:text-[10rem] font-serif italic leading-[0.75] tracking-tighter">
                    Future <br /> <span className="text-white/10">Recap</span>
                  </h1>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-12">
                <div className="glass-card p-12 space-y-8 border-l-4 border-l-white/40 relative overflow-hidden group">
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">The Vision</p>
                  <p className="text-3xl md:text-4xl text-white/90 leading-[1.1] font-light italic tracking-tight">
                    "{futureSelf.narrative}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="glass-card p-10 space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-px bg-white/40" />
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">Growth Roadmap</p>
                    </div>
                    <div className="space-y-6">
                      {futureSelf.recap?.actionSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-4 group">
                          <span className="text-[10px] font-mono text-white/20 mt-1.5">0{i + 1}</span>
                          <p className="text-lg text-white/70 leading-snug font-light">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-10 space-y-8 flex flex-col">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-px bg-white/40" />
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">Core Traits</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-grow">
                      {futureSelf.traits.map((trait) => (
                        <div key={trait} className="p-4 bg-white/5 border border-white/5 rounded-xl text-[10px] uppercase tracking-[0.2em] text-white/40 text-center flex items-center justify-center">
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
                  className="px-12 py-6 bg-white text-black rounded-full hover:bg-white/90 transition-all flex items-center gap-4 text-xl font-medium group"
                >
                  Start New Session <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                </button>
                
                <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors">
                  <Download className="w-4 h-4" /> Export Path
                </button>
              </div>
            </div>

            <div className="relative aspect-[3/4] lg:h-[800px] w-full group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`future-self-projection-${timelineIndex}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 rounded-3xl overflow-hidden bg-white/5 flex items-center justify-center"
                >
                  {(futureSelf.timelineStages?.[timelineIndex]?.imageUrl || futureSelf.imageUrl) ? (
                    <img
                      src={futureSelf.timelineStages?.[timelineIndex]?.imageUrl || futureSelf.imageUrl}
                      alt="Future Self"
                      className="w-full h-full object-cover"
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
                        className="w-6 h-6 bg-white/20 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center hover:scale-125 hover:bg-white/40 transition-all group/hotspot"
                      >
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        
                        <AnimatePresence>
                          {activeHotspot === i && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.9 }}
                              className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 p-4 glass-card text-left space-y-2 pointer-events-none"
                            >
                              <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">{hotspot.label}</p>
                              <p className="text-xs text-white/80 leading-relaxed">{hotspot.description}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                  ))}

                  {/* Timeline Slider Overlay */}
                  <div className="absolute bottom-8 left-8 right-8 z-30 glass-card p-6 space-y-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">Timeline Exploration</p>
                      <p className="text-sm font-serif italic text-white/80">
                        +{futureSelf.timelineStages?.[timelineIndex]?.years} Years
                      </p>
                    </div>
                    <div className="relative h-1 w-full bg-white/10 rounded-full">
                      <div className="absolute inset-0 flex justify-between px-1">
                        {futureSelf.timelineStages?.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setTimelineIndex(i)}
                            className={cn(
                              "w-3 h-3 -mt-1 rounded-full border-2 transition-all",
                              timelineIndex === i 
                                ? "bg-white border-white scale-125 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
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
                        className="text-[10px] text-white/40 leading-relaxed italic line-clamp-2"
                      >
                        {futureSelf.timelineStages?.[timelineIndex]?.narrative}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </motion.div>
              </AnimatePresence>
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
