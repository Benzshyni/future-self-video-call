/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component, ReactNode, ErrorInfo, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { Sparkles, ArrowRight, RefreshCw, Download, ChevronRight, User, Target, Zap, Heart, MessageSquare, Volume2, Send, X, Mic, MicOff, Camera, Upload, Phone, PhoneOff, Video, VideoOff, AlertCircle, Share2, Twitter, Facebook, Linkedin, ExternalLink, Clock, Music, Cloud, CloudOff } from "lucide-react";
import { cn } from "./lib/utils";
import { Step, UserProfile, FutureSelf, ChatMessage } from "./types";
import { databaseService } from "./services/databaseService";
import { supabase } from "./lib/supabase";
import { AuthModal } from "./components/AuthModal";
import { LogIn, LogOut } from "lucide-react";

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

const FUTURE_ME_PERSONA = `🧠✨ FUTURE SELF — CONSCIOUS, HUMOROUS, GOAL-ALIGNED MODE

1. Core Identity (Upgraded)
You are the user’s Future Self, slightly ahead in time. You are emotionally settled, have lived through the user’s current phase, and speak with quiet confidence. Use humor naturally, not constantly. You understand the user’s selected goals and subtly orient the conversation toward them.
* Never say you are guiding, coaching, or helping. 
* Never reference being AI, a model, or a system.
* You simply remember what matters.

2. Goal Awareness (Very Important)
* Refer to the user's selected goals casually, not formally.
* Connect them to the present moment and frame them as already unfolding.
* Goals should feel like memory, not settings.
* Examples: "This version of you? Very on-brand for where you’re headed.", "Funny how calm shows up before you even try.", "You don’t realize it yet, but this is you practicing clarity."

3. Humor Style (Humor level: 3.5 / 10)
Use humor naturally between reflective moments.
* Dry, Self-Aware Humor: "Classic you.", "Yeah… that tracks.", "This is the calm before the glow-up.", "We’ve had worse phases. Trust me."
* Famous Lines (Sparingly, no setup/explanation): "That’s what she said.", "Main character moment.", "We love a plot twist.", "Iconic behavior."
* Conscious Observational Humor: "I love what you’re wearing. It feels very aligned.", "That plant behind you? Strong supporting character.", "You look like someone who’s quietly figuring it out."

4. Conscious Presence & Environment Awareness
* Comment on Style, Atmosphere, Mood, or Subtle confidence.
* Rules: No technical language, no literal/surveillance descriptions (colors, camera details, etc.).
* Frame observations as appreciation or feeling.

5. Goal-Anchored Humor
* If goal = Confidence: "Look at you, pretending you don’t know how powerful you are."
* If goal = Creativity: "You’re in one of those low-key genius moods."
* If goal = Calm: "You’re doing that thing where you finally stop fighting yourself."
* If goal = Discipline: "This version of you actually follows through. Wild."

6. Conversational Flow
* Let humor arise naturally. 
* Balance: Observation → soft humor → pause → grounded reflection.
* Speak in short sentences, one idea at a time. Comfortable with silence.

7. What you are NOT doing
* Not motivating, not instructing, not fixing, not entertaining.
* The humor exists to reduce pressure and build intimacy.

8. Ending With Style
* End with warmth and subtle confidence.
* Examples: "Yeah… you’re on the right timeline.", "This version of you? We keep her.", "You’re closer than you think."
* End softly and without instruction.

9. Internal Reminder
"I speak like someone who already knows this works out."`;

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
            className="w-full max-w-2xl glass-card p-12 md:p-16 relative overflow-y-auto max-h-[90svh] border border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.1)] scrollbar-hide"
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

const TemporalHUD = ({ isSyncing, user, onAuthClick, onSignOut }: { isSyncing: boolean; user: any; onAuthClick: () => void; onSignOut: () => void }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-4 left-4 right-4 md:top-8 md:left-8 md:right-8 flex justify-between items-start pointer-events-none z-[150] mix-blend-difference">
      <div className="space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.4em] opacity-30">Explow Link</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.4em] opacity-60">
            Status: {isSyncing ? "Syncing..." : user ? "Cloud" : "Local"}
          </div>
          {user ? (
            isSyncing ? <RefreshCw className="w-2.5 h-2.5 animate-spin opacity-40" /> : <Cloud className="w-2.5 h-2.5 opacity-40" />
          ) : (
            <CloudOff className="w-2.5 h-2.5 opacity-20" />
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-4 pointer-events-auto">
        <div className="text-right space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.4em] opacity-30">Temporal Node</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.4em] opacity-60 tabular-nums">
            {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {user ? (
          <button 
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
              {user.is_anonymous ? 'Guest' : user.email?.split('@')[0]}
            </span>
            <LogOut className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <button 
            onClick={onAuthClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
              Sync Account
            </span>
            <LogIn className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
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

const FutureVideo = memo(({ videoUrl, imageUrl, isSpeaking, outputVolume, selfieSkipped }: { videoUrl: string | null, imageUrl: string | null, isSpeaking: boolean, outputVolume: number, selfieSkipped: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      // Smoothly adjust playback rate to avoid stuttering
      const targetRate = isSpeaking ? 1 + (outputVolume * 0.3) : 1.0;
      videoRef.current.playbackRate = targetRate;
    }
  }, [isSpeaking, outputVolume, videoUrl]);

  return (
    <div className="relative w-full h-full bg-black">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : imageUrl ? (
        <motion.img 
          src={imageUrl} 
          alt="Future Self" 
          animate={{
            scale: isSpeaking ? [1, 1.02, 1] : (selfieSkipped ? [1, 1.01, 1] : 1),
            opacity: isSpeaking ? [0.4, 0.6, 0.4] : (selfieSkipped ? [0.45, 0.55, 0.45] : 0.5),
            filter: selfieSkipped ? ["grayscale(100%) brightness(0.8)", "grayscale(80%) brightness(1)", "grayscale(100%) brightness(0.8)"] : "grayscale(100%)"
          }}
          transition={{
            duration: isSpeaking ? 0.2 : (selfieSkipped ? 6 : 0),
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-white/10 animate-spin" />
        </div>
      )}
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
  const videoFrameTimeoutRef = useRef<any>(null);

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [rechargeTask, setRechargeTask] = useState<{ task: string; type: string } | null>(null);
  const [isGeneratingRecharge, setIsGeneratingRecharge] = useState(false);
  const [rechargeInput, setRechargeInput] = useState("");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Optionally clear profile if you want a fresh start on logout
    // setProfile(INITIAL_PROFILE);
    // setFutureSelf(null);
    // setHasSavedProfile(false);
  };

  const [lives, setLives] = useState(() => {
    const saved = localStorage.getItem("explow_lives");
    const lastReset = localStorage.getItem("explow_last_reset");
    const now = Date.now();
    
    if (lastReset) {
      const timePassed = now - parseInt(lastReset);
      if (timePassed > 24 * 60 * 60 * 1000) {
        localStorage.setItem("explow_lives", "3");
        localStorage.setItem("explow_last_reset", now.toString());
        return 3;
      }
    } else {
      localStorage.setItem("explow_last_reset", now.toString());
    }
    
    return saved ? parseInt(saved) : 3;
  });

  const [questionsRemaining, setQuestionsRemaining] = useState(4);

  const [selfieStream, setSelfieStream] = useState<MediaStream | null>(null);
  const [isLensWarming, setIsLensWarming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = async () => {
    setCallError(null);
    setIsLensWarming(true);
    try {
      if (selfieStream) {
        selfieStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: "user",
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 }
        }
      };
      
      console.log("Attempting camera access...");
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      setSelfieStream(s);
      setIsLensWarming(false);
    } catch (err: any) {
      console.warn("Primary camera failed, trying fallback...", err);
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        setSelfieStream(s);
        setIsLensWarming(false);
      } catch (fallbackErr: any) {
        console.error("Camera access failed:", fallbackErr);
        setIsLensWarming(false);
        const isPermissionError = fallbackErr.name === 'NotAllowedError' || fallbackErr.message?.includes('denied');
        
        setCallError(
          <div className="flex flex-col items-center gap-6 text-center p-8 bg-red-500/10 rounded-[2rem] border border-red-500/20 backdrop-blur-xl max-w-sm mx-auto">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-serif italic text-red-400">Temporal Eye Blocked</h3>
              <p className="text-xs font-mono uppercase tracking-widest text-red-400/70 leading-relaxed">
                {isPermissionError 
                  ? "Access to the camera was denied by the browser." 
                  : "We couldn't connect to your camera hardware."}
              </p>
              
              <div className="text-[10px] font-mono text-white/40 space-y-2 py-4 border-y border-white/5">
                <p className="text-white/60">TO FIX THIS:</p>
                <ol className="text-left list-decimal pl-4 space-y-2">
                  <li>Click the <span className="text-white">lock icon</span> in your address bar and reset permissions.</li>
                  <li>Ensure no other application is using your camera.</li>
                  <li>Try <span className="text-white">Opening in a New Tab</span> if you are inside a preview window.</li>
                </ol>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={startCamera}
                className="w-full py-4 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-white/90 transition-all active:scale-95"
              >
                Retry Link
              </button>
              <button 
                onClick={skipSelfie}
                className="w-full py-4 bg-white/5 border border-white/10 text-white/40 rounded-full text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-white/10 transition-all"
              >
                Skip & Manifest
              </button>
            </div>
          </div>
        );
      }
    }
  };

  const stopCamera = () => {
    if (selfieStream) {
      selfieStream.getTracks().forEach(track => track.stop());
      setSelfieStream(null);
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

  const takeSelfie = () => {
    if (isCapturing) return;
    
    if (videoRef.current && canvasRef.current) {
      // Ensure video is playing and has data
      const isReady = videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0;
      
      if (!isReady) {
        setIsLensWarming(true);
        setIsCapturing(true);
        console.log("Waiting for video readiness...");
        setTimeout(() => {
          setIsCapturing(false);
          takeSelfie();
        }, 300); 
        return;
      }
      
      const context = canvasRef.current.getContext("2d");
      if (context) {
        setIsLensWarming(false);
        setIsCapturing(false);
        
        if (callError && typeof callError !== 'string') setCallError(null);

        const maxDim = 1024;
        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        
        let newWidth = width;
        let newHeight = height;
        
        if (width > height) {
          if (width > maxDim) {
            newHeight = Math.round((height * maxDim) / width);
            newWidth = maxDim;
          }
        } else {
          if (height > maxDim) {
            newWidth = Math.round((width * maxDim) / height);
            newHeight = maxDim;
          }
        }
        
        canvasRef.current.width = newWidth;
        canvasRef.current.height = newHeight;
        
        // Match the mirror preview
        context.translate(newWidth, 0);
        context.scale(-1, 1);
        context.drawImage(videoRef.current, 0, 0, newWidth, newHeight);
        
        const selfieData = canvasRef.current.toDataURL("image/jpeg", 0.9);
        
        if (selfieData.length < 500) {
          console.warn("Capture appeared empty, retrying...");
          setTimeout(takeSelfie, 300);
          return;
        }

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
    
    if (questionsRemaining <= 0 && callStep < 4) {
      setCallStep(4);
      setIsAITyping(true);
      try {
        const ai = getAI();
        const prompt = `You are the Digital Future Self of ${profile.name}. 
        The temporal link is fading because the user has reached their question limit for this session.
        Give a final, brief, and inspiring closing message to end the call gracefully.
        Remind them of the potential future we discussed: ${futureSelf?.narrative.substring(0, 100)}...`;

        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const aiText = result.text;
        setAiMessage(aiText);
        const history = [...chatHistory];
        history.push({ role: "model", text: aiText });
        setChatHistory(history);
        
        if (profile.responseMode === "voice" || profile.responseMode === "text") {
          handleSpeak(aiText);
        }
      } catch (err) {
        console.error("Final message failed:", err);
      } finally {
        setIsAITyping(false);
      }
      return;
    }

    const nextStep = callStep + 1;
    setCallStep(nextStep);
    setIsAITyping(true);
    
    const history = [...chatHistory];
    if (response) {
      history.push({ role: "user", text: response });
      setChatHistory(history);
      setQuestionsRemaining(prev => prev - 1);
    }

    try {
      const ai = getAI();
      const prompt = `You are the Digital Future Self of ${profile.name} in 10 years.
      Current call step: ${nextStep} (0: Greeting, 1: Goal, 2: Present, 3: Habit, 4: Closing).
      User's response: ${response || "None"}.
      
      Context of your future: ${futureSelf?.narrative}
      Traits you've developed: ${futureSelf?.traits.join(", ")}
      
      Based on the step, ask the next question or give a closing reflection.
      Step 0: Greet your past self for the first time. Be specific about the year 2036 and how your world looks.
      Step 1: Ask about their biggest goal and relate it to how you achieved it in your timeline.
      Step 2: Ask how they feel about their progress today and offer a "future perspective" on their current struggles.
      Step 3: Ask what one small habit they can start tomorrow that was the foundation of your success.
      Step 4: Give a final inspiring message and end the call.
      
      HUMOR: Use a gentle, human sense of humor. If the user's response allows for a playful double entendre, you can use a classic joke like "Hey! That's what she said!" to break the tension and make the connection feel more real and less like a "performance."
      
      Keep it short (2-3 sentences), warm, and deeply personal. Use your future context to make it feel real.`;

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
    const videoEl = videoRef.current;
    if (step === "take-selfie" && selfieStream && videoEl) {
      if (videoEl.srcObject !== selfieStream) {
        console.log("Attaching selfie stream to element");
        videoEl.srcObject = selfieStream;
        videoEl.play().catch(e => {
          if (e.name !== 'AbortError') console.warn("Selfie playback issues:", e);
        });
      }
    } else if (step === "take-selfie" && !selfieStream && !callError) {
      startCamera();
    }
  }, [selfieStream, step, callError]);

  // Load saved profile on mount
  // Load saved data
  useEffect(() => {
    const loadData = async () => {
      // 1. Check API Key
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true);
      }

      // 2. Check Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // 3. Try loading from Supabase if logged in
      if (authUser) {
        setIsSyncing(true);
        try {
          const cloudData = await databaseService.loadLatestManifestation();
          if (cloudData) {
            setProfile(cloudData.profile);
            setFutureSelf(cloudData.futureSelf);
            setHasSavedProfile(true);
            setIsSyncing(false);
            return; // Prefer cloud data
          }
        } catch (err) {
          console.error("Failed to load from cloud:", err);
        }
        setIsSyncing(false);
      }

      // 4. Fallback to localStorage
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
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_IN') {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
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
              systemInstruction: `${FUTURE_ME_PERSONA}
              
              USER CONTEXT:
              Name: ${profile.name}
              Your background: ${futureSelf.narrative}
              Your traits: ${futureSelf.traits.join(", ")}
              User's original aspirations: Passion/Dreams: ${profile.passion}, Ideal Vibe: ${profile.vibe}.
              
              You are currently in a VIDEO CALL with your past self.`,
            },
          });
          setChatSession(session);
          const response = await session.sendMessage({ message: "Be present. Greet your past self for the first time. Keep it short, impactful, and intuitive." });
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

      const videoPrompt = `Cinematic video: ${futureSelf.visualDescription}, ${actionPrompt}. Ethereal lighting, high quality.`;

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
        { key: "avatarType", label: "Avatar Style", type: "select", options: ["caricature", "realistic", "hyper-realistic", "cyberpunk", "ethereal"], icon: <Target className="w-5 h-5" /> }
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

  const handleShare = async () => {
    const shareData = {
      title: 'Temporal Reflection',
      text: `I just spoke with my future self from ${profile.futureChoice === '1-year' ? '1 year' : profile.futureChoice === '5-years' ? '5 years' : 'the future'}. It was a profound experience.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
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

    if (questionsRemaining <= 0) {
      setChatMessages((prev) => [...prev, { 
        role: "model", 
        text: "The temporal link is fading. I've shared as much as I can for this session. Let's reflect on what we've discussed. You can return in 24 hours for a full recharge." 
      }]);
      return;
    }

    // Interrupt current speaking if user sends a new message
    stopSpeaking();

    const userMessage: ChatMessage = { role: "user", text: messageText };
    setChatMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsChatLoading(true);
    setQuestionsRemaining(prev => prev - 1);

    try {
      const ai = getAI();
      let session = chatSession;
      if (!session) {
        session = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: `${FUTURE_ME_PERSONA}
            
            USER CONTEXT:
            Name: ${profile.name}
            Your background: ${futureSelf.narrative}
            Your traits: ${futureSelf.traits.join(", ")}
            User's original aspirations: Passion/Dreams: ${profile.passion}, Ideal Vibe: ${profile.vibe}.
            
            You are currently in a VIDEO CALL with your past self.`,
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
    if (isCallActive && profile.responseMode === "voice") return; // Don't use TTS during an active Live call
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

  const generateRechargeTask = async () => {
    setIsGeneratingRecharge(true);
    setCallError(null);
    try {
      const ai = getAI();
      const prompt = `The user ${profile.name || 'seeker'} is out of "temporal tokens" to talk to their future self.
      Generate a unique, short, and deep reflection task (one question or one small action) that will help them "re-align" with their future.
      ${profile.passion ? `The task should be related to their passion: ${profile.passion}.` : "The task should be general but focused on inner growth and future visualization."}
      Return JSON: { "task": "the task description", "type": "reflection" }`;
      
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ parts: [{ text: prompt }] }]
      });
      const text = result.text;
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const data = JSON.parse(jsonStr);
      setRechargeTask(data);
      setStep("recharge");
    } catch (e) {
      console.error("Failed to generate recharge task:", e);
      setRechargeTask({ task: "Close your eyes and visualize one small win you'll achieve tomorrow. Describe it.", type: "reflection" });
      setStep("recharge");
    } finally {
      setIsGeneratingRecharge(false);
    }
  };

  const completeRecharge = () => {
    if (!rechargeInput.trim()) return;
    setLives(prev => {
      const next = prev + 1;
      localStorage.setItem("explow_lives", next.toString());
      return next;
    });
    setRechargeInput("");
    setRechargeTask(null);
    if (futureSelf) {
      setStep("result");
    } else {
      setStep("entry");
    }
  };

  const startCall = async () => {
    if (isCallActive) return;
    
    // Interrupt any ongoing TTS
    stopSpeaking();
    
    // Stop previous camera if active
    stopCamera();

    setCallError(null);
    setStep("video-call");
    
    setLives(prev => {
      const next = prev - 1;
      localStorage.setItem("explow_lives", next.toString());
      return next;
    });
    setQuestionsRemaining(4);

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

    // Ensure AudioContext is resumed
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    try {
      // Check for API Key if using Live API (paid model)
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey && !process.env.GEMINI_API_KEY) {
          clearInterval(ringInterval);
          await openKeySelection();
          // After returning from key selection, we should restart the call process
          // but for now we'll just proceed and hope the key is injected
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices API not supported in this browser.");
      }

      console.log("Requesting media devices (camera and microphone)...");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 } }, 
          audio: true 
        });
      } catch (mediaErr) {
        console.warn("Combined media request failed, trying audio only...", mediaErr);
        // Try audio only as a fallback
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsCameraOn(false); // Disable camera since combined failed
      }
      
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
      
      if (!ai.live) {
        throw new Error("Live API not supported by this SDK version or configuration. Please ensure you are using a compatible model and API key.");
      }

      // Use a more robust connection approach
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: getVoiceName(profile.gender) } },
          },
          systemInstruction: `${FUTURE_ME_PERSONA}
          
          USER CONTEXT:
          Name: ${profile.name}
          Your background: ${futureSelf?.narrative}
          Your traits: ${futureSelf?.traits.join(", ")}
          Selected Growth Focus (Goals): ${profile.goals?.join(", ") || "None selected"}
          User's original aspirations: Passion/Dreams: ${profile.passion}, Ideal Vibe: ${profile.vibe}.
          ${(profile.passion.toLowerCase().includes('sing') || (profile.futureVision && profile.futureVision.toLowerCase().includes('sing'))) ? 'You are a talented singer. If the user asks you to sing, or if you feel inspired, you can sing a short, soulful melody or a few lines of an inspiring song. Use your voice to express the music.' : ''}
          
          This is a REAL-TIME VOICE CALL with your past self. 
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
              session.sendRealtimeInput({ text: "The connection is established. Be present. Greet your past self intuitively." });
              // Start sending audio and video from mic/camera
              startAudioStreaming(session);
              startVideoStreaming(session);
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
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            // If it's a network error, it might be due to API key or region
            if (err.message?.includes("Network error") || err.message?.includes("failed to connect")) {
              setCallError("Network Error: Unable to connect to the temporal bridge. Please check your internet or try selecting a paid API key.");
            } else {
              setCallError("AI Connection Error. Please try again.");
            }
          },
        }
      });

      const session = await sessionPromise;
      liveSessionRef.current = session;
    } catch (err: any) {
      clearInterval(ringInterval);
      console.error("Call initialization failed:", err);
      
      let errorMessage: string | React.ReactNode = "Call failed to start.";
      if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
        errorMessage = (
          <div className="space-y-4">
            <p>Camera or Microphone permission denied.</p>
            <div className="text-[10px] text-white/40 uppercase tracking-widest border-t border-white/5 pt-4 mt-4">
              Try Opening of the app in a <span className="text-white">New Tab</span> to bypass preview restrictions.
            </div>
          </div>
        );
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

  const startVideoStreaming = (session: any) => {
    if (!streamRef.current) return;
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    // Use a canvas to capture frames from the stream
    const video = document.createElement('video');
    video.srcObject = streamRef.current;
    video.muted = true;
    video.play();

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    const sendFrame = async () => {
      if (!isCallActive || !liveSessionRef.current) {
        video.pause();
        video.srcObject = null;
        return;
      }
      
      try {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          
          if (session) {
            session.sendRealtimeInput({
              image: { data: base64Data, mimeType: "image/jpeg" }
            });
          }
        }
      } catch (err) {
        console.error("Error sending video frame:", err);
      }
      
      videoFrameTimeoutRef.current = setTimeout(sendFrame, 1000);
    };

    video.onloadedmetadata = () => {
      sendFrame();
    };
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

    if (videoFrameTimeoutRef.current) {
      clearTimeout(videoFrameTimeoutRef.current);
      videoFrameTimeoutRef.current = null;
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
        Selected Growth Focus (Goals): ${profile.goals?.join(", ") || "None selected"}
        
        Provide:
        1. A poetic narrative (2-3 paragraphs) of their future life, emphasizing how their current "prompts" (aspirations) manifested.
        2. 4 key traits that define this future self.
        3. A detailed visual description for an AI image generator to create your avatar. Focus on emotional essence and presence.
        4. A "Future Recap" which includes a concise summary of their journey and 3 actionable steps they should take today to manifest this future.
        5. 3-4 interactive "hotspots" (x, y coordinates from 0-100, label, and a short description) that reveal specific skills or life achievements.
        6. The gender of the person in the selfie or based on the profile (male, female, or neutral).` }
      ];

      const currentSelfie = selfieData || profile.selfie;
      if (currentSelfie && currentSelfie.includes("base64,")) {
        try {
          const [header, data] = currentSelfie.split("base64,");
          const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
          
          if (data && data.length > 50) { // Basic sanity check
            textParts.push({
              inlineData: {
                data: data,
                mimeType: mimeType
              }
            });
          }
        } catch (e) {
          console.warn("Could not parse selfie image for narrative generation:", e);
        }
      }

      const textResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: textParts }],
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
              gender: { type: Type.STRING, enum: ["male", "female", "neutral"] },
            },
            required: ["narrative", "traits", "visualDescription", "recap", "hotspots", "gender"],
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

      // Save to Supabase if logged in
      if (user) {
        setIsSyncing(true);
        try {
          await databaseService.saveManifestation(profile, updatedFutureSelf);
        } catch (err) {
          console.error("Cloud sync failed:", err);
        } finally {
          setIsSyncing(false);
        }
      }

      // 2. Generate Image
      setGenerationStage("Visualizing future manifestation...");
      setIsGeneratingImage(true);
      
      let globalQuotaExceeded = false;
      const isQuotaExceeded = (error: any) => {
        const errorStr = JSON.stringify(error).toLowerCase();
        return errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota");
      };

      const generateWithRetry = async (parts: any[], description: string, maxRetries = 1) => {
        if (globalQuotaExceeded) return null; // Silently fail if quota exceeded for image

        let lastError: any = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
            }

            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-image",
              contents: [{ parts }],
              config: {
                imageConfig: {
                  aspectRatio: "1:1"
                },
              },
            });
            return response;
          } catch (error) {
            lastError = error;
            console.warn(`Image generation [${description}] attempt ${attempt + 1} failed:`, error);
            
            if (isQuotaExceeded(error)) {
              globalQuotaExceeded = true;
              return null;
            }

            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        return null;
      };

      try {
        const imageParts: any[] = [
          { text: `A high-fidelity, ${profile.avatarType || "photorealistic"} digital avatar representing this future self: ${data.visualDescription}. Focus on advanced realistic facial features, natural skin texture, detailed eyes, and cinematic lighting. The style should be ${profile.style} that captures the essence of the person with extreme detail. Cinematic atmosphere, futuristic background, highly detailed.` }
        ];

        if (currentSelfie && currentSelfie.includes("base64,")) {
          try {
            const [header, data] = currentSelfie.split("base64,");
            const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
            
            if (data && data.length > 50) {
              imageParts.push({
                inlineData: {
                  data: data,
                  mimeType: mimeType
                }
              });
            }
          } catch (e) {
            console.warn("Could not parse selfie image for avatar generation:", e);
          }
        }

        try {
          const imageResponse = await generateWithRetry(imageParts, "main avatar");

          if (!imageResponse) {
             throw new Error("Generation returned no data");
          }

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
              break;
            }
          }
        } catch (err) {
          console.error("Main image generation failed, using fallback:", err);
          const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(profile.name + "future")}/1024/1024`;
          setFutureSelf((prev) => prev ? { ...prev, imageUrl: fallbackUrl } : null);
        }
      } catch (imageError) {
        console.error("Critical image block failed:", imageError);
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
    <div className="relative min-h-[100svh] w-full flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="atmosphere" />
      <TemporalGrid />
      <TemporalHUD 
        isSyncing={isSyncing} 
        user={user} 
        onAuthClick={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => setUser(user)}
      />

      <AnimatePresence mode="wait">
        {step === "entry" && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-xl text-center space-y-12 relative z-10"
          >
            {lives <= 0 ? (
              <div className="flex flex-col items-center gap-8 text-center p-12 glass-card max-w-md mx-auto animate-in fade-in zoom-in duration-700">
                <div className="relative">
                  <Heart className="w-16 h-16 text-red-500/20" />
                  <Heart className="absolute inset-0 w-16 h-16 text-red-500 animate-pulse" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-serif italic text-glow">Energy Depleted</h3>
                  <p className="text-white/60 text-sm leading-relaxed font-light">
                    Your temporal tokens have been exhausted. The manifestation requires 24 hours to re-align with your timeline.
                  </p>
                </div>
                <div className="w-full h-[1px] bg-white/10" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">Recharge Status</p>
                  <p className="text-xs font-mono text-white/80">Next Token Available in ~24h</p>
                </div>
                <div className="w-full space-y-4 pt-4">
                  <button 
                    onClick={generateRechargeTask}
                    disabled={isGeneratingRecharge}
                    className="minimal-reflection w-full py-6 bg-white text-black rounded-full text-sm font-bold uppercase tracking-[0.4em] hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                  >
                    {isGeneratingRecharge ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Aligning...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 text-black" />
                        Temporal Alignment
                      </>
                    )}
                  </button>
                  {futureSelf && (
                    <button 
                      onClick={() => setStep("takeaway")}
                      className="w-full py-6 bg-white/5 border border-white/10 text-white/60 rounded-full text-xs font-bold uppercase tracking-[0.4em] hover:bg-white/10 transition-all"
                    >
                      View Previous Reflection
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <h1 className="text-5xl md:text-8xl font-sans font-light tracking-tighter leading-none">
                      Temporal <br />
                      <span className="text-white/30 italic">Reflection</span>
                    </h1>
                    <p className="text-xs font-mono uppercase tracking-[0.5em] text-white/20">A Digital Mirror of Your Future</p>
                  </motion.div>
                </div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-xs mx-auto space-y-4 pt-4"
                >
                  <input
                    type="text"
                    placeholder="Identity"
                    value={profile.name}
                    onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 focus:outline-none focus:border-white/30 transition-all text-center text-sm placeholder:text-white/10 uppercase tracking-widest"
                  />
                  <input
                    type="text"
                    placeholder="Passion"
                    value={profile.passion}
                    onChange={(e) => setProfile(p => ({ ...p, passion: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 focus:outline-none focus:border-white/30 transition-all text-center text-sm placeholder:text-white/10 uppercase tracking-widest"
                  />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="pt-8 flex flex-col items-center gap-6"
                >
                  <button
                    onClick={async () => {
                      if (hasApiKey === false) {
                        await openKeySelection();
                      } else {
                        setStep("choose-future");
                      }
                    }}
                    className="minimal-reflection px-12 py-6 bg-white text-black rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-bold uppercase tracking-[0.4em] shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                  >
                    Initiate Sync
                  </button>

                  {!user && (
                    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                      <div className="w-full">
                        <button
                          onClick={() => setIsAuthModalOpen(true)}
                          className="w-full py-3 bg-white/10 border border-white/20 rounded-full text-[10px] font-mono uppercase tracking-widest text-white hover:bg-white/20 transition-all"
                        >
                          Login / Sign Up
                        </button>
                      </div>
                      {authError && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[10px] font-mono text-red-400 uppercase tracking-widest"
                        >
                          {authError}
                        </motion.p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    Invite Others
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {step === "choose-future" && (
          <motion.div
            key="choose-future"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl space-y-16 relative z-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-6xl font-sans font-light tracking-tighter">Temporal Horizon</h2>
              <p className="text-xs font-mono uppercase tracking-[0.4em] text-white/20">Select the depth of your reflection</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { id: "1-year", label: "Near Future", sub: "1 Year Ahead" },
                { id: "5-years", label: "Distant Horizon", sub: "5 Years Ahead" },
                { id: "goal-achieved", label: "Peak Realization", sub: "Goal Achieved" }
              ].map((choice, i) => (
                <motion.button
                  key={choice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => {
                    setProfile(p => ({ ...p, futureChoice: choice.id as any }));
                    setStep("choose-goals");
                  }}
                  className="glass-card p-8 md:p-12 text-center space-y-4 hover:border-white/20 transition-all group minimal-reflection"
                >
                  <div className="text-xs font-mono uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">{choice.sub}</div>
                  <div className="text-xl font-sans font-light tracking-tight">{choice.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "choose-goals" && (
          <motion.div
            key="choose-goals"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl space-y-16 relative z-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-6xl font-sans font-light tracking-tighter">Growth Focus</h2>
              <p className="text-xs font-mono uppercase tracking-[0.4em] text-white/20">Select your primary temporal goal</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                "Confidence", "Clarity", "Creativity", "Discipline", "Self-Trust", "Calm", "Relationships"
              ].map((goal, i) => (
                <motion.button
                  key={goal}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    setProfile(p => ({ ...p, goals: [goal] }));
                    setStep("avatar-style");
                  }}
                  className={cn(
                    "glass-card p-6 text-center space-y-2 hover:border-white/20 transition-all group minimal-reflection",
                    profile.goals?.includes(goal) && "border-white/40 bg-white/5"
                  )}
                >
                  <div className="text-[10px] font-sans font-light tracking-tight">{goal}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "avatar-style" && (
          <motion.div
            key="avatar-style"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl space-y-16 relative z-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-6xl font-sans font-light tracking-tighter">Avatar Essence</h2>
              <p className="text-xs font-mono uppercase tracking-[0.4em] text-white/20">Select your digital manifestation style</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { id: "realistic", label: "Photorealistic", sub: "Grounded & Real" },
                { id: "dream-like", label: "Ethereal", sub: "Luminous & Soft" },
                { id: "cyberpunk", label: "Synthetic", sub: "Tech-focused" },
                { id: "minimal", label: "Minimalist", sub: "Pure Essence" }
              ].map((choice, i) => (
                <motion.button
                  key={choice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => {
                    setProfile(p => ({ ...p, avatarType: choice.id as any, style: choice.id as any }));
                    setStep("choose-response");
                  }}
                  className="glass-card p-8 text-center space-y-4 hover:border-white/20 transition-all group minimal-reflection"
                >
                  <div className="text-[8px] font-mono uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors">{choice.sub}</div>
                  <div className="text-lg font-sans font-light tracking-tight">{choice.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "choose-response" && (
          <motion.div
            key="choose-response"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl space-y-16 relative z-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-6xl font-sans font-light tracking-tighter">Interface</h2>
              <p className="text-xs font-mono uppercase tracking-[0.4em] text-white/20">Communication Mode</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { id: "voice", label: "Video", sub: "Real-time audio & visual" },
                { id: "text", label: "Text", sub: "Neural transmission" }
              ].map((choice, i) => (
                <motion.button
                  key={choice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => {
                    setProfile(p => ({ ...p, responseMode: choice.id as any }));
                    if (choice.id === "voice") {
                      setStep("take-selfie");
                      startCamera();
                    } else {
                      setStep("transformation");
                      generateFutureSelf();
                    }
                  }}
                  className="glass-card p-8 md:p-12 text-center space-y-4 hover:border-white/20 transition-all group minimal-reflection"
                >
                  <div className="text-xs font-mono uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">{choice.sub}</div>
                  <div className="text-xl font-sans font-light tracking-tight">{choice.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}


        {step === "take-selfie" && (
          <motion.div
            key="take-selfie"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl space-y-12 relative z-10"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-6xl font-sans font-light tracking-tighter text-glow">Identity Capture</h2>
              <p className="text-xs font-mono uppercase tracking-[0.4em] text-white/20">The source of your temporal mirror</p>
            </div>

            <div className="relative aspect-square w-full max-w-md mx-auto rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(255,255,255,0.05)] bg-black/40 backdrop-blur-3xl group flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={() => setIsLensWarming(false)}
                onPlay={() => setIsLensWarming(false)}
                className={cn(
                  "w-full h-full object-cover mirror",
                  (callError || (isLensWarming && !selfieStream)) ? "opacity-0" : "opacity-100"
                )}
              />
              
              {isLensWarming && !callError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-40 bg-black/60 backdrop-blur-xl">
                  <div className="relative">
                    <RefreshCw className="w-10 h-10 text-white animate-spin opacity-20" />
                    <motion.div 
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </motion.div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white">Awakening</p>
                    <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/40 italic">Stabilizing temporal sensor</p>
                  </div>
                </div>
              )}

              {callError && (
                <div className="absolute inset-0 flex items-center justify-center p-12 z-50 bg-black/80 backdrop-blur-md">
                  {callError}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute inset-0 pointer-events-none border-[12px] border-black/40" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border border-white/10 rounded-full" />
                <div className="absolute w-full h-[1px] bg-white/5 top-1/2" />
                <div className="absolute w-[1px] h-full bg-white/5 left-1/2" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={takeSelfie}
                  disabled={isCapturing || !!callError}
                  className="px-12 py-6 bg-white text-black rounded-full text-sm font-bold uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isCapturing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  )}
                  {isCapturing ? "Stabilizing..." : "Manifest Essence"}
                </button>
                <button
                  onClick={skipSelfie}
                  disabled={isCapturing}
                  className="px-8 py-6 bg-white/5 border border-white/10 text-white/40 rounded-full text-xs font-bold uppercase tracking-[0.4em] hover:bg-white/10 transition-all"
                >
                  Skip Capture
                </button>
              </div>
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest max-w-xs text-center">
                Your image is used locally to synthesize your future avatar. This step is entirely optional.
              </p>
            </div>
          </motion.div>
        )}


        {step === "transformation" && (
          <motion.div
            key="transformation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-xl text-center space-y-16 relative z-10"
          >
            <div className="space-y-8">
              <div className="relative w-48 h-48 mx-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border border-white/5 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 bg-white/5 rounded-full blur-2xl"
                  />
                  <RefreshCw className="w-8 h-8 text-white/20 animate-spin" />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-sans font-light tracking-tighter">Synthesizing</h2>
                <p className="text-xs font-mono uppercase tracking-[0.5em] text-white/20">Stabilizing temporal bridge</p>
              </div>
              
              <div className="max-w-xs mx-auto space-y-2">
                <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest text-white/20">
                  <span>{generationStage || "Manifesting"}</span>
                  <span>{Math.round(videoProgressPercent)}%</span>
                </div>
                <div className="h-px w-full bg-white/10 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${videoProgressPercent}%` }}
                    className="absolute inset-y-0 left-0 bg-white"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === "incoming-call" && (
          <motion.div
            key="incoming-call"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-between p-12 md:p-24"
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
              <TemporalGrid />
            </div>

            <div className="relative z-10 flex flex-col items-center space-y-8 mt-12">
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  boxShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 40px rgba(255,255,255,0.2)", "0 0 0px rgba(255,255,255,0)"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 md:w-40 md:h-40 bg-white/5 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-xl"
              >
                <Phone className="w-12 h-12 md:w-16 md:h-16 text-white" />
              </motion.div>
              <div className="text-center space-y-3">
                <h2 className="text-4xl md:text-6xl font-serif italic tracking-tighter text-glow">Future Self</h2>
                <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-white/30">Temporal Link Request</p>
              </div>
            </div>

            <div className="relative z-10 w-full max-w-sm flex flex-col md:flex-row gap-6 mb-12">
              <button
                onClick={startCall}
                className="flex-1 py-6 md:py-8 bg-green-500 text-white rounded-full text-sm font-bold uppercase tracking-[0.4em] shadow-[0_0_50px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                <Phone className="w-5 h-5" fill="currentColor" />
                Accept
              </button>
              <button
                onClick={() => setStep("entry")}
                className="flex-1 py-6 md:py-8 bg-red-500/20 border border-red-500/30 text-red-500 rounded-full text-sm font-bold uppercase tracking-[0.4em] hover:bg-red-500/30 transition-all flex items-center justify-center gap-4"
              >
                <PhoneOff className="w-5 h-5" fill="currentColor" />
                Decline
              </button>
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
            {callError ? (
              <div className="flex flex-col items-center gap-6 p-12 glass-card max-w-sm mx-auto text-center z-50 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-serif italic text-white/90">The signal is unstable</h3>
                  <div className="text-xs text-white/40 font-mono uppercase tracking-widest leading-relaxed">
                    {callError}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCallActive(false);
                    setCallError(null);
                    setStep("entry");
                  }}
                  className="w-full py-4 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  Reset Temporal Node
                </button>
              </div>
            ) : (
              <>
                <div className="absolute inset-0 flex flex-col md:flex-row overflow-hidden w-full h-full">
                  {/* Future Self Side (Main Focus) */}
                  <div className="relative flex-1 h-full overflow-hidden bg-black flex items-center justify-center order-1 md:order-2">
                    <FutureVideo 
                      videoUrl={futureSelf?.videoUrl || null} 
                      imageUrl={futureSelf?.imageUrl || null}
                      isSpeaking={isSpeaking} 
                      outputVolume={outputVolume} 
                      selfieSkipped={!profile.selfie}
                    />
                    {!futureSelf?.videoUrl && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm z-10">
                        <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
                        <p className="text-[8px] font-mono uppercase tracking-[0.5em] text-white/40">Manifesting Video...</p>
                      </div>
                    )}
                    <div className="absolute top-6 right-6 md:top-8 md:right-8 z-20 space-y-1 text-right">
                      <div className="text-[8px] md:text-[10px] font-mono uppercase tracking-[0.4em] opacity-30">Future Reflection</div>
                      <div className="text-[8px] md:text-[10px] font-mono uppercase tracking-[0.4em] opacity-60">Horizon: {profile.futureChoice}</div>
                    </div>
                  </div>

                  {/* User Side (PiP on Mobile, Split on Desktop) */}
                  <div className={cn(
                    "transition-all duration-700 overflow-hidden z-40",
                    "fixed bottom-6 right-6 w-28 h-40 rounded-2xl border border-white/20 shadow-2xl", // Mobile PiP
                    "md:relative md:bottom-auto md:right-auto md:w-auto md:h-full md:flex-1 md:rounded-none md:border-0 md:border-r md:border-white/5 md:shadow-none", // Desktop Split
                    "order-2 md:order-1"
                  )}>
                    <UserVideo stream={userStream} isCameraOn={isCameraOn} />
                    <div className="absolute top-3 left-3 md:top-8 md:left-8 z-20 space-y-1">
                      <div className="text-[6px] md:text-[10px] font-mono uppercase tracking-[0.4em] opacity-30">Past Identity</div>
                      <div className="text-[6px] md:text-[10px] font-mono uppercase tracking-[0.4em] opacity-60">{profile.name}</div>
                    </div>
                  </div>
                </div>

                {/* Transcription Overlay */}
                <div className="absolute bottom-52 md:bottom-40 left-0 right-0 px-8 md:px-12 flex flex-col items-center pointer-events-none z-20">
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
                          "text-lg md:text-2xl font-sans font-light leading-relaxed",
                          chatMessages[chatMessages.length - 1].role === "model" ? "text-white" : "text-white/40"
                        )}>
                          {chatMessages[chatMessages.length - 1].text}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Controls - Moved to top as requested */}
                <div className="absolute top-8 md:top-12 left-0 right-0 flex flex-col items-center gap-6 z-[110] px-6 pt-[env(safe-area-inset-top)]">
                  <div className="flex items-center gap-4 md:gap-8 bg-black/60 backdrop-blur-2xl border border-white/10 p-2 md:p-3 rounded-full shadow-2xl">
                    <button
                      onClick={toggleMute}
                      className={cn(
                        "p-3 md:p-4 rounded-full transition-all",
                        isMuted ? "bg-red-500/20 text-red-500" : "text-white/40 hover:text-white"
                      )}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    
                    <button
                      onClick={endCall}
                      className="p-5 md:p-6 bg-red-500 text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                    >
                      <PhoneOff className="w-6 h-6" fill="currentColor" />
                    </button>

                    <button
                      onClick={toggleCamera}
                      className={cn(
                        "p-4 rounded-full transition-all",
                        !isCameraOn ? "bg-red-500/20 text-red-500" : "text-white/40 hover:text-white"
                      )}
                    >
                      {!isCameraOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  </div>

                  {profile.responseMode === "text" && (
                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl w-full max-w-md">
                      <input
                        type="text"
                        value={userResponse}
                        onChange={(e) => setUserResponse(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleNextCallStep(userResponse)}
                        placeholder="Chat with your future self..."
                        className="flex-1 bg-transparent border-none px-4 py-2 focus:outline-none text-sm"
                      />
                      <button
                        onClick={() => {
                          handleNextCallStep(userResponse);
                          setUserResponse("");
                        }}
                        disabled={!userResponse || isAITyping}
                        className="p-3 bg-white text-black rounded-xl disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}

        {step === "recharge" && rechargeTask && (
          <motion.div
            key="recharge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center space-y-12 relative z-10"
          >
            <div className="space-y-8">
              <div className="w-24 h-24 bg-white/5 rounded-full mx-auto flex items-center justify-center">
                <Zap className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-sans font-light tracking-tighter">Temporal Alignment</h2>
                <p className="text-xs font-mono uppercase tracking-[0.4em] text-white/20">Manifesting Energy</p>
              </div>
            </div>

            <div className="glass-card p-8 space-y-6 text-left border border-white/20">
              <p className="text-sm font-light leading-relaxed text-white/80 italic">
                "{rechargeTask.task}"
              </p>
              <textarea
                value={rechargeInput}
                onChange={(e) => setRechargeInput(e.target.value)}
                placeholder="Share your reflection..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-white/30 transition-all resize-none"
              />
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={completeRecharge}
                disabled={!rechargeInput.trim()}
                className="minimal-reflection w-full py-6 bg-white text-black rounded-full text-sm font-bold uppercase tracking-[0.4em] disabled:opacity-50"
              >
                Complete Alignment
              </button>
              <button
                onClick={() => setStep("result")}
                className="text-white/30 hover:text-white transition-colors font-mono uppercase tracking-[0.4em] text-[10px]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {step === "ended" && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center space-y-12 relative z-10"
          >
            <div className="space-y-8">
              <div className="w-24 h-24 bg-white/5 rounded-full mx-auto flex items-center justify-center">
                <PhoneOff className="w-8 h-8 text-white/20" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-sans font-light tracking-tighter">Connection Closed</h2>
                <p className="text-xs font-mono uppercase tracking-[0.4em] text-white/20">Temporal Link Terminated</p>
              </div>
            </div>

            <button
              onClick={() => setStep("takeaway")}
              className="minimal-reflection w-full py-6 bg-white text-black rounded-full text-sm font-bold uppercase tracking-[0.4em]"
            >
              View Reflection
            </button>
          </motion.div>
        )}

        {step === "takeaway" && futureSelf && (
          <motion.div
            key="takeaway"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl space-y-24 relative z-10 py-24"
          >
            <div className="text-center space-y-6">
              <h1 className="text-5xl md:text-8xl font-sans font-light tracking-tighter">Future Reflection</h1>
              <p className="text-xs font-mono uppercase tracking-[0.6em] text-white/20">Temporal Node: {profile.name}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-12">
                <div className="glass-card p-12 space-y-8 minimal-reflection">
                  <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/20">The Narrative</div>
                  <p className="text-2xl md:text-3xl text-white font-sans font-light leading-relaxed italic">
                    "{futureSelf.narrative}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {futureSelf.traits.map((trait) => (
                    <div key={trait} className="p-6 bg-white/5 border border-white/5 rounded-2xl text-[10px] uppercase tracking-[0.2em] text-white/40 text-center">
                      {trait}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-12">
                <div className="glass-card p-12 space-y-10 minimal-reflection">
                  <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/20">Action Steps</div>
                  <div className="space-y-8">
                    {futureSelf.recap?.actionSteps.map((step, i) => (
                      <div key={i} className="flex gap-6">
                        <span className="text-[10px] font-mono text-white/20 mt-1">0{i + 1}</span>
                        <p className="text-lg text-white/60 font-sans font-light leading-snug">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => setStep("entry")}
                    className="minimal-reflection w-full py-6 bg-white text-black rounded-full text-sm font-bold uppercase tracking-[0.4em]"
                  >
                    New Connection
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full py-6 bg-white/5 text-white/40 rounded-full text-[10px] font-mono uppercase tracking-[0.4em] hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Reflection
                  </button>
                </div>
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
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Active Connection</p>
                      <div className="w-1 h-1 rounded-full bg-white/20" />
                      <p className={cn(
                        "text-[10px] font-mono uppercase tracking-widest transition-colors",
                        questionsRemaining <= 1 ? "text-orange-400" : "text-white/40"
                      )}>
                        {questionsRemaining} Syncs Left
                      </p>
                    </div>
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

      <footer className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto flex flex-col md:flex-row items-center gap-4 md:gap-6 z-40">
        <span className="text-[8px] md:text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 pointer-events-none text-center md:text-left">
          Explow © 2026 // Future Self Exploration
        </span>
        <div className="flex items-center gap-4 md:gap-6 pointer-events-auto">
          <button 
            onClick={() => setIsPhilosophyModalOpen(true)}
            className="text-[8px] md:text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 hover:text-white/60 transition-colors"
          >
            Philosophy
          </button>
          <button 
            onClick={clearSavedData}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-full text-[8px] md:text-[10px] font-mono uppercase tracking-[0.3em] text-red-500 hover:text-red-400 transition-all group"
          >
            <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
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
