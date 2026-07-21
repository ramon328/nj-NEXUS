import React, { useState } from 'react';
import { useEditor } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsManager, type SettingField } from './settings/SettingsManager';
import {
  textSettings,
  containerSettings,
  imageSettings,
  heroBasicSettings,
  heroWithCardSettings,
  heroWithBackgroundSettings,
  heroMinimalisticSettings,
  heroWithLogoSettings,
  heroWithVideoEmbedSettings,
  heroMegaSettings,
  whyChooseUsSettings,
  faqSettings,
  testimonialsSettings,
  howToArriveSettings,
  vehicleCarouselSettings,
  vehicleGridSettings,
  contactCTASettings,
  vehicleGrid2Settings,
  heroWelcomeSettings,
  buttonSettings,
  headingSettings,
  dividerSettings,
  spacerSettings,
  socialLinksSettings,
  iconSettings,
  footerSettings,
  statsCounterSettings,
  promoBannerSettings,
  awardsBadgesSettings,
  trustBadgesSettings,
  floatingWhatsAppSettings,
  photoGallerySettings,
  imageCarouselSettings,
  teamMembersSettings,
  heroModernoSettings,
  statsModernoSettings,
  testimonialsModernoSettings,
  ctaModernoSettings,
  footerModernoSettings,
  traditionalWhyUsSettings,
  traditionalContactCTASettings,
  traditionalHowToArriveSettings,
  traditionalVehicleGridSettings,
  heroPremiumSettings,
  featureShowcaseSettings,
  testimonialsPremiumSettings,
  galleryPremiumSettings,
  ctaPremiumSettings,
  builderNavbarSettings,
  navbarSimpleSettings,
  financingFormEmbedSettings,
  consignmentsFormEmbedSettings,
  buyDirectFormEmbedSettings,
  weSearchFormEmbedSettings,
  contactFormEmbedSettings,
  aboutContentEmbedSettings,
  gridSettings,
} from './settings/componentSettings';
import { VideoEmbedSettings } from '@/components/builder2/settings/VideoEmbedSettings';
import { LogoCloudSettings } from '@/components/builder2/sections/marketing/LogoCloud';
import { LogoMarqueeSettings } from '@/components/builder2/sections/marketing/LogoMarquee';
import { LogoGridSettings } from '@/components/builder2/sections/marketing/LogoGrid';

export const SettingsPanel = () => {
  const { client } = useAuth();

  const { selected, selectedNodeName, nodeId, actions } = useEditor((state) => {
    let nodeName = '';
    let nodeProps = {};
    let selectedNodeId = '';

    if (state.events.selected) {
      const nodeIds = Array.from(state.events.selected);
      if (nodeIds.length) {
        const currentNode = state.nodes[nodeIds[0]];
        if (currentNode) {
          nodeName = currentNode.data.name;
          nodeProps = currentNode.data.props || {};
          selectedNodeId = nodeIds[0];
        }
      }
    }
    return {
      selected: nodeProps,
      selectedNodeName: nodeName,
      nodeId: selectedNodeId,
    };
  });

  const settingsMap: Record<string, React.ElementType | SettingField[]> = {
    Text: textSettings,
    Container: containerSettings,
    Grid: gridSettings,
    Image: imageSettings,
    HeroBasic: heroBasicSettings(client),
    HeroWithCard: heroWithCardSettings(client),
    HeroWithBackground: heroWithBackgroundSettings(client),
    HeroMinimalistic: heroMinimalisticSettings(client),
    HeroWithLogo: heroWithLogoSettings(client),
    HeroWelcome: heroWelcomeSettings(client),
    HeroWithVideoEmbed: heroWithVideoEmbedSettings(client),
    HeroMega: heroMegaSettings(client),
    WhyChooseUs: whyChooseUsSettings(client),
    FAQ: faqSettings(client),
    Testimonials: testimonialsSettings(client),
    HowToArrive: howToArriveSettings(client),
    VehicleCarousel: vehicleCarouselSettings(client),
    VehicleGrid: vehicleGridSettings(client),
    VehicleGrid2: vehicleGrid2Settings(client),
    ContactCTA: contactCTASettings(client),
    VideoEmbed: VideoEmbedSettings,
    // New base components
    Button: buttonSettings,
    Heading: headingSettings,
    Divider: dividerSettings,
    Spacer: spacerSettings,
    SocialLinks: socialLinksSettings,
    Icon: iconSettings,
    // Moderna sections
    HeroModerno: heroModernoSettings(client),
    StatsModerno: statsModernoSettings(client),
    TestimonialsModerno: testimonialsModernoSettings(client),
    CTAModerno: ctaModernoSettings(client),
    FooterModerno: footerModernoSettings(client),
    // Premium sections
    HeroPremium: heroPremiumSettings(client),
    FeatureShowcase: featureShowcaseSettings(client),
    TestimonialsPremium: testimonialsPremiumSettings(client),
    GalleryPremium: galleryPremiumSettings(client),
    CTAPremium: ctaPremiumSettings(client),
    // Traditional sections
    TraditionalVehicleGrid: traditionalVehicleGridSettings(client),
    TraditionalWhyUs: traditionalWhyUsSettings(client),
    TraditionalContactCTA: traditionalContactCTASettings(client),
    TraditionalHowToArrive: traditionalHowToArriveSettings(client),
    // Layout sections
    BuilderNavbar: builderNavbarSettings(client),
    NavbarSimple: navbarSimpleSettings(client),
    Footer: footerSettings(client),
    StatsCounter: statsCounterSettings(client),
    PromoBanner: promoBannerSettings(client),
    LogoCloud: LogoCloudSettings,
    LogoMarquee: LogoMarqueeSettings,
    LogoGrid: LogoGridSettings,
    AwardsBadges: awardsBadgesSettings(client),
    TrustBadges: trustBadgesSettings(client),
    FloatingWhatsApp: floatingWhatsAppSettings(),
    PhotoGallery: photoGallerySettings,
    ImageCarousel: imageCarouselSettings,
    TeamMembers: teamMembersSettings,
    // Form embed sections
    FinancingFormEmbed: financingFormEmbedSettings(client),
    ConsignmentsFormEmbed: consignmentsFormEmbedSettings(client),
    BuyDirectFormEmbed: buyDirectFormEmbedSettings(client),
    WeSearchFormEmbed: weSearchFormEmbedSettings(client),
    ContactFormEmbed: contactFormEmbedSettings(client),
    AboutContentEmbed: aboutContentEmbedSettings(client),
  };

  const CurrentSettings = selectedNodeName
    ? settingsMap[selectedNodeName]
    : null;

  const handleReset = () => {
    if (nodeId && actions) {
      const node = actions.getNode(nodeId);
      if (node) {
        const component = node.get().data.type;
        if (component && component.craft && component.craft.props) {
          const defaultProps = component.craft.props;
          for (const key in defaultProps) {
            actions.setProp(
              nodeId,
              (props: any) => (props[key] = defaultProps[key])
            );
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (nodeId && actions) {
      actions.delete(nodeId);
    }
  };

  const [showInlineHint, setShowInlineHint] = useState(true);

  return (
    <div className='bg-white'>
      {selectedNodeName && nodeId ? (
        <div className='space-y-3'>
          {/* Header */}
          <div className='flex justify-between items-center rounded-lg p-2.5 border border-gray-200 bg-gray-50'>
            <div>
              <p className='text-xs font-medium text-gray-900'>
                {selectedNodeName}
              </p>
              <p className='text-[11px] text-gray-400'>
                Configuración del elemento
              </p>
            </div>
            <Button
              onClick={handleDelete}
              variant='ghost'
              size='sm'
              className='shrink-0 h-8 px-2.5 gap-1 text-xs font-semibold text-red-600 border border-red-200 hover:text-white hover:bg-red-500'
              title='Eliminar este componente'
            >
              <span className='text-base leading-none'>×</span> Eliminar
            </Button>
          </div>

          {/* Settings Content */}
          <div className='border border-gray-100 rounded-lg p-3'>
            {CurrentSettings ? (
              <>
                {React.createElement(
                  typeof CurrentSettings === 'function'
                    ? CurrentSettings
                    : SettingsManager,
                  {
                    nodeId: nodeId,
                    selected: selected,
                    fields:
                      typeof CurrentSettings === 'function'
                        ? undefined
                        : CurrentSettings,
                  }
                )}
              </>
            ) : (
              <div className='text-center py-3'>
                <p className='text-xs text-gray-500'>
                  No hay configuraciones disponibles para este elemento.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='space-y-3'>
          {showInlineHint && (
            <div className='relative bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-left'>
              <button
                onClick={() => setShowInlineHint(false)}
                className='absolute top-1.5 right-1.5 text-sky-400 hover:text-sky-600 transition-colors'
                aria-label='Cerrar'
              >
                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' /></svg>
              </button>
              <p className='text-xs font-medium text-sky-800 mb-1.5'>
                Edición inline
              </p>
              <div className='space-y-1.5'>
                <div className='flex items-start gap-2'>
                  <span className='text-sky-500 text-sm mt-px'>1.</span>
                  <p className='text-[11px] text-sky-700'>
                    Haz <span className='font-bold'>clic</span> en cualquier texto para editarlo directamente
                  </p>
                </div>
                <div className='flex items-start gap-2'>
                  <span className='text-sky-500 text-sm mt-px'>2.</span>
                  <p className='text-[11px] text-sky-700'>
                    <span className='font-bold'>Selecciona</span> texto con el cursor para cambiar su color
                  </p>
                </div>
                <div className='mt-1.5 flex items-center gap-1.5 justify-center'>
                  <div className='w-3 h-3 rounded-full bg-red-400' />
                  <div className='w-3 h-3 rounded-full bg-blue-400' />
                  <div className='w-3 h-3 rounded-full bg-green-400' />
                  <div className='w-3 h-3 rounded-full bg-purple-400' />
                </div>
              </div>
            </div>
          )}

          <div className='text-center py-2'>
            <div className='space-y-1'>
              <p className='text-xs text-gray-500 font-medium'>
                Sin elemento seleccionado
              </p>
              <p className='text-[11px] text-gray-400'>
                Haz clic en una sección para configurarla
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
