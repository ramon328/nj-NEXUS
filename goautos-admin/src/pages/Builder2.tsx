import React, { useState, useEffect, useMemo } from 'react';
import { Editor, Frame, Element } from '@craftjs/core';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useBuilderTour } from '@/hooks/useBuilderTour';
import { HeroUIProvider } from '@heroui/react';

// User components
import { Text } from '@/components/builder2/userComponents/Text';
import { Container } from '@/components/builder2/userComponents/Container';
import { Grid } from '@/components/builder2/userComponents/Grid';
import { Image } from '@/components/builder2/userComponents/Image';
import { Button } from '@/components/builder2/userComponents/Button';
import { Heading } from '@/components/builder2/userComponents/Heading';
import { Divider } from '@/components/builder2/userComponents/Divider';
import { Spacer } from '@/components/builder2/userComponents/Spacer';
import { SocialLinks } from '@/components/builder2/userComponents/SocialLinks';
import { Icon } from '@/components/builder2/userComponents/Icon';

// Sections
import {
  HeroBasic,
  HeroWithCard,
  HeroWithBackground,
  HeroMinimalistic,
  HeroWithLogo,
  HeroWelcome,
  HeroWithVideoEmbed,
  HeroMega,
  VehicleGrid,
  WhyChooseUs,
  FAQ,
  Testimonials,
  HowToArrive,
  ContactCTA,
  VehicleCarousel,
  VehicleGrid2,
  TraditionalVehicleGrid,
  TraditionalWhyUs,
  TraditionalContactCTA,
  TraditionalHowToArrive,
} from '@/components/builder2/sections';
import { VideoEmbed } from '@/components/builder2/sections/videos/VideoEmbed';
import { Footer } from '@/components/builder2/sections/layout/Footer';
import { BuilderNavbar } from '@/components/builder2/sections/layout/BuilderNavbar';
import { NavbarSimple } from '@/components/builder2/sections/layout/NavbarSimple';
import { StatsCounter } from '@/components/builder2/sections/marketing/StatsCounter';
import { PromoBanner } from '@/components/builder2/sections/marketing/PromoBanner';
import { LogoCloud } from '@/components/builder2/sections/marketing/LogoCloud';
import { LogoMarquee } from '@/components/builder2/sections/marketing/LogoMarquee';
import { LogoGrid } from '@/components/builder2/sections/marketing/LogoGrid';
import { AwardsBadges } from '@/components/builder2/sections/marketing/AwardsBadges';
import { TrustBadges } from '@/components/builder2/sections/marketing/TrustBadges';
import { FloatingWhatsApp } from '@/components/builder2/sections/contact/FloatingWhatsApp';
import { PhotoGallery } from '@/components/builder2/sections/media/PhotoGallery';
import { ImageCarousel } from '@/components/builder2/sections/media/ImageCarousel';
import { TeamMembers } from '@/components/builder2/sections/team/TeamMembers';
import { FinancingFormEmbed, ConsignmentsFormEmbed, BuyDirectFormEmbed, WeSearchFormEmbed, ContactFormEmbed, AboutContentEmbed } from '@/components/builder2/sections/forms';

// Moderna sections
import { HeroModerno } from '@/components/builder2/sections/moderna/HeroModerno';
import { StatsModerno } from '@/components/builder2/sections/moderna/StatsModerno';
import { TestimonialsModerno } from '@/components/builder2/sections/moderna/TestimonialsModerno';
import { CTAModerno } from '@/components/builder2/sections/moderna/CTAModerno';
import { FooterModerno } from '@/components/builder2/sections/moderna/FooterModerno';

// Premium sections
import { HeroPremium } from '@/components/builder2/sections/premium/HeroPremium';
import { FeatureShowcase } from '@/components/builder2/sections/premium/FeatureShowcase';
import { TestimonialsPremium } from '@/components/builder2/sections/premium/TestimonialsPremium';
import { GalleryPremium } from '@/components/builder2/sections/premium/GalleryPremium';
import { CTAPremium } from '@/components/builder2/sections/premium/CTAPremium';

// UI
import { Toolbox } from '@/components/builder2/Toolbox';
import { SettingsPanel } from '@/components/builder2/SettingsPanel';
import { ThemePanel } from '@/components/builder2/ThemePanel';
import { IntegrationsPanel } from '@/components/builder2/IntegrationsPanel';
import { GeneralConfigSection } from '@/components/builder2/GeneralConfigSection';
import { Topbar, PreviewDevice } from '@/components/builder2/Topbar';

import DevicePreviewFrame from '@/components/builder2/DevicePreviewFrame';
import { TextColorToolbar } from '@/components/builder2/TextColorToolbar';

export default function Builder2() {
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);

  const [currentDevice, setCurrentDevice] = useState<PreviewDevice>('desktop');
  const [zoom, setZoom] = useState(0.8);
  const { startTour } = useBuilderTour();

  // Overlay de carga: tapar el canvas hasta que Topbar termine la carga inicial
  // (evento 'builder:loaded') para NO mostrar el árbol default mientras llega el
  // deserialize de la última versión guardada (era el "flash" de 4-5s con una
  // versión vieja). Timeout de seguridad por si el evento nunca llega.
  const [builderLoaded, setBuilderLoaded] = useState(false);
  useEffect(() => {
    // pequeño delay para que el deserialize ya haya pintado antes de quitar el overlay
    const onLoaded = () => setTimeout(() => setBuilderLoaded(true), 100);
    window.addEventListener('builder:loaded', onLoaded);
    const safety = setTimeout(() => setBuilderLoaded(true), 20000);
    return () => {
      window.removeEventListener('builder:loaded', onLoaded);
      clearTimeout(safety);
    };
  }, []);

  const isOnboardingMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('onboarding') === 'true';
  }, []);

  useEffect(() => {
    if (isOnboardingMode) {
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnboardingMode, startTour]);

  const baseResolver = {
    // User components
    Text,
    Container,
    Grid,
    Image,
    Button,
    Heading,
    Divider,
    Spacer,
    SocialLinks,
    Icon,
    // Hero sections
    HeroBasic,
    HeroWithCard,
    HeroWithBackground,
    HeroMinimalistic,
    HeroWithLogo,
    HeroWelcome,
    HeroWithVideoEmbed,
    HeroMega,
    // Vehicle sections
    VehicleGrid,
    VehicleCarousel,
    VehicleGrid2,
    // Feature sections
    WhyChooseUs,
    FAQ,
    Testimonials,
    // Contact sections
    HowToArrive,
    ContactCTA,
    // Media
    VideoEmbed,
    // Layout sections
    BuilderNavbar,
    NavbarSimple,
    Footer,
    StatsCounter,
    PromoBanner,
    LogoCloud,
    LogoMarquee,
    LogoGrid,
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
    // Premium sections
    HeroPremium,
    FeatureShowcase,
    TestimonialsPremium,
    GalleryPremium,
    CTAPremium,
    // Form embeds
    FinancingFormEmbed,
    ConsignmentsFormEmbed,
    BuyDirectFormEmbed,
    WeSearchFormEmbed,
    ContactFormEmbed,
    AboutContentEmbed,
    // Traditional (backward compat)
    TraditionalVehicleGrid,
    TraditionalWhyUs,
    TraditionalContactCTA,
    TraditionalHowToArrive,
    div: 'div',
  };

  const resolver = new Proxy(baseResolver, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      console.warn(`⚠️ Resolver faltante para "${String(prop)}", usando <div> de fallback`);
      return 'div';
    },
  });

  return (
    <HeroUIProvider>
    <div className="flex flex-col h-screen overflow-hidden">
      <Editor
        resolver={resolver}
        onNodesChange={() => window.dispatchEvent(new Event('builder:nodeschange'))}
      >
        <Topbar
          currentDevice={currentDevice}
          setCurrentDevice={setCurrentDevice}
          zoom={zoom}
          setZoom={setZoom}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - Toolbox */}
          <div
            className="w-[240px] border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0"
            data-tour="builder-toolbox"
          >
            <div className="p-4">
              <Toolbox />
            </div>
          </div>

          {/* Main canvas area */}
          {/* Capture-phase guard: never let a preview link navigate away (would
              unmount the builder and lose unsaved work). Covers every component,
              including any that lack their own edit-mode link guard. */}
          <div
            className="flex-1 overflow-auto bg-gray-50 relative"
            data-tour="builder-canvas"
            onClickCapture={(e) => {
              const anchor = (e.target as HTMLElement)?.closest?.('a');
              if (anchor) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {/* Overlay de carga inicial — tapa el árbol default hasta que el
                editor deserializa la última versión guardada. */}
            {!builderLoaded && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
                  <span className="text-sm text-gray-500">Cargando tu sitio…</span>
                </div>
              </div>
            )}
            <div className="min-h-full flex items-start justify-center p-6">
              <DevicePreviewFrame
                device={currentDevice}
                zoom={zoom}
                className="w-full"
                fontFamily={client?.theme?.light?.fontFamily}
              >
                <Frame>
                  <Element
                    id="root"
                    is="div"
                    canvas
                    custom={{ displayName: 'App Canvas' }}
                    style={{ width: '100%', minHeight: '100vh' }}
                  >
                    <BuilderNavbar />
                    <HeroWelcome
                      title="Encuentra tu próximo vehículo en"
                      highlightedText={clientDefaults.companyName}
                      subtitle="Describe el vehículo de tus sueños y deja que nuestra IA encuentre las mejores opciones para ti."
                      searchPlaceholder="Toyota Corolla blanco"
                      bgColor="#ffffff"
                      textColor="#111827"
                      highlightColor={clientDefaults.primaryColor}
                    />
                    <TraditionalVehicleGrid />
                    <TraditionalHowToArrive />
                    <TraditionalWhyUs
                      title="¿Por qué elegirnos?"
                      subtitle="Descubre por qué nuestros clientes confían en nosotros"
                    />
                    <TraditionalContactCTA
                      title="¿Listo para encontrar tu próximo vehículo?"
                      subtitle="Contáctanos hoy mismo."
                    />
                    <Footer />
                  </Element>
                </Frame>
                <TextColorToolbar />
              </DevicePreviewFrame>
            </div>
          </div>

          {/* Right sidebar - Settings + Theme */}
          <div
            className="w-[280px] border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0"
            data-tour="builder-sidebar"
          >
            <div className="p-3 space-y-3">
              <GeneralConfigSection>
                <ThemePanel />
                <IntegrationsPanel />
              </GeneralConfigSection>
              <SettingsPanel />
            </div>
          </div>
        </div>
      </Editor>
    </div>
    </HeroUIProvider>
  );
}
