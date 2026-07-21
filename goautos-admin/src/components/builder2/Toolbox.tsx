import React, { useState, useRef, useEffect } from 'react';
import { useEditor, Element } from '@craftjs/core';
import posthog from '@/utils/posthog';
import { Text } from './userComponents/Text';
import { Container } from './userComponents/Container';
import { Grid } from './userComponents/Grid';
import { Image } from './userComponents/Image';
import { Button } from './userComponents/Button';
import { Heading } from './userComponents/Heading';
import { Divider } from './userComponents/Divider';
import { Spacer } from './userComponents/Spacer';
import { SocialLinks } from './userComponents/SocialLinks';
import { Icon } from './userComponents/Icon';
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
  VehicleCarousel,
  WhyChooseUs,
  FAQ,
  Testimonials,
  HowToArrive,
  ContactCTA,
  VideoEmbed,
  VehicleGrid2,
} from './sections';
import { Footer } from './sections/layout/Footer';
import { BuilderNavbar } from './sections/layout/BuilderNavbar';
import { NavbarSimple } from './sections/layout/NavbarSimple';
import { StatsCounter } from './sections/marketing/StatsCounter';
import { PromoBanner } from './sections/marketing/PromoBanner';
import { LogoCloud } from './sections/marketing/LogoCloud';
import { LogoMarquee } from './sections/marketing/LogoMarquee';
import { LogoGrid } from './sections/marketing/LogoGrid';
import { AwardsBadges } from './sections/marketing/AwardsBadges';
import { TrustBadges } from './sections/marketing/TrustBadges';
import { PhotoGallery } from './sections/media/PhotoGallery';
import { ImageCarousel } from './sections/media/ImageCarousel';
import { TeamMembers } from './sections/team/TeamMembers';
import { HeroModerno } from './sections/moderna/HeroModerno';
import { StatsModerno } from './sections/moderna/StatsModerno';
import { TestimonialsModerno } from './sections/moderna/TestimonialsModerno';
import { CTAModerno } from './sections/moderna/CTAModerno';
import { FooterModerno } from './sections/moderna/FooterModerno';
// Traditional sections
import { TraditionalVehicleGrid } from './sections/vehicles/TraditionalVehicleGrid';
import { TraditionalWhyUs } from './sections/features/TraditionalWhyUs';
import { TraditionalContactCTA } from './sections/contact/TraditionalContactCTA';
import { TraditionalHowToArrive } from './sections/contact/TraditionalHowToArrive';
import { FloatingWhatsApp } from './sections/contact/FloatingWhatsApp';
import { WeSearchFormEmbed } from './sections/forms';
import { WE_SEARCH_DEFAULT_FIELDS } from './settings/componentSettings';
// Premium sections
import { HeroPremium } from './sections/premium/HeroPremium';
import { FeatureShowcase } from './sections/premium/FeatureShowcase';
import { TestimonialsPremium } from './sections/premium/TestimonialsPremium';
import { GalleryPremium } from './sections/premium/GalleryPremium';
import { CTAPremium } from './sections/premium/CTAPremium';
import { ChevronDown, ChevronRight, GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';

// Define main section types
type MainSectionType = 'secciones' | 'componentes';

// Detect current theme by checking the BuilderNavbar or HeroWelcome bgColor
function useCurrentScheme(): 'LIGHT' | 'DARK' {
  const { query } = useEditor();
  try {
    const json = query.serialize();
    const nodes = typeof json === 'string' ? JSON.parse(json) : json;
    const flat = nodes?.nodes || nodes;
    for (const nodeId of Object.keys(flat)) {
      const node = flat[nodeId];
      const name = node?.type?.resolvedName || '';
      if (['BuilderNavbar', 'HeroWelcome', 'HeroModerno', 'HeroBasic', 'HeroMinimalistic'].includes(name)) {
        const bg = node?.props?.bgColor || '';
        if (bg && bg !== '') {
          const c = bg.replace('#', '');
          if (c.length === 6) {
            const r = parseInt(c.substring(0, 2), 16) / 255;
            const g = parseInt(c.substring(2, 4), 16) / 255;
            const b = parseInt(c.substring(4, 6), 16) / 255;
            if (0.299 * r + 0.587 * g + 0.114 * b < 0.4) return 'DARK';
          }
        }
        return 'LIGHT';
      }
    }
  } catch {}
  return 'LIGHT';
}

export const Toolbox = () => {
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const scheme = useCurrentScheme();
  const dark = scheme === 'DARK';

  const { connectors, selected, nodeCount, nodeNames } = useEditor((state) => {
    let selectedNodeName = '';
    if (state.events.selected) {
      const nodeIds = Array.from(state.events.selected);
      if (nodeIds.length) {
        const currentNode = state.nodes[nodeIds[0]];
        if (currentNode) {
          selectedNodeName = currentNode.data.name;
        }
      }
    }
    const allNodeIds = Object.keys(state.nodes);
    return {
      selected: selectedNodeName,
      nodeCount: allNodeIds.length,
      nodeNames: allNodeIds.map((id) => state.nodes[id]?.data?.name || ''),
    };
  });

  // Track when new components are added to the canvas
  const prevNodeCountRef = useRef(nodeCount);
  useEffect(() => {
    if (nodeCount > prevNodeCountRef.current) {
      // New node(s) added — find the newest ones
      const addedCount = nodeCount - prevNodeCountRef.current;
      const newNames = nodeNames.slice(-addedCount);
      newNames.forEach((name) => {
        if (name && name !== 'div') {
          posthog.capture({
            distinctId: client?.id?.toString() || 'anonymous',
            event: 'builder_component_added',
            properties: { component_type: name },
          });
        }
      });
    }
    prevNodeCountRef.current = nodeCount;
  }, [nodeCount]);

  const [activeMainSection, setActiveMainSection] =
    useState<MainSectionType>('secciones');
  const [showDragHint, setShowDragHint] = useState(true);
  const [isPantallaInicialOpen, setIsPantallaInicialOpen] = useState(true);
  const [isVehiculosOpen, setIsVehiculosOpen] = useState(false);
  const [isCaracteristicasOpen, setIsCaracteristicasOpen] = useState(false);
  const [isTestimoniosOpen, setIsTestimoniosOpen] = useState(false);
  const [isGaleriaOpen, setIsGaleriaOpen] = useState(false);
  const [isCtaOpen, setIsCtaOpen] = useState(false);
  const [isContactoOpen, setIsContactoOpen] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const [isEquipoOpen, setIsEquipoOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isFormulariosOpen, setIsFormulariosOpen] = useState(false);

  // Helper function to check if a component is selected
  const isComponentSelected = (componentName: string) => {
    return selected === componentName;
  };

  // Helper function to get component item styles
  const getComponentItemStyles = (componentName: string) => {
    return cn(
      'flex items-center gap-3 p-2.5 rounded-lg cursor-move transition-all border hover:shadow-sm',
      isComponentSelected(componentName)
        ? 'border-sky-500 bg-sky-50'
        : 'border-gray-200 hover:border-gray-300'
    );
  };

  // Thumbnail presets for sections and components
  // Thumbnail base: w-16 h-10 landscape wireframes
  const tb = 'w-16 h-10 shrink-0 rounded border overflow-hidden p-1.5 flex';
  const THUMBNAILS: Record<string, React.ReactNode> = {
    // Características
    WhyChooseUs: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-end justify-center gap-1`}>
        <div className='flex flex-col items-center gap-0.5'><div className='w-2 h-2 bg-gray-300 rounded-full' /><div className='w-3 h-0.5 bg-gray-300 rounded' /><div className='w-2 h-0.5 bg-gray-200 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-2 h-2 bg-gray-300 rounded-full' /><div className='w-3 h-0.5 bg-gray-300 rounded' /><div className='w-2 h-0.5 bg-gray-200 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-2 h-2 bg-gray-300 rounded-full' /><div className='w-3 h-0.5 bg-gray-300 rounded' /><div className='w-2 h-0.5 bg-gray-200 rounded' /></div>
      </div>
    ),
    FAQ: (
      <div className={`${tb} bg-gray-50 border-gray-200 flex-col justify-center`}>
        <div className='w-8 h-0.5 bg-gray-300 rounded mb-1' />
        <div className='space-y-0.5 w-full'>
          <div className='flex items-center gap-0.5'><div className='w-0.5 h-0.5 bg-gray-400' /><div className='flex-1 h-0.5 bg-gray-300 rounded' /></div>
          <div className='flex items-center gap-0.5'><div className='w-0.5 h-0.5 bg-gray-400' /><div className='flex-1 h-0.5 bg-gray-300 rounded' /></div>
          <div className='flex items-center gap-0.5'><div className='w-0.5 h-0.5 bg-gray-400' /><div className='flex-1 h-0.5 bg-gray-300 rounded' /></div>
        </div>
      </div>
    ),
    Testimonials: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center gap-1`}>
        <div className='flex flex-col items-center gap-0.5 flex-1'>
          <div className='flex gap-px'>{[...Array(5)].map((_,i) => <div key={i} className='w-1 h-1 bg-amber-300 rounded-sm' />)}</div>
          <div className='w-full h-0.5 bg-gray-300 rounded' />
          <div className='w-3/4 h-0.5 bg-gray-200 rounded' />
          <div className='flex items-center gap-0.5 mt-0.5'><div className='w-2 h-2 bg-gray-300 rounded-full' /><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
        </div>
      </div>
    ),
    // Vehículos
    VehicleGrid: (
      <div className={`${tb} bg-gray-50 border-gray-200 flex-col`}>
        <div className='w-6 h-0.5 bg-gray-300 rounded mb-0.5' />
        <div className='grid grid-cols-3 gap-0.5 flex-1'>
          {[...Array(6)].map((_,i) => <div key={i} className='bg-gray-200 rounded-sm' />)}
        </div>
      </div>
    ),
    VehicleGrid2: (
      <div className={`${tb} bg-gray-50 border-gray-200 flex-col`}>
        <div className='flex items-center gap-0.5 mb-0.5'><div className='flex-1 h-1 bg-gray-200 rounded border border-gray-300' /><div className='w-2 h-1 bg-gray-300 rounded' /></div>
        <div className='grid grid-cols-3 gap-0.5 flex-1'>
          {[...Array(3)].map((_,i) => <div key={i} className='bg-gray-200 rounded-sm' />)}
        </div>
      </div>
    ),
    VehicleCarousel: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center gap-0.5`}>
        <div className='w-0.5 h-3 bg-gray-300 rounded' />
        <div className='flex gap-0.5 flex-1'>
          <div className='flex-1 h-5 bg-gray-200 rounded-sm' />
          <div className='flex-1 h-5 bg-gray-300 rounded-sm' />
          <div className='flex-1 h-5 bg-gray-200 rounded-sm' />
        </div>
        <div className='w-0.5 h-3 bg-gray-300 rounded' />
      </div>
    ),
    SoldVehiclesCarousel: (
      <div className={`${tb} bg-rose-50 border-rose-200 items-center justify-center gap-0.5`}>
        <div className='w-0.5 h-3 bg-rose-300 rounded' />
        <div className='flex gap-0.5 flex-1'>
          <div className='flex-1 h-5 bg-rose-200 rounded-sm' />
          <div className='flex-1 h-5 bg-rose-300 rounded-sm' />
          <div className='flex-1 h-5 bg-rose-200 rounded-sm' />
        </div>
        <div className='w-0.5 h-3 bg-rose-300 rounded' />
      </div>
    ),
    // Videos
    VideoEmbed: (
      <div className={`${tb} bg-gray-800 border-gray-700 items-center justify-center`}>
        <div className='w-3 h-3 rounded-full bg-white/20 flex items-center justify-center'><div className='w-0 h-0 border-l-[4px] border-l-white border-t-[2.5px] border-t-transparent border-b-[2.5px] border-b-transparent ml-0.5' /></div>
      </div>
    ),
    // Contacto
    HowToArrive: (
      <div className={`${tb} bg-green-50 border-green-200 items-center gap-1`}>
        <div className='flex-1 h-full bg-green-100 rounded-sm border border-green-200' />
        <div className='space-y-0.5 w-5'><div className='w-full h-0.5 bg-green-300 rounded' /><div className='w-3/4 h-0.5 bg-green-200 rounded' /><div className='w-2 h-1 bg-green-300 rounded' /></div>
      </div>
    ),
    ContactCTA: (
      <div className={`${tb} bg-gray-800 border-gray-700 flex-col items-center justify-center`}>
        <div className='w-8 h-0.5 bg-white/60 rounded mb-0.5' />
        <div className='w-5 h-0.5 bg-white/40 rounded mb-1' />
        <div className='w-5 h-1.5 bg-sky-500 rounded-sm' />
      </div>
    ),
    FloatingWhatsApp: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-end justify-end p-1`}>
        <div className='w-4 h-4 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm'>
          <div className='w-2 h-2 rounded-full bg-white opacity-90' />
        </div>
      </div>
    ),
    // Marketing
    StatsCounter: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-end justify-center gap-1.5 pb-0.5`}>
        <div className='flex flex-col items-center'><div className='text-[5px] font-bold text-gray-400'>120</div><div className='w-4 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center'><div className='text-[5px] font-bold text-gray-400'>45</div><div className='w-4 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center'><div className='text-[5px] font-bold text-gray-400'>8</div><div className='w-4 h-0.5 bg-gray-300 rounded' /></div>
      </div>
    ),
    PromoBanner: (
      <div className={`${tb} bg-amber-50 border-amber-200 items-center gap-1`}>
        <div className='flex-1 space-y-0.5'><div className='w-full h-1 bg-amber-300 rounded' /><div className='w-3/4 h-0.5 bg-amber-200 rounded' /></div>
        <div className='w-3 h-1.5 bg-amber-400 rounded-sm' />
      </div>
    ),
    AwardsBadges: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center gap-1.5`}>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100' /><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100' /><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100' /><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
      </div>
    ),
    TrustBadges: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center gap-1`}>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center'><div className='w-1 h-1 bg-emerald-500 rounded-full' /></div><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center'><div className='w-1 h-1 bg-emerald-500 rounded-full' /></div><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center'><div className='w-1 h-1 bg-emerald-500 rounded-full' /></div><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center'><div className='w-1 h-1 bg-emerald-500 rounded-full' /></div><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
      </div>
    ),
    PhotoGallery: (
      <div className={`${tb} bg-gray-50 border-gray-200 flex-col gap-0.5`}>
        <div className='flex gap-0.5 flex-1'><div className='flex-1 bg-gray-300 rounded-sm' /><div className='flex-1 bg-gray-200 rounded-sm' /><div className='flex-1 bg-gray-300 rounded-sm' /></div>
        <div className='flex gap-0.5 flex-1'><div className='flex-1 bg-gray-200 rounded-sm' /><div className='flex-1 bg-gray-300 rounded-sm' /><div className='flex-1 bg-gray-200 rounded-sm' /></div>
      </div>
    ),
    ImageCarousel: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center gap-0.5 overflow-hidden`}>
        <div className='w-2.5 h-5 bg-gray-200 rounded-sm shrink-0' />
        <div className='w-4 h-6 bg-gray-300 rounded-sm shrink-0' />
        <div className='w-4 h-6 bg-gray-300 rounded-sm shrink-0' />
        <div className='w-4 h-6 bg-gray-300 rounded-sm shrink-0' />
        <div className='w-2.5 h-5 bg-gray-200 rounded-sm shrink-0' />
      </div>
    ),
    TeamMembers: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center gap-2`}>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 bg-gray-300 rounded-full' /><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 bg-gray-300 rounded-full' /><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-3 h-3 bg-gray-300 rounded-full' /><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
      </div>
    ),
    LogoCloud: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center`}>
        <div className='grid grid-cols-3 gap-1 w-full px-1'>
          <div className='h-1 bg-gray-300 rounded' />
          <div className='h-1 bg-gray-300 rounded' />
          <div className='h-1 bg-gray-300 rounded' />
          <div className='h-1 bg-gray-300 rounded' />
          <div className='h-1 bg-gray-300 rounded' />
          <div className='h-1 bg-gray-300 rounded' />
        </div>
      </div>
    ),
    LogoMarquee: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center overflow-hidden gap-1 px-1`}>
        <div className='w-3 h-1 bg-gray-300 rounded flex-shrink-0' />
        <div className='w-3 h-1 bg-gray-300 rounded flex-shrink-0' />
        <div className='w-3 h-1 bg-gray-300 rounded flex-shrink-0' />
        <div className='w-3 h-1 bg-gray-300 rounded flex-shrink-0' />
      </div>
    ),
    LogoGrid: (
      <div className={`${tb} bg-gray-50 border-gray-200 flex-col gap-0.5 px-1`}>
        <div className='flex gap-0.5'><div className='flex-1 h-0.5 bg-blue-200 rounded' /></div>
        <div className='flex gap-0.5'><div className='flex-1 h-0.5 bg-gray-300 rounded' /><div className='flex-1 h-0.5 bg-gray-300 rounded' /><div className='flex-1 h-0.5 bg-gray-300 rounded' /></div>
        <div className='flex gap-0.5'><div className='flex-1 h-0.5 bg-blue-200 rounded' /></div>
        <div className='flex gap-0.5'><div className='flex-1 h-0.5 bg-gray-300 rounded' /><div className='flex-1 h-0.5 bg-gray-300 rounded' /></div>
      </div>
    ),
    // Moderna
    HeroModerno: (
      <div className={`${tb} bg-slate-50 border-slate-200 items-center gap-1`}>
        <div className='flex-1 space-y-0.5'><div className='w-full h-1 bg-slate-400 rounded' /><div className='w-3/4 h-0.5 bg-slate-300 rounded' /><div className='w-4 h-1.5 bg-slate-400 rounded-sm mt-0.5' /></div>
        <div className='w-5 h-full bg-slate-200 rounded-sm' />
      </div>
    ),
    StatsModerno: (
      <div className={`${tb} bg-slate-50 border-slate-200 items-end justify-center gap-1 pb-0.5`}>
        <div className='flex flex-col items-center'><div className='text-[5px] font-bold text-slate-400'>+120</div><div className='w-4 h-0.5 bg-slate-300 rounded' /></div>
        <div className='flex flex-col items-center'><div className='text-[5px] font-bold text-slate-400'>+45</div><div className='w-4 h-0.5 bg-slate-300 rounded' /></div>
      </div>
    ),
    TestimonialsModerno: (
      <div className={`${tb} bg-slate-50 border-slate-200 items-center justify-center gap-1`}>
        <div className='w-4 h-4 bg-slate-200 rounded-lg border border-slate-300 p-0.5'><div className='w-full h-0.5 bg-slate-300 rounded mb-0.5' /><div className='w-2/3 h-0.5 bg-slate-300 rounded' /></div>
        <div className='w-4 h-4 bg-slate-200 rounded-lg border border-slate-300 p-0.5'><div className='w-full h-0.5 bg-slate-300 rounded mb-0.5' /><div className='w-2/3 h-0.5 bg-slate-300 rounded' /></div>
      </div>
    ),
    CTAModerno: (
      <div className={`${tb} bg-slate-800 border-slate-700 flex-col items-center justify-center`}>
        <div className='w-8 h-0.5 bg-white/50 rounded mb-0.5' />
        <div className='w-5 h-0.5 bg-white/30 rounded mb-1' />
        <div className='w-5 h-1.5 bg-slate-500 rounded-sm' />
      </div>
    ),
    // Tradicional
    TraditionalVehicleGrid: (
      <div className={`${tb} bg-blue-50 border-blue-200 flex-col`}>
        <div className='flex gap-0.5 mb-0.5'><div className='w-2 h-0.5 bg-blue-300 rounded' /><div className='w-2 h-0.5 bg-blue-200 rounded' /><div className='w-2 h-0.5 bg-blue-200 rounded' /></div>
        <div className='grid grid-cols-3 gap-0.5 flex-1'>
          {[...Array(6)].map((_,i) => <div key={i} className='bg-blue-200 rounded-sm' />)}
        </div>
      </div>
    ),
    TraditionalWhyUs: (
      <div className={`${tb} bg-blue-50 border-blue-200 items-end justify-center gap-1`}>
        <div className='flex flex-col items-center gap-0.5'><div className='w-2 h-2 bg-blue-200 rounded-full' /><div className='w-3 h-0.5 bg-blue-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-2 h-2 bg-blue-200 rounded-full' /><div className='w-3 h-0.5 bg-blue-300 rounded' /></div>
        <div className='flex flex-col items-center gap-0.5'><div className='w-2 h-2 bg-blue-200 rounded-full' /><div className='w-3 h-0.5 bg-blue-300 rounded' /></div>
      </div>
    ),
    TraditionalContactCTA: (
      <div className={`${tb} bg-blue-800 border-blue-700 flex-col items-center justify-center`}>
        <div className='w-8 h-0.5 bg-white/50 rounded mb-0.5' />
        <div className='w-5 h-1.5 bg-blue-400 rounded-sm' />
      </div>
    ),
    TraditionalHowToArrive: (
      <div className={`${tb} bg-blue-50 border-blue-200 items-center gap-1`}>
        <div className='flex-1 h-full bg-blue-100 rounded-sm border border-blue-200' />
        <div className='space-y-0.5 w-5'><div className='w-full h-0.5 bg-blue-300 rounded' /><div className='w-3/4 h-0.5 bg-blue-200 rounded' /></div>
      </div>
    ),
    // Premium
    HeroPremium: (
      <div className={`${tb} bg-gray-900 border-gray-700 items-center gap-1`}>
        <div className='flex-1 space-y-0.5'><div className='w-full h-1 bg-amber-400/80 rounded' /><div className='w-3/4 h-0.5 bg-white/30 rounded' /><div className='w-4 h-1.5 bg-amber-400 rounded-sm mt-0.5' /></div>
        <div className='w-5 h-full bg-gray-700 rounded-sm' />
      </div>
    ),
    FeatureShowcase: (
      <div className={`${tb} bg-gray-900 border-gray-700 items-center gap-1`}>
        <div className='w-5 h-full bg-gray-700 rounded-sm' />
        <div className='flex-1 space-y-0.5'><div className='w-full h-0.5 bg-amber-400/60 rounded' /><div className='w-full h-0.5 bg-white/20 rounded' /><div className='w-3/4 h-0.5 bg-white/20 rounded' /></div>
      </div>
    ),
    TestimonialsPremium: (
      <div className={`${tb} bg-gray-900 border-gray-700 items-center justify-center gap-1`}>
        <div className='w-4 h-5 bg-gray-800 rounded border border-gray-700 p-0.5'><div className='w-full h-0.5 bg-amber-400/40 rounded mb-0.5' /><div className='w-2/3 h-0.5 bg-white/20 rounded' /></div>
        <div className='w-4 h-5 bg-gray-800 rounded border border-gray-700 p-0.5'><div className='w-full h-0.5 bg-amber-400/40 rounded mb-0.5' /><div className='w-2/3 h-0.5 bg-white/20 rounded' /></div>
      </div>
    ),
    GalleryPremium: (
      <div className={`${tb} bg-gray-900 border-gray-700 flex-col gap-0.5`}>
        <div className='flex gap-0.5 flex-1'><div className='flex-[2] bg-gray-700 rounded-sm' /><div className='flex-1 bg-gray-800 rounded-sm' /></div>
        <div className='flex gap-0.5 flex-1'><div className='flex-1 bg-gray-800 rounded-sm' /><div className='flex-[2] bg-gray-700 rounded-sm' /></div>
      </div>
    ),
    CTAPremium: (
      <div className={`${tb} bg-gray-900 border-gray-700 flex-col items-center justify-center`}>
        <div className='w-8 h-0.5 bg-amber-400/60 rounded mb-0.5' />
        <div className='w-5 h-0.5 bg-white/30 rounded mb-1' />
        <div className='w-5 h-1.5 bg-amber-400 rounded-sm' />
      </div>
    ),
    // Layout
    BuilderNavbar: (
      <div className={`${tb} bg-white border-gray-200 items-center`}>
        <div className='w-2 h-2 bg-gray-300 rounded-sm' />
        <div className='flex-1' />
        <div className='flex gap-0.5'><div className='w-2 h-0.5 bg-gray-300 rounded' /><div className='w-2 h-0.5 bg-gray-300 rounded' /><div className='w-2 h-0.5 bg-gray-300 rounded' /><div className='w-2 h-1 bg-gray-800 rounded-sm' /></div>
      </div>
    ),
    NavbarSimple: (
      <div className={`${tb} bg-white border-gray-200 items-center justify-center`}>
        <div className='flex gap-1'><div className='w-3 h-0.5 bg-gray-300 rounded' /><div className='w-3 h-0.5 bg-gray-400 rounded' /><div className='w-3 h-0.5 bg-gray-300 rounded' /><div className='w-3 h-0.5 bg-gray-300 rounded' /></div>
      </div>
    ),
    Footer: (
      <div className={`${tb} bg-gray-100 border-gray-300 flex-col justify-end`}>
        <div className='flex gap-1 mb-0.5'><div className='flex-1 space-y-px'><div className='w-full h-0.5 bg-gray-400 rounded' /><div className='w-2/3 h-0.5 bg-gray-300 rounded' /></div><div className='flex-1 space-y-px'><div className='w-full h-0.5 bg-gray-400 rounded' /><div className='w-2/3 h-0.5 bg-gray-300 rounded' /></div></div>
        <div className='h-px bg-gray-300 w-full' />
        <div className='w-1/2 h-0.5 bg-gray-300 rounded mx-auto mt-0.5' />
      </div>
    ),
    FooterModerno: (
      <div className={`${tb} bg-slate-800 border-slate-700 flex-col justify-end`}>
        <div className='w-3 h-0.5 bg-white/30 rounded mx-auto mb-0.5' />
        <div className='flex gap-0.5 justify-center mb-0.5'><div className='w-1.5 h-1.5 bg-white/10 rounded-full' /><div className='w-1.5 h-1.5 bg-white/10 rounded-full' /><div className='w-1.5 h-1.5 bg-white/10 rounded-full' /></div>
        <div className='h-px bg-white/10 w-full' />
        <div className='w-1/2 h-0.5 bg-white/20 rounded mx-auto mt-0.5' />
      </div>
    ),
    // Components
    Text: (
      <div className={`${tb} bg-gray-50 border-gray-200 flex-col justify-center`}>
        <div className='w-full h-0.5 bg-gray-300 rounded' /><div className='w-3/4 h-0.5 bg-gray-300 rounded mt-0.5' /><div className='w-1/2 h-0.5 bg-gray-200 rounded mt-0.5' />
      </div>
    ),
    Heading: (
      <div className={`${tb} bg-gray-50 border-gray-200 flex-col justify-center`}>
        <div className='w-full h-1 bg-gray-400 rounded' /><div className='w-2/3 h-0.5 bg-gray-200 rounded mt-0.5' />
      </div>
    ),
    Button: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center`}>
        <div className='px-2 py-0.5 bg-gray-800 rounded-sm'><div className='w-4 h-0.5 bg-white/70 rounded' /></div>
      </div>
    ),
    Container: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center`}>
        <div className='w-10 h-6 border-2 border-dashed border-gray-300 rounded flex items-center justify-center'><span className='text-[5px] text-gray-300'>+</span></div>
      </div>
    ),
    Grid: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center`}>
        <div className='w-10 h-6 grid grid-cols-2 grid-rows-2 gap-0.5'>
          <div className='bg-gray-300 rounded-sm' />
          <div className='bg-gray-300 rounded-sm' />
          <div className='bg-gray-300 rounded-sm' />
          <div className='bg-gray-300 rounded-sm' />
        </div>
      </div>
    ),
    Image: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center`}>
        <div className='w-10 h-6 bg-gray-200 rounded-sm flex items-center justify-center relative overflow-hidden'>
          <div className='absolute bottom-0 left-0 w-3 h-2 bg-gray-300 rounded-tr-full' />
          <div className='w-2 h-2 bg-gray-300 rounded-full absolute top-0.5 right-1' />
        </div>
      </div>
    ),
    Divider: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center`}>
        <div className='w-10 h-px bg-gray-400' />
      </div>
    ),
    Spacer: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center`}>
        <div className='flex flex-col items-center w-10 gap-0.5'>
          <div className='w-full h-px bg-gray-300 border-t border-dashed border-gray-400' />
          <span className='text-[5px] text-gray-400'>↕</span>
          <div className='w-full h-px bg-gray-300 border-t border-dashed border-gray-400' />
        </div>
      </div>
    ),
    Icon: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center`}>
        <div className='w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center'><div className='w-2 h-2 bg-gray-400 rounded-full' /></div>
      </div>
    ),
    SocialLinks: (
      <div className={`${tb} bg-gray-50 border-gray-200 items-center justify-center gap-1`}>
        <div className='w-3 h-3 bg-gray-200 rounded-full border border-gray-300' />
        <div className='w-3 h-3 bg-gray-200 rounded-full border border-gray-300' />
        <div className='w-3 h-3 bg-gray-200 rounded-full border border-gray-300' />
      </div>
    ),
  };

  return (
    <div className='space-y-4'>
      <div className='flex gap-6 border-b border-gray-200'>
        <button
          onClick={() => setActiveMainSection('secciones')}
          className={cn(
            'pb-2.5 text-sm font-medium transition-colors relative',
            activeMainSection === 'secciones'
              ? 'text-gray-900 border-b-[3px] border-gray-800 -mb-[2px]'
              : 'text-gray-400 hover:text-gray-600'
          )}
        >
          Secciones
        </button>
        <button
          onClick={() => setActiveMainSection('componentes')}
          className={cn(
            'pb-2.5 text-sm font-medium transition-colors relative',
            activeMainSection === 'componentes'
              ? 'text-gray-900 border-b-[3px] border-gray-800 -mb-[2px]'
              : 'text-gray-400 hover:text-gray-600'
          )}
        >
          Componentes
        </button>
      </div>

      {/* Drag hint */}
      {showDragHint && (
        <div className='bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5 flex items-center gap-2'>
          <div className='text-xs text-sky-600 flex-1'>
            <p>Arrastra un elemento a la página para agregarlo</p>
          </div>
          <button
            onClick={() => setShowDragHint(false)}
            className='text-sky-400 hover:text-sky-600 transition-colors shrink-0 mt-0.5'
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sections Content */}
      {activeMainSection === 'secciones' && (
        <div className='space-y-1'>
          {/* Pantalla Inicial */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsPantallaInicialOpen(!isPantallaInicialOpen)}
            >
              <span className='text-gray-900 font-semibold'>Pantalla inicial</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isPantallaInicialOpen && '-rotate-90'
                )}
              />
            </div>
            {isPantallaInicialOpen && (
              <div className='pl-3 mt-3'>
                {/* Bloque de 4 cabeceras en grid 2x2 */}
                <div className='flex flex-col gap-2'>
                  {/* Mega Cabecera (Navbar + Hero + Buscador) */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroMega
                          logoUrl={clientDefaults.logoUrl || ''}
                          ctaBgColor={clientDefaults.primaryColor}
                          searchButtonColor={clientDefaults.primaryColor}
                        />
                      )
                    }
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg cursor-move transition-all border hover:shadow-sm',
                      isComponentSelected('HeroMega')
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={`${tb} bg-gradient-to-br from-slate-600 to-slate-800 border-slate-700 flex-col items-stretch justify-between p-1 relative overflow-hidden`}>
                      <div className='flex items-center justify-between'>
                        <div className='w-2 h-1 bg-white/80 rounded-sm' />
                        <div className='flex gap-0.5'><div className='w-1 h-0.5 bg-white/50 rounded' /><div className='w-1 h-0.5 bg-white/50 rounded' /><div className='w-1 h-0.5 bg-white/50 rounded' /></div>
                      </div>
                      <div className='w-6 h-1.5 bg-white/80 rounded-sm' />
                      <div className='flex items-center gap-0.5'>
                        <div className='flex-1 h-1.5 bg-white rounded-sm' />
                        <div className='w-1.5 h-1.5 rounded-sm' style={{ backgroundColor: clientDefaults.primaryColor }} />
                      </div>
                    </div>
                    <div className='text-xs font-medium text-gray-600'>Mega cabecera + buscador</div>
                  </div>

                  {/* Cabecera Básica */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroBasic
                          title={clientDefaults.heroTitle}
                          subtitle={clientDefaults.heroSubtitle}
                          buttonText={clientDefaults.buttonText1}
                          buttonLink='#vehicles'
                          bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                          textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                          alignment='center'
                          buttonBgColor={clientDefaults.primaryColor}
                          buttonTextColor={clientDefaults.secondaryColor}
                        />
                      )
                    }
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg cursor-move transition-all border hover:shadow-sm',
                      isComponentSelected('HeroBasic')
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={`${tb} bg-gray-50 border-gray-200 flex-col items-center justify-center`}>
                      <div className='w-8 h-1 bg-gray-300 rounded' /><div className='w-5 h-0.5 bg-gray-200 rounded mt-0.5' /><div className='w-4 h-1.5 bg-gray-400 rounded-sm mt-0.5' />
                    </div>
                    <div className='text-xs font-medium text-gray-600'>Cabecera básica</div>
                  </div>

                  {/* Cabecera con Fondo */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroWithBackground
                          title={clientDefaults.heroTitle}
                          subtitle={clientDefaults.heroSubtitle}
                          buttonText={clientDefaults.buttonText1}
                          buttonLink='#vehicles'
                          buttonBgColor={clientDefaults.primaryColor}
                          buttonTextColor={clientDefaults.secondaryColor}
                          textColor='#ffffff'
                        />
                      )
                    }
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg cursor-move transition-all border hover:shadow-sm',
                      isComponentSelected('HeroWithBackground')
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={`${tb} bg-gradient-to-br from-gray-300 to-gray-400 border-gray-300 flex-col items-center justify-center`}>
                      <div className='w-8 h-1 bg-white/70 rounded' /><div className='w-5 h-0.5 bg-white/50 rounded mt-0.5' /><div className='w-4 h-1.5 bg-white/80 rounded-sm mt-0.5' />
                    </div>
                    <div className='text-xs font-medium text-gray-600'>Cabecera c/ fondo</div>
                  </div>

                  {/* Cabecera con Video */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroWithVideoEmbed
                          title={clientDefaults.heroTitle}
                          subtitle={clientDefaults.heroSubtitle}
                          buttonText={clientDefaults.buttonText1}
                          buttonLink='#vehicles'
                          buttonBgColor={clientDefaults.primaryColor}
                          buttonTextColor={clientDefaults.secondaryColor}
                          textColor='#ffffff'
                        />
                      )
                    }
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg cursor-move transition-all border hover:shadow-sm',
                      isComponentSelected('HeroWithVideoEmbed')
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={`${tb} bg-gradient-to-br from-slate-700 to-slate-900 border-slate-700 items-center justify-center relative`}>
                      <div className='w-3 h-3 rounded-full bg-white/20 flex items-center justify-center'>
                        <div className='w-0 h-0 border-l-[4px] border-l-white border-t-[2.5px] border-t-transparent border-b-[2.5px] border-b-transparent ml-0.5' />
                      </div>
                      <div className='absolute bottom-0.5 left-0.5 right-0.5 h-1 bg-white/40 rounded' />
                    </div>
                    <div className='text-xs font-medium text-gray-600'>Cabecera c/ video</div>
                  </div>

                  {/* Cabecera con Logo */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroWithLogo
                          backgroundImage='https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470'
                          backgroundImage2='https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1470'
                          backgroundImage3='https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1470'
                          backgroundImage4='https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1470'
                          logoText={clientDefaults.companyName || 'Automotora'}
                          logoUrl={clientDefaults.logoUrl || ''}
                          logoScale={1}
                          buttonText='Ver Stock Completo'
                          buttonLink='/vehicles'
                          buttonBgColor='#1e3a8a'
                          buttonTextColor='#ffffff'
                        />
                      )
                    }
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg cursor-move transition-all border hover:shadow-sm',
                      isComponentSelected('HeroWithLogo')
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={`${tb} bg-gray-800 border-gray-700 items-center`}>
                      <div className='flex-1 space-y-0.5'><div className='w-full h-1 bg-white/60 rounded' /><div className='w-3/4 h-0.5 bg-white/30 rounded' /><div className='w-4 h-1.5 bg-blue-500 rounded-sm mt-0.5' /></div>
                      <div className='w-4 h-full bg-gray-700 rounded-sm ml-1' />
                    </div>
                    <div className='text-xs font-medium text-gray-600'>Cabecera con Carrusel</div>
                  </div>

                  {/* Cabecera minimalista */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroMinimalistic
                          title={clientDefaults.heroTitle}
                          subtitle={clientDefaults.heroSubtitle}
                          buttonText1={clientDefaults.buttonText1}
                          buttonText2={clientDefaults.buttonText2}
                          buttonLink1='#vehicles'
                          buttonLink2='#contact'
                          bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                          textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                          buttonBgColor={clientDefaults.primaryColor}
                          buttonTextColor={clientDefaults.secondaryColor}
                        />
                      )
                    }
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg cursor-move transition-all border hover:shadow-sm',
                      isComponentSelected('HeroMinimalistic')
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={`${tb} bg-gray-50 border-gray-200 items-center gap-1`}>
                      <div className='flex-1 space-y-0.5'><div className='w-full h-1 bg-gray-300 rounded' /><div className='w-3/4 h-0.5 bg-gray-200 rounded' /><div className='flex gap-0.5 mt-0.5'><div className='w-3 h-1 bg-gray-400 rounded-sm' /><div className='w-3 h-1 bg-gray-200 rounded-sm border border-gray-300' /></div></div>
                      <div className='w-5 h-full bg-gray-200 rounded-sm' />
                    </div>
                    <div className='text-xs font-medium text-gray-600'>Cabecera minimalista</div>
                  </div>
                  {/* Hero Bienvenida (Tradicional) */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroWelcome
                          title='Bienvenido a'
                          highlightedText={clientDefaults.companyName}
                          subtitle='Encuentra tu próximo vehículo con nuestra búsqueda inteligente'
                          highlightColor={clientDefaults.primaryColor}
                          bgColor={dark ? '#141414' : '#ffffff'}
                          textColor={dark ? '#e5e5e5' : '#111827'}
                        />
                      )
                    }
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg cursor-move transition-all border hover:shadow-sm',
                      isComponentSelected('HeroWelcome')
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={`${tb} bg-gray-50 border-gray-200 flex-col items-center justify-center`}>
                      <div className='w-8 h-1 bg-gray-300 rounded' /><div className='w-5 h-0.5 bg-gray-200 rounded mt-0.5' />
                      <div className='w-10 h-1.5 bg-gray-100 rounded border border-gray-300 mt-1 flex items-center px-0.5'><div className='w-4 h-0.5 bg-gray-300 rounded' /></div>
                    </div>
                    <div className='text-xs font-medium text-gray-600'>Bienvenida con buscador</div>
                  </div>
                  {/* Hero Moderno */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroModerno accentColor={clientDefaults.primaryColor} bgColor={dark ? '#141414' : '#fbfbfd'} textColor={dark ? '#e5e5e5' : '#0f172a'} />
                      )
                    }
                    className={getComponentItemStyles('HeroModerno')}
                  >
                    {THUMBNAILS.HeroModerno}
                    <span className='text-xs font-medium text-gray-600'>Hero Moderno</span>
                  </div>
                  {/* Hero Premium */}
                  <div
                    ref={(ref) =>
                      connectors.create(
                        ref,
                        <HeroPremium accentColor={clientDefaults.primaryColor} />
                      )
                    }
                    className={getComponentItemStyles('HeroPremium')}
                  >
                    {THUMBNAILS.HeroPremium}
                    <span className='text-xs font-medium text-gray-600'>Hero Premium</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Características */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsCaracteristicasOpen(!isCaracteristicasOpen)}
            >
              <span className='text-gray-900 font-semibold'>Características</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isCaracteristicasOpen && '-rotate-90'
                )}
              />
            </div>
            {isCaracteristicasOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <WhyChooseUs iconColor={clientDefaults.primaryColor} bgColor={dark ? '#141414' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#111827'} cardBgColor={dark ? '#1c1c1c' : '#f9fafb'} />
                    )
                  }
                  className={getComponentItemStyles('WhyChooseUs')}
                >
                  {THUMBNAILS.WhyChooseUs}
                  <span className='text-xs font-medium text-gray-600'>¿Por qué elegirnos?</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <TraditionalWhyUs accentColor={clientDefaults.primaryColor} bgColor={dark ? '#0f172a' : '#ffffff'} textColor={dark ? '#e2e8f0' : '#1e293b'} />
                    )
                  }
                  className={getComponentItemStyles('TraditionalWhyUs')}
                >
                  {THUMBNAILS.TraditionalWhyUs}
                  <span className='text-xs font-medium text-gray-600'>¿Por qué elegirnos? Tradicional</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <FeatureShowcase accentColor={clientDefaults.primaryColor} />
                    )
                  }
                  className={getComponentItemStyles('FeatureShowcase')}
                >
                  {THUMBNAILS.FeatureShowcase}
                  <span className='text-xs font-medium text-gray-600'>Características Premium</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <FAQ accentColor={clientDefaults.primaryColor} bgColor={dark ? '#141414' : '#ffffff'} titleColor={dark ? '#e5e5e5' : '#111827'} questionColor={dark ? '#e5e5e5' : '#111827'} answerColor={dark ? '#a3a3a3' : '#6b7280'} />
                    )
                  }
                  className={getComponentItemStyles('FAQ')}
                >
                  {THUMBNAILS.FAQ}
                  <span className='text-xs font-medium text-gray-600'>Preguntas Frecuentes</span>
                </div>
              </div>
            )}
          </div>

          {/* Vehículos */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsVehiculosOpen(!isVehiculosOpen)}
            >
              <span className='text-gray-900 font-semibold'>Vehículos</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isVehiculosOpen && '-rotate-90'
                )}
              />
            </div>
            {isVehiculosOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <VehicleGrid
                        title='Nuestros vehículos'
                        subtitle='Explora nuestro inventario de vehículos disponibles'
                        bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                        textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                        columns={3}
                        showStatuses={['Publicado', 'Reservado']}
                        filterButtonColors={[
                          {
                            buttonBgColor: dark ? '#1c1c1c' : '#ffffff',
                            buttonTextColor: dark ? '#a3a3a3' : '#8c8c8c',
                            buttonBorderColor: dark ? '#2a2a2a' : '#454545',
                            activeButtonBgColor: clientDefaults.primaryColor,
                            activeButtonTextColor: '#ffffff',
                            activeButtonBorderColor: clientDefaults.primaryColor,
                            containerBgColor: dark ? '#1c1c1c' : '#ffffff',
                            containerBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
                          },
                        ]}
                        cardSettings={[
                          {
                            cardBgColor: dark ? '#1c1c1c' : '#ffffff',
                            cardBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
                            cardTextColor: dark ? '#e5e5e5' : '#1f2937',
                            cardPriceColor: dark ? '#ffffff' : '#ffffff',
                            cardButtonColor: clientDefaults.primaryColor,
                            cardButtonTextColor: '#ffffff',
                            detailsButtonText: 'Ver detalles',
                            bannerPosition: 'right',
                            pricePosition: 'overlay',
                            featuresConfig: {
                              feature1: 'category',
                              feature2: 'year',
                              feature3: 'fuel',
                              feature4: 'mileage',
                            },
                          },
                        ]}
                      />
                    )
                  }
                  className={getComponentItemStyles('VehicleGrid')}
                >
                  {THUMBNAILS.VehicleGrid}
                  <span className='text-xs font-medium text-gray-600'>Catálogo de Vehículos</span>
                </div>

                {/* VehicleGrid2 con título dinámico */}
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <VehicleGrid2
                        title={clientDefaults.companyName || 'Explora nuestro stock'}
                        subtitle=''
                        bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                        textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                        columns={3}
                        showStatuses={['Publicado', 'Reservado']}
                        cardSettings={[
                          {
                            cardBgColor: dark ? '#1c1c1c' : '#ffffff',
                            cardBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
                            cardTextColor: dark ? '#e5e5e5' : '#1f2937',
                            cardPriceColor: '#ffffff',
                            cardButtonColor: clientDefaults.primaryColor,
                            cardButtonTextColor: '#ffffff',
                            detailsButtonText: 'Ver detalles',
                            bannerPosition: 'right',
                            pricePosition: 'overlay',
                            featuresConfig: {
                              feature1: 'category',
                              feature2: 'year',
                              feature3: 'fuel',
                              feature4: 'mileage',
                            },
                          },
                        ]}
                      />
                    )
                  }
                  className={getComponentItemStyles('VehicleGrid2')}
                >
                  {THUMBNAILS.VehicleGrid2}
                  <span className='text-xs font-medium text-gray-600'>Buscador de Vehículos</span>
                </div>

                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <VehicleCarousel
                        title='Vehículos destacados'
                        subtitle='Descubre nuestra selección de vehículos'
                        bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                        textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                        buttonText='Ver todos'
                        buttonLink='/vehicles'
                        buttonBgColor={clientDefaults.primaryColor}
                        buttonTextColor={clientDefaults.secondaryColor}
                        autoplay={true}
                        showStatuses={['Publicado', 'Reservado']}
                        cardSettings={[
                          {
                            cardBgColor: dark ? '#1c1c1c' : clientDefaults.backgroundColor,
                            cardBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
                            cardTextColor: dark ? '#e5e5e5' : clientDefaults.textColor,
                            cardPriceColor: clientDefaults.primaryColor,
                            cardButtonColor: clientDefaults.primaryColor,
                            cardButtonTextColor: '#ffffff',
                            detailsButtonText: 'Ver detalles',
                            bannerPosition: 'right',
                            pricePosition: 'overlay',
                            featuresConfig: {
                              feature1: 'category',
                              feature2: 'year',
                              feature3: 'fuel',
                              feature4: 'mileage',
                            },
                          },
                        ]}
                      />
                    )
                  }
                  className={getComponentItemStyles('VehicleCarousel')}
                >
                  {THUMBNAILS.VehicleCarousel}
                  <span className='text-xs font-medium text-gray-600'>Carrusel de Vehículos</span>
                </div>

                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <VehicleCarousel
                        title='Recién vendidos'
                        subtitle='Conoce los autos que entregamos esta semana'
                        bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                        textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                        buttonText='Ver más'
                        buttonLink='/vehicles'
                        buttonBgColor={clientDefaults.primaryColor}
                        buttonTextColor={clientDefaults.secondaryColor}
                        autoplay={true}
                        mode='sold'
                        showStatuses={['Vendido']}
                        cardSettings={[
                          {
                            cardBgColor: dark ? '#1c1c1c' : clientDefaults.backgroundColor,
                            cardBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
                            cardTextColor: dark ? '#e5e5e5' : clientDefaults.textColor,
                            cardPriceColor: clientDefaults.primaryColor,
                            cardButtonColor: clientDefaults.primaryColor,
                            cardButtonTextColor: '#ffffff',
                            detailsButtonText: 'Ver detalles',
                            bannerPosition: 'right',
                            pricePosition: 'overlay',
                            featuresConfig: {
                              feature1: 'category',
                              feature2: 'year',
                              feature3: 'fuel',
                              feature4: 'mileage',
                            },
                          },
                        ]}
                      />
                    )
                  }
                  className={getComponentItemStyles('SoldVehiclesCarousel')}
                >
                  {THUMBNAILS.SoldVehiclesCarousel}
                  <span className='text-xs font-medium text-gray-600'>Carrusel de Vendidos</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <TraditionalVehicleGrid sectionBgColor={dark ? '#0f172a' : '#f8fafc'} cardBgColor={dark ? '#1e293b' : '#ffffff'} cardBorderColor={dark ? '#334155' : 'rgba(0,0,0,0.1)'} cardTitleColor={dark ? '#f1f5f9' : '#171717'} cardSubtitleColor={dark ? '#94a3b8' : '#525252'} cardSpecsColor={dark ? '#cbd5e1' : '#262626'} cardPriceColor={dark ? '#f1f5f9' : '#171717'} filterBarBgColor={dark ? '#1e293b' : '#ffffff'} filterBarBorderColor={dark ? '#334155' : '#e5e7eb'} filterTextColor={dark ? '#94a3b8' : '#374151'} />
                    )
                  }
                  className={getComponentItemStyles('TraditionalVehicleGrid')}
                >
                  {THUMBNAILS.TraditionalVehicleGrid}
                  <span className='text-xs font-medium text-gray-600'>Catálogo Tradicional</span>
                </div>
              </div>
            )}
          </div>

          {/* Galería y videos */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsGaleriaOpen(!isGaleriaOpen)}
            >
              <span className='text-gray-900 font-semibold'>Galería y videos</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isGaleriaOpen && '-rotate-90'
                )}
              />
            </div>
            {isGaleriaOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <PhotoGallery bgColor={dark ? '#141414' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#111827'} />)
                  }
                  className={getComponentItemStyles('PhotoGallery')}
                >
                  {THUMBNAILS.PhotoGallery}
                  <span className='text-xs font-medium text-gray-600'>Galería de fotos</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <ImageCarousel
                        sectionTitle='Galería'
                        bgColor={dark ? '#0a0a0a' : '#ffffff'}
                        textColor={dark ? '#ffffff' : '#111827'}
                      />
                    )
                  }
                  className={getComponentItemStyles('ImageCarousel')}
                >
                  {THUMBNAILS.ImageCarousel}
                  <span className='text-xs font-medium text-gray-600'>Carrusel de imágenes</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <GalleryPremium accentColor={clientDefaults.primaryColor} />
                    )
                  }
                  className={getComponentItemStyles('GalleryPremium')}
                >
                  {THUMBNAILS.GalleryPremium}
                  <span className='text-xs font-medium text-gray-600'>Galería Premium</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <VideoEmbed
                        videoUrl='https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                        title='Video Embed'
                        subtitle='Agrega un video de YouTube o Vimeo'
                        bgColor={dark ? '#141414' : '#f7fafc'}
                        textColor={dark ? '#e5e5e5' : '#1a202c'}
                      />
                    )
                  }
                  className={getComponentItemStyles('VideoEmbed')}
                >
                  {THUMBNAILS.VideoEmbed}
                  <span className='text-xs font-medium text-gray-600'>Video Incorporado</span>
                </div>
              </div>
            )}
          </div>

          {/* Contacto */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsContactoOpen(!isContactoOpen)}
            >
              <span className='text-gray-900 font-semibold'>Contacto</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isContactoOpen && '-rotate-90'
                )}
              />
            </div>
            {isContactoOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <HowToArrive
                        title='¿Cómo llegar?'
                        subtitle='Encuentranos en la siguiente dirección:'
                        height='400px'
                        bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                        textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                        iconColor={clientDefaults.primaryColor}
                        buttonBgColor={clientDefaults.primaryColor}
                      />
                    )
                  }
                  className={getComponentItemStyles('HowToArrive')}
                >
                  {THUMBNAILS.HowToArrive}
                  <span className='text-xs font-medium text-gray-600'>Cómo llegar</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <TraditionalHowToArrive bgColor={dark ? '#0f172a' : '#ffffff'} textColor={dark ? '#e2e8f0' : '#1e293b'} />
                    )
                  }
                  className={getComponentItemStyles('TraditionalHowToArrive')}
                >
                  {THUMBNAILS.TraditionalHowToArrive}
                  <span className='text-xs font-medium text-gray-600'>Cómo llegar Tradicional</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <FloatingWhatsApp />)
                  }
                  className={getComponentItemStyles('FloatingWhatsApp')}
                >
                  {THUMBNAILS.FloatingWhatsApp}
                  <span className='text-xs font-medium text-gray-600'>Botón flotante WhatsApp</span>
                </div>
              </div>
            )}
          </div>

          {/* Formularios */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsFormulariosOpen(!isFormulariosOpen)}
            >
              <span className='text-gray-900 font-semibold'>Formularios</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isFormulariosOpen && '-rotate-90'
                )}
              />
            </div>
            {isFormulariosOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <WeSearchFormEmbed
                        title='Buscamos por Ti'
                        subtitle='Cuéntanos qué vehículo buscas y nuestro equipo se encargará de encontrarlo.'
                        bgColor={dark ? '#141414' : '#ffffff'}
                        textColor={dark ? '#e5e5e5' : '#111827'}
                        accentColor={clientDefaults.primaryColor}
                        formFields={WE_SEARCH_DEFAULT_FIELDS}
                      />
                    )
                  }
                  className={getComponentItemStyles('WeSearchFormEmbed')}
                >
                  <div className={`${tb} bg-gray-50 border-gray-200 flex-col justify-center gap-0.5`}>
                    <div className='w-8 h-0.5 bg-gray-300 rounded mx-auto mb-0.5' />
                    <div className='w-full h-1 bg-gray-200 rounded border border-gray-300' />
                    <div className='w-full h-1 bg-gray-200 rounded border border-gray-300' />
                    <div className='w-5 h-1 rounded-sm mx-auto mt-0.5' style={{ backgroundColor: clientDefaults.primaryColor }} />
                  </div>
                  <span className='text-xs font-medium text-gray-600'>Buscamos por ti (Automatch)</span>
                </div>
              </div>
            )}
          </div>

          {/* Marketing */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsMarketingOpen(!isMarketingOpen)}
            >
              <span className='text-gray-900 font-semibold'>Marketing</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isMarketingOpen && '-rotate-90'
                )}
              />
            </div>
            {isMarketingOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <StatsCounter bgColor={dark ? '#1c1c1c' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#111827'} accentColor={clientDefaults.primaryColor} />)
                  }
                  className={getComponentItemStyles('StatsCounter')}
                >
                  {THUMBNAILS.StatsCounter}
                  <span className='text-xs font-medium text-gray-600'>Contador de estadísticas</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <StatsModerno accentColor={clientDefaults.primaryColor} bgColor={dark ? '#1c1c1c' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#0f172a'} />
                    )
                  }
                  className={getComponentItemStyles('StatsModerno')}
                >
                  {THUMBNAILS.StatsModerno}
                  <span className='text-xs font-medium text-gray-600'>Estadísticas Moderno</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <PromoBanner />)
                  }
                  className={getComponentItemStyles('PromoBanner')}
                >
                  {THUMBNAILS.PromoBanner}
                  <span className='text-xs font-medium text-gray-600'>Banner promocional</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <LogoCloud bgColor={dark ? '#141414' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#111827'} />)
                  }
                  className={getComponentItemStyles('LogoCloud')}
                >
                  {THUMBNAILS.LogoCloud}
                  <span className='text-xs font-medium text-gray-600'>Grilla de logos</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <LogoMarquee bgColor={dark ? '#141414' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#111827'} />)
                  }
                  className={getComponentItemStyles('LogoMarquee')}
                >
                  {THUMBNAILS.LogoMarquee}
                  <span className='text-xs font-medium text-gray-600'>Marquesina de logos</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <LogoGrid bgColor={dark ? '#141414' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#111827'} accentColor={clientDefaults.primaryColor} />)
                  }
                  className={getComponentItemStyles('LogoGrid')}
                >
                  {THUMBNAILS.LogoGrid}
                  <span className='text-xs font-medium text-gray-600'>Logos por categoría</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <AwardsBadges
                        bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                        textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                        accentColor={clientDefaults.primaryColor}
                        cardBgColor={dark ? '#1c1c1c' : '#ffffff'}
                      />
                    )
                  }
                  className={getComponentItemStyles('AwardsBadges')}
                >
                  {THUMBNAILS.AwardsBadges}
                  <span className='text-xs font-medium text-gray-600'>Reconocimientos y badges</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <TrustBadges
                        bgColor={dark ? '#141414' : clientDefaults.backgroundColor}
                        textColor={dark ? '#e5e5e5' : clientDefaults.textColor}
                        accentColor={clientDefaults.primaryColor}
                        cardBgColor={dark ? '#1c1c1c' : '#ffffff'}
                      />
                    )
                  }
                  className={getComponentItemStyles('TrustBadges')}
                >
                  {THUMBNAILS.TrustBadges}
                  <span className='text-xs font-medium text-gray-600'>Sellos de confianza</span>
                </div>
              </div>
            )}
          </div>

          {/* Testimonios */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsTestimoniosOpen(!isTestimoniosOpen)}
            >
              <span className='text-gray-900 font-semibold'>Testimonios</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isTestimoniosOpen && '-rotate-90'
                )}
              />
            </div>
            {isTestimoniosOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <Testimonials starColor='#f59e0b' bgColor={dark ? '#141414' : '#ffffff'} titleColor={dark ? '#f5f5f5' : '#111827'} cardBgColor={dark ? '#1c1c1c' : '#f9fafb'} nameColor={dark ? '#f5f5f5' : '#111827'} roleColor={dark ? '#737373' : '#6b7280'} testimonialColor={dark ? '#a3a3a3' : '#374151'} />
                    )
                  }
                  className={getComponentItemStyles('Testimonials')}
                >
                  {THUMBNAILS.Testimonials}
                  <span className='text-xs font-medium text-gray-600'>Testimonios</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <TestimonialsModerno bgColor={dark ? '#141414' : '#fbfbfd'} cardBgColor={dark ? '#1c1c1c' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#0f172a'} />)
                  }
                  className={getComponentItemStyles('TestimonialsModerno')}
                >
                  {THUMBNAILS.TestimonialsModerno}
                  <span className='text-xs font-medium text-gray-600'>Testimonios Moderno</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <TestimonialsPremium accentColor={clientDefaults.primaryColor} />
                    )
                  }
                  className={getComponentItemStyles('TestimonialsPremium')}
                >
                  {THUMBNAILS.TestimonialsPremium}
                  <span className='text-xs font-medium text-gray-600'>Testimonios Premium</span>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsCtaOpen(!isCtaOpen)}
            >
              <span className='text-gray-900 font-semibold'>CTA</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isCtaOpen && '-rotate-90'
                )}
              />
            </div>
            {isCtaOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <ContactCTA
                        buttonBgColor={clientDefaults.primaryColor}
                        buttonTextColor='#ffffff'
                        bgColor={dark ? '#141414' : '#ffffff'}
                        textColor={dark ? '#ffffff' : '#ffffff'}
                      />
                    )
                  }
                  className={getComponentItemStyles('ContactCTA')}
                >
                  {THUMBNAILS.ContactCTA}
                  <span className='text-xs font-medium text-gray-600'>Llamada a la acción</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <TraditionalContactCTA buttonColor={clientDefaults.primaryColor} bgColor={dark ? '#0f172a' : '#ffffff'} textColor={dark ? '#e2e8f0' : '#1e293b'} />
                    )
                  }
                  className={getComponentItemStyles('TraditionalContactCTA')}
                >
                  {THUMBNAILS.TraditionalContactCTA}
                  <span className='text-xs font-medium text-gray-600'>CTA Contacto Tradicional</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <CTAModerno accentColor={clientDefaults.primaryColor} bgColor={dark ? '#141414' : undefined} />
                    )
                  }
                  className={getComponentItemStyles('CTAModerno')}
                >
                  {THUMBNAILS.CTAModerno}
                  <span className='text-xs font-medium text-gray-600'>CTA Moderno</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(
                      ref,
                      <CTAPremium accentColor={clientDefaults.primaryColor} />
                    )
                  }
                  className={getComponentItemStyles('CTAPremium')}
                >
                  {THUMBNAILS.CTAPremium}
                  <span className='text-xs font-medium text-gray-600'>CTA Premium</span>
                </div>
              </div>
            )}
          </div>

          {/* Equipo */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsEquipoOpen(!isEquipoOpen)}
            >
              <span className='text-gray-900 font-semibold'>Equipo</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isEquipoOpen && '-rotate-90'
                )}
              />
            </div>
            {isEquipoOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <TeamMembers bgColor={dark ? '#141414' : '#ffffff'} textColor={dark ? '#e5e5e5' : '#111827'} />)
                  }
                  className={getComponentItemStyles('TeamMembers')}
                >
                  {THUMBNAILS.TeamMembers}
                  <span className='text-xs font-medium text-gray-600'>Equipo</span>
                </div>
              </div>
            )}
          </div>

          {/* Layout */}
          <div>
            <div
              className='flex items-center justify-between py-2 px-2 text-xs hover:bg-gray-50 rounded-md cursor-pointer transition-colors'
              onClick={() => setIsLayoutOpen(!isLayoutOpen)}
            >
              <span className='text-gray-900 font-semibold'>Layout</span>
              <ChevronDown
                size={18}
                className={cn(
                  'text-gray-400 transition-transform',
                  !isLayoutOpen && '-rotate-90'
                )}
              />
            </div>
            {isLayoutOpen && (
              <div className='pl-3 space-y-2 mt-2'>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <BuilderNavbar bgColor={dark ? '#141414' : '#ffffff'} textColor={dark ? '#d4d4d4' : '#4b5563'} />)
                  }
                  className={getComponentItemStyles('BuilderNavbar')}
                >
                  {THUMBNAILS.BuilderNavbar}
                  <span className='text-xs font-medium text-gray-600'>Barra de navegación</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <NavbarSimple bgColor={dark ? '#141414' : '#ffffff'} textColor={dark ? '#d4d4d4' : '#4b5563'} />)
                  }
                  className={getComponentItemStyles('NavbarSimple')}
                >
                  {THUMBNAILS.NavbarSimple}
                  <span className='text-xs font-medium text-gray-600'>Barra de navegación (sin logo)</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <Footer bgColor={dark ? '#141414' : '#f9fafb'} textColor={dark ? '#737373' : '#6b7280'} headingColor={dark ? '#e5e5e5' : '#111827'} dividerColor={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'} socialIconBgColor={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'} />)
                  }
                  className={getComponentItemStyles('Footer')}
                >
                  {THUMBNAILS.Footer}
                  <span className='text-xs font-medium text-gray-600'>Footer</span>
                </div>
                <div
                  ref={(ref) =>
                    connectors.create(ref, <FooterModerno bgColor={dark ? '#141414' : '#f9fafb'} textColor={dark ? '#737373' : '#6b7280'} headingColor={dark ? '#e5e5e5' : '#111827'} dividerColor={dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'} socialIconBgColor={dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} />)
                  }
                  className={getComponentItemStyles('FooterModerno')}
                >
                  {THUMBNAILS.FooterModerno}
                  <span className='text-xs font-medium text-gray-600'>Footer Moderno</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Components Content */}
      {activeMainSection === 'componentes' && (
        <div className='space-y-1'>
          <div
            ref={(ref) => connectors.create(ref, <Text text='Nuevo texto' />)}
            className={getComponentItemStyles('Text')}
          >
            {THUMBNAILS.Text}
            <span className='text-xs font-medium text-gray-600'>Texto</span>
          </div>
          <div
            ref={(ref) => connectors.create(ref, <Heading text='Nuevo título' />)}
            className={getComponentItemStyles('Heading')}
          >
            {THUMBNAILS.Heading}
            <span className='text-xs font-medium text-gray-600'>Encabezado</span>
          </div>
          <div
            ref={(ref) => connectors.create(ref, <Button text='Click aquí' />)}
            className={getComponentItemStyles('Button')}
          >
            {THUMBNAILS.Button}
            <span className='text-xs font-medium text-gray-600'>Botón</span>
          </div>
          <div
            ref={(ref) =>
              connectors.create(
                ref,
                <Element canvas is={Container} padding={20} background='#ffffff'>
                  <Text text='Contenido del contenedor' />
                </Element>
              )
            }
            className={getComponentItemStyles('Container')}
          >
            {THUMBNAILS.Container}
            <span className='text-xs font-medium text-gray-600'>Contenedor</span>
          </div>
          <div
            ref={(ref) =>
              connectors.create(
                ref,
                <Element canvas is={Grid} columns={3} />
              )
            }
            className={getComponentItemStyles('Grid')}
          >
            {THUMBNAILS.Grid}
            <span className='text-xs font-medium text-gray-600'>Grilla</span>
          </div>
          <div
            ref={(ref) => connectors.create(ref, <Image />)}
            className={getComponentItemStyles('Image')}
          >
            {THUMBNAILS.Image}
            <span className='text-xs font-medium text-gray-600'>Imagen</span>
          </div>
          <div
            ref={(ref) => connectors.create(ref, <Divider />)}
            className={getComponentItemStyles('Divider')}
          >
            {THUMBNAILS.Divider}
            <span className='text-xs font-medium text-gray-600'>Divisor</span>
          </div>
          <div
            ref={(ref) => connectors.create(ref, <Spacer />)}
            className={getComponentItemStyles('Spacer')}
          >
            {THUMBNAILS.Spacer}
            <span className='text-xs font-medium text-gray-600'>Espaciador</span>
          </div>
          <div
            ref={(ref) => connectors.create(ref, <Icon />)}
            className={getComponentItemStyles('Icon')}
          >
            {THUMBNAILS.Icon}
            <span className='text-xs font-medium text-gray-600'>Icono</span>
          </div>
          <div
            ref={(ref) => connectors.create(ref, <SocialLinks />)}
            className={getComponentItemStyles('SocialLinks')}
          >
            {THUMBNAILS.SocialLinks}
            <span className='text-xs font-medium text-gray-600'>Redes sociales</span>
          </div>
        </div>
      )}
    </div>
  );
};
