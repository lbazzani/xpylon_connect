export interface SlideFeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface SlideIconComposition {
  primary: string;
  accent?: string;
  badge?: string;
}

export type SlideHeroType =
  | "platform-fade"
  | "people-handshake"
  | "logo-reveal"
  | "chat-sequence"
  | "connection-web"
  | "shield-lock"
  | "chat-mockup"
  | "call-rings"
  | "card-stack"
  | "spark-burst";

export interface SlideAnimation {
  entrance: "fade-up" | "fade-in" | "scale-in";
  iconEffect?: "pulse" | "float" | "none";
  staggerDelay?: number;
}

export interface Slide {
  id: string;
  category: "intro" | "feature" | "cta";
  heroType?: SlideHeroType;
  iconComposition: SlideIconComposition;
  useLogoImage?: boolean;
  tagline?: string;
  title: string;
  subtitle: string;
  features?: SlideFeatureItem[];
  animation?: SlideAnimation;
}

export interface AnimationConfig {
  version: number;
  appName: string;
  defaults: {
    entrance: string;
    iconEffect: string;
    staggerDelay: number;
    transitionDuration: number;
    exitDuration: number;
    enterDelay: number;
    featureItemStagger: number;
  };
  slides: Slide[];
}

export type TourMode = "first-launch" | "menu" | "bot";
