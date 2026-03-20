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

export interface SlideAnimation {
  entrance: "fade-up" | "fade-in" | "scale-in";
  iconEffect?: "pulse" | "float" | "none";
  staggerDelay?: number;
}

export interface Slide {
  id: string;
  category: "intro" | "feature" | "cta";
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
  };
  slides: Slide[];
}

export type TourMode = "first-launch" | "menu" | "bot";
