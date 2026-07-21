// Export all section components
export * from './initialfold';
export * from './vehicles';
export * from './features';
export * from './testimonials';

// Import individual components
import { HeroBasic } from './initialfold/HeroBasic';
import { HeroWithBackground } from './initialfold/HeroWithBackground';
import { HeroCarSearch } from './initialfold/HeroCarSearch';
import { HeroWithCard } from './initialfold/HeroWithCard';
import { HeroWithImage } from './initialfold/HeroWithImage';
import { HeroFeatureCards } from './initialfold/HeroFeatureCards';
import { HeroMinimalistic } from './initialfold/HeroMinimalistic';
import { HeroWithLogo } from './initialfold/HeroWithLogo';
import { HeroWelcome } from './initialfold/HeroWelcome';
import { HeroWithVideoEmbed } from './initialfold/HeroWithVideoEmbed';
import { WhyChooseUs } from './features/WhyChooseUs';
import { VehicleGrid } from './vehicles/VehicleGrid';
import { VehicleCarousel } from './vehicles/VehicleCarousel';
import { FAQ } from './features/FAQ';
import { HowToArrive } from './contact/HowToArrive';
import { ContactCTA } from './contact/ContactCTA';
import { TraditionalContactCTA } from './contact/TraditionalContactCTA';
import { VideoEmbed } from './videos/VideoEmbed';
import { TraditionalVehicleGrid } from './vehicles/TraditionalVehicleGrid';
import { TraditionalWhyUs } from './features/TraditionalWhyUs';
import { TraditionalHowToArrive } from './contact/TraditionalHowToArrive';

// New sections
import { Footer } from './layout/Footer';
import { StatsCounter } from './marketing/StatsCounter';
import { PromoBanner } from './marketing/PromoBanner';
import { AwardsBadges } from './marketing/AwardsBadges';
import { TrustBadges } from './marketing/TrustBadges';
import { FloatingWhatsApp } from './contact/FloatingWhatsApp';
import { PhotoGallery } from './media/PhotoGallery';
import { ImageCarousel } from './media/ImageCarousel';
import { TeamMembers } from './team/TeamMembers';

// Moderna sections
import { HeroModerno } from './moderna/HeroModerno';
import { StatsModerno } from './moderna/StatsModerno';
import { TestimonialsModerno } from './moderna/TestimonialsModerno';
import { CTAModerno } from './moderna/CTAModerno';
import { FooterModerno } from './moderna/FooterModerno';

// Re-export individual components
export {
  HeroBasic,
  HeroWithBackground,
  HeroCarSearch,
  HeroWithCard,
  HeroWithImage,
  HeroFeatureCards,
  HeroMinimalistic,
  HeroWithLogo,
  HeroWelcome,
  HeroWithVideoEmbed,
  WhyChooseUs,
  VehicleGrid,
  VehicleCarousel,
  FAQ,
  HowToArrive,
  ContactCTA,
  TraditionalContactCTA,
  TraditionalVehicleGrid,
  TraditionalWhyUs,
  TraditionalHowToArrive,
  VideoEmbed,
  // New sections
  Footer,
  StatsCounter,
  PromoBanner,
  AwardsBadges,
  TrustBadges,
  FloatingWhatsApp,
  PhotoGallery,
  ImageCarousel,
  TeamMembers,
  // Moderna sections
  HeroModerno,
  StatsModerno,
  TestimonialsModerno,
  CTAModerno,
  FooterModerno,
};
