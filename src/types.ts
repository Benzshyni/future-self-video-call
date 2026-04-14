export type Step = "landing" | "onboarding" | "generating" | "result" | "entry" | "choose-future" | "choose-response" | "take-selfie" | "transformation" | "incoming-call" | "video-call" | "ended" | "takeaway";

export interface UserProfile {
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

export interface FutureSelf {
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

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}
