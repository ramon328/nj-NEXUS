import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { builderTemplates } from './templates/builderTemplates';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Editor, Frame } from '@craftjs/core';
import { useAuth } from '@/contexts/AuthContext';

// Import all components needed for the resolver
import { Text } from './userComponents/Text';
import { Container } from './userComponents/Container';
import { Image } from './userComponents/Image';
import {
  HeroBasic, HeroWithBackground, HeroMinimalistic, HeroWithLogo, HeroWelcome,
  VehicleGrid, VehicleCarousel, WhyChooseUs, FAQ, Testimonials,
  HowToArrive, ContactCTA, VideoEmbed, VehicleGrid2,
  TraditionalVehicleGrid, TraditionalWhyUs, TraditionalContactCTA, TraditionalHowToArrive,
  Footer, StatsCounter, PromoBanner, PhotoGallery, TeamMembers,
  HeroModerno, StatsModerno, TestimonialsModerno, CTAModerno, FooterModerno,
} from './sections';
import { BuilderNavbar } from './sections/layout/BuilderNavbar';
import { HeroPremium } from './sections/premium/HeroPremium';
import { FeatureShowcase } from './sections/premium/FeatureShowcase';
import { TestimonialsPremium } from './sections/premium/TestimonialsPremium';
import { GalleryPremium } from './sections/premium/GalleryPremium';
import { CTAPremium } from './sections/premium/CTAPremium';

interface TemplateSelectorModalProps {
  open: boolean;
  onSelect: (templateId: string) => void;
  onClose?: () => void;
  colorScheme?: 'LIGHT' | 'DARK';
}

const templateMeta: Record<string, { badge: string; badgeColor: string }> = {
  tradicional: { badge: 'Recomendada', badgeColor: 'bg-green-500' },
  moderna: { badge: 'Popular', badgeColor: 'bg-blue-500' },
  premium: { badge: 'Completa', badgeColor: 'bg-purple-500' },
  minimalista: { badge: 'Elegante', badgeColor: 'bg-gray-700' },
};

// Mini resolver for preview rendering
const previewResolver = {
  Text, Container, Image,
  HeroBasic, HeroWithBackground, HeroMinimalistic, HeroWithLogo, HeroWelcome,
  VehicleGrid, VehicleCarousel, VehicleGrid2,
  WhyChooseUs, FAQ, Testimonials,
  HowToArrive, ContactCTA, VideoEmbed,
  BuilderNavbar,
  Footer, StatsCounter, PromoBanner, PhotoGallery, TeamMembers,
  TraditionalVehicleGrid, TraditionalWhyUs, TraditionalContactCTA, TraditionalHowToArrive,
  HeroModerno, StatsModerno, TestimonialsModerno, CTAModerno, FooterModerno,
  HeroPremium, FeatureShowcase, TestimonialsPremium, GalleryPremium, CTAPremium,
  div: 'div',
};

const TemplatePreview = ({ templateId, client, colorScheme }: { templateId: string; client: any; colorScheme?: 'LIGHT' | 'DARK' }) => {
  const template = builderTemplates.find((t) => t.id === templateId);
  if (!template) return null;

  const state = template.getState(client, colorScheme);

  return (
    <div className="w-full overflow-hidden bg-white" style={{ height: '520px' }}>
      <div
        style={{
          transform: 'scale(0.28)',
          transformOrigin: 'top left',
          width: '357%',
          height: '357%',
          pointerEvents: 'none',
        }}
      >
        <Editor resolver={previewResolver} enabled={false}>
          <Frame data={state} />
        </Editor>
      </div>
    </div>
  );
};

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  open,
  onSelect,
  onClose,
  colorScheme,
}) => {
  const { client } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeTemplate = builderTemplates[activeIndex];
  const meta = templateMeta[activeTemplate?.id] || templateMeta.tradicional;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setTimeout(() => onSelect(id), 200);
  };

  const goNext = () => setActiveIndex((i) => (i + 1) % builderTemplates.length);
  const goPrev = () => setActiveIndex((i) => (i - 1 + builderTemplates.length) % builderTemplates.length);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && onClose) onClose(); }}>
      <DialogContent
        className='max-w-5xl max-h-[92vh] overflow-hidden p-0 gap-0'
      >
        {/* Header */}
        <div className='px-8 pt-6 pb-3 border-b border-gray-100'>
          <DialogHeader>
            <DialogTitle className='text-2xl font-bold text-center text-gray-900'>
              Elige el diseño de tu sitio web
            </DialogTitle>
            <DialogDescription className='text-center text-gray-500 mt-1'>
              Cada plantilla es completamente personalizable. Puedes cambiar todo después.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Main content */}
        <div className='flex flex-1 overflow-hidden' style={{ height: 'calc(92vh - 140px)' }}>
          {/* Template list - left side */}
          <div className='w-[220px] border-r border-gray-100 bg-gray-50/50 overflow-y-auto flex-shrink-0 p-3 space-y-2'>
            {builderTemplates.map((template, index) => {
              const tmeta = templateMeta[template.id] || templateMeta.tradicional;
              const isActive = index === activeIndex;
              const isSelected = selectedId === template.id;

              return (
                <button
                  key={template.id}
                  className={`
                    w-full text-left rounded-xl p-3 transition-all duration-200 border-2 relative
                    ${isActive
                      ? 'bg-white border-blue-500 shadow-md'
                      : 'bg-white/60 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'
                    }
                  `}
                  onClick={() => setActiveIndex(index)}
                >
                  {isSelected && (
                    <div className='absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center'>
                      <Check size={12} className='text-white' />
                    </div>
                  )}
                  <div className='flex items-center gap-2 mb-1'>
                    <span className={`w-2 h-2 rounded-full ${tmeta.badgeColor}`} />
                    <span className='font-semibold text-sm text-gray-900'>{template.name}</span>
                  </div>
                  <p className='text-[11px] text-gray-500 leading-snug'>{template.description}</p>
                </button>
              );
            })}
          </div>

          {/* Preview - right side */}
          <div className='flex-1 flex flex-col overflow-hidden'>
            {/* Preview header */}
            <div className='flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white'>
              <div className='flex items-center gap-3'>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${meta.badgeColor}`}>
                  {meta.badge}
                </span>
                <h3 className='font-bold text-lg text-gray-900'>{activeTemplate.name}</h3>
              </div>
              <div className='flex items-center gap-2'>
                <button onClick={goPrev} className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors'>
                  <ChevronLeft size={18} className='text-gray-500' />
                </button>
                <span className='text-xs text-gray-400 min-w-[40px] text-center'>
                  {activeIndex + 1} / {builderTemplates.length}
                </span>
                <button onClick={goNext} className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors'>
                  <ChevronRight size={18} className='text-gray-500' />
                </button>
              </div>
            </div>

            {/* Preview area — all 4 rendered at once, only active visible */}
            <div className='flex-1 overflow-hidden bg-gray-100 relative'>
              {builderTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className='absolute inset-0 p-4 overflow-y-auto'
                  style={{
                    visibility: index === activeIndex ? 'visible' : 'hidden',
                    zIndex: index === activeIndex ? 1 : 0,
                  }}
                >
                  <div className='bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mx-auto max-w-[700px]'>
                    <TemplatePreview templateId={template.id} client={client} colorScheme={colorScheme} />
                  </div>
                </div>
              ))}
            </div>

            {/* Action bar */}
            <div className='px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between'>
              <p className='text-sm text-gray-500'>
                {activeTemplate.sections.length} secciones incluidas
              </p>
              <Button
                size='lg'
                className={`
                  px-8 transition-all duration-200
                  ${selectedId === activeTemplate.id
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                  } text-white
                `}
                onClick={() => handleSelect(activeTemplate.id)}
              >
                {selectedId === activeTemplate.id ? 'Aplicando...' : `Usar "${activeTemplate.name}"`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
