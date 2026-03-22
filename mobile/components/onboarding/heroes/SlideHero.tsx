import React from "react";
import type { SlideHeroType } from "../types";
import { HeroLogoReveal } from "./HeroLogoReveal";
import { HeroChatSequence } from "./HeroChatSequence";
import { HeroConnectionWeb } from "./HeroConnectionWeb";
import { HeroShieldLock } from "./HeroShieldLock";
import { HeroChatMockup } from "./HeroChatMockup";
import { HeroCallRings } from "./HeroCallRings";
import { HeroCardStack } from "./HeroCardStack";
import { HeroSparkBurst } from "./HeroSparkBurst";

const HEROES: Record<SlideHeroType, React.ComponentType<{ isActive: boolean }>> = {
  "logo-reveal": HeroLogoReveal,
  "chat-sequence": HeroChatSequence,
  "connection-web": HeroConnectionWeb,
  "shield-lock": HeroShieldLock,
  "chat-mockup": HeroChatMockup,
  "call-rings": HeroCallRings,
  "card-stack": HeroCardStack,
  "spark-burst": HeroSparkBurst,
};

export function SlideHero({ heroType, isActive }: { heroType?: SlideHeroType; isActive: boolean }) {
  if (!heroType) return null;
  const Hero = HEROES[heroType];
  return Hero ? <Hero isActive={isActive} /> : null;
}
