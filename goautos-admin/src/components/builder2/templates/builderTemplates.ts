import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import type { PageSlug } from '../constants/builderPages';

export type ColorScheme = 'LIGHT' | 'DARK';

export interface BuilderTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  getState: (client: any, colorScheme?: ColorScheme) => Record<string, any>;
  getPageState?: (page: PageSlug, client: any, colorScheme?: ColorScheme) => Record<string, any> | null;
}

const makeRoot = (nodeIds: string[]) => ({
  ROOT: {
    type: { resolvedName: 'div' },
    isCanvas: true,
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
        width: '100%',
      },
    },
    displayName: 'App Canvas',
    custom: { displayName: 'App Canvas' },
    parent: null,
    hidden: false,
    nodes: nodeIds,
    linkedNodes: {},
  },
});

const makeNode = (
  id: string,
  resolvedName: string,
  props: Record<string, any>,
  isCanvas = false
) => ({
  [id]: {
    type: { resolvedName },
    isCanvas,
    props,
    displayName: resolvedName,
    custom: {},
    parent: 'ROOT',
    hidden: false,
    nodes: [],
    linkedNodes: {},
  },
});

// ── Theme helpers ──
const isDark = (scheme?: ColorScheme) => scheme === 'DARK';

// ── Shared node builders ──

const heroWelcomeNode = (_d: ReturnType<typeof getPersonalizedDefaults>, scheme?: ColorScheme) =>
  makeNode('HeroWelcome', 'HeroWelcome', {
    title: 'Encuentra tu próximo vehículo en',
    highlightedText: '',
    subtitle: 'Describe el vehículo de tus sueños y deja que nuestra IA encuentre las mejores opciones para ti.',
    searchPlaceholder: 'Toyota Corolla blanco',
    bgColor: isDark(scheme) ? '#141414' : '#ffffff',
    textColor: isDark(scheme) ? '#e5e5e5' : '#111827',
    highlightColor: '',
  });

const heroBasicNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('HeroBasic', 'HeroBasic', {
    title: d.heroTitle,
    subtitle: d.heroSubtitle,
    buttonText: d.buttonText1,
    buttonLink: '#vehicles',
    buttonTextSecondary: d.buttonText2,
    buttonLinkSecondary: '#contact',
    bgColor: d.backgroundColor,
    textColor: d.textColor,
    buttonBgColor: d.primaryColor,
    buttonTextColor: d.secondaryColor,
    alignment: 'center',
  });

const heroWithBackgroundNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('HeroWithBackground', 'HeroWithBackground', {
    title: d.heroTitle,
    subtitle: d.heroSubtitle,
    buttonText: d.buttonText1,
    buttonLink: '#vehicles',
    bgColor: '#1a1a2e',
    textColor: '#ffffff',
    buttonBgColor: d.primaryColor,
    buttonTextColor: '#ffffff',
    backgroundImage: d.heroBackgroundImage,
    overlayOpacity: 0.6,
  });

const heroWithLogoNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('HeroWithLogo', 'HeroWithLogo', {
    logoUrl: d.logoUrl,
    logoText: d.companyName,
    logoScale: 1,
    buttonText: 'Ver Stock Completo',
    buttonLink: '/vehicles',
    buttonBgColor: d.primaryColor,
    buttonTextColor: d.secondaryColor,
    buttonBorderColor: '#000000',
    buttonBorderWidth: 0,
    buttonBorderRadius: 8,
    overlayColor: '#000000',
    overlayOpacity: 0.3,
    height: '600px',
  });

const vehicleGrid2Node = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode(
    'VehicleGrid2',
    'VehicleGrid2',
    {
      title: 'Explora nuestro stock',
      subtitle: '',
      bgColor: d.backgroundColor,
      textColor: d.textColor,
      columns: 3,
      showStatuses: ['Publicado', 'Reservado'],
      gradient: { from: '#000000', via: '#171717', to: '#404040', angle: 135 },
      cardSettings: [
        {
          cardBgColor: d.backgroundColor,
          cardBorderColor: '#e5e7eb',
          cardTextColor: d.textColor,
          cardPriceColor: d.primaryColor,
          cardButtonColor: d.primaryColor,
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
      ],
      newBadgeText: 'Recién publicado',
    },
    true
  );

const vehicleCarouselNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('VehicleCarousel', 'VehicleCarousel', {
    title: 'Vehículos destacados',
    subtitle: 'Descubre nuestra selección de vehículos',
    bgColor: d.backgroundColor,
    textColor: d.textColor,
    buttonText: 'Ver todos',
    buttonLink: '/vehicles',
    buttonBgColor: d.primaryColor,
    buttonTextColor: d.secondaryColor,
    autoplay: true,
    showStatuses: ['Publicado', 'Reservado'],
    newBadgeText: 'Recién publicado',
    cardSettings: [
      {
        cardBgColor: '#ffffff',
        cardBorderColor: '#e5e7eb',
        cardTextColor: '#1f2937',
        cardPriceColor: '#ffffff',
        cardButtonColor: d.primaryColor,
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
    ],
  });

const howToArriveNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('HowToArrive', 'HowToArrive', {
    title: '¿Cómo llegar?',
    subtitle: 'Encuéntranos en la siguiente dirección:',
    titleAlignment: 'center',
    height: '400px',
    bgColor: d.backgroundColor,
    iconColor: d.primaryColor,
    buttonBgColor: d.primaryColor,
  });

const whyChooseUsNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('WhyChooseUs', 'WhyChooseUs', {
    sectionTitle: `¿Por qué elegir ${d.companyName}?`,
    iconColor: d.primaryColor,
    bgColor: d.backgroundColor,
    textColor: d.textColor,
  });

const contactCTANode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('ContactCTA', 'ContactCTA', {
    title: '¿Listo para encontrar tu auto ideal?',
    subtitle: 'Contáctanos hoy mismo',
    buttonText: 'Contáctanos',
    buttonLink: '/contact',
    bgColor: d.backgroundColor,
    textColor: d.textColor,
    buttonBgColor: d.primaryColor,
    buttonTextColor: '#ffffff',
  });

const testimonialsNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('Testimonials', 'Testimonials', {
    title: 'Lo que dicen nuestros clientes',
    subtitle: `Experiencias reales de quienes confiaron en ${d.companyName}`,
    bgColor: d.backgroundColor,
    textColor: d.textColor,
    cardBgColor: '#f9fafb',
    starColor: '#f59e0b',
  });

const faqNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('FAQ', 'FAQ', {
    title: 'Preguntas Frecuentes',
    subtitle: 'Resolvemos tus dudas',
    bgColor: d.backgroundColor,
    textColor: d.textColor,
    accentColor: d.primaryColor,
  });

const videoEmbedNode = () =>
  makeNode('VideoEmbed', 'VideoEmbed', {
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Conócenos en video',
    subtitle: 'Descubre quiénes somos y qué nos hace diferentes.',
    bgColor: '#f7fafc',
    textColor: '#1a202c',
    aspectRatio: '16:9',
    maxWidth: '800px',
  });

// ── New section node builders ──

const statsCounterNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('StatsCounter', 'StatsCounter', {
    bgColor: '#ffffff',
    textColor: '#111827',
    accentColor: d.primaryColor,
    columns: 4,
  });

const footerNode = (d: ReturnType<typeof getPersonalizedDefaults>, scheme?: ColorScheme) =>
  makeNode('Footer', 'Footer', {
    bgColor: isDark(scheme) ? '#141414' : '#f9fafb',
    textColor: isDark(scheme) ? '#737373' : '#6b7280',
    headingColor: isDark(scheme) ? '#e5e5e5' : '#111827',
    dividerColor: isDark(scheme) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    socialIconBgColor: isDark(scheme) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    copyrightText: `© ${new Date().getFullYear()} ${d.companyName}. Todos los derechos reservados.`,
  });

const promoBannerNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('PromoBanner', 'PromoBanner', {
    text: '¡Oferta especial este mes! Financiamiento desde 0% de interés',
    ctaText: 'Ver ofertas',
    ctaLink: '#vehicles',
    bgColor: d.primaryColor,
    textColor: '#ffffff',
    icon: 'megaphone',
  });

const photoGalleryNode = () =>
  makeNode('PhotoGallery', 'PhotoGallery', {
    sectionTitle: 'Nuestra galería',
    layout: 'grid',
    columns: 3,
    gap: 8,
    rounded: true,
    showCaptions: true,
    bgColor: '#ffffff',
    textColor: '#111827',
  });

const teamMembersNode = () =>
  makeNode('TeamMembers', 'TeamMembers', {
    sectionTitle: 'Nuestro equipo',
    columns: 3,
    cardStyle: 'grid',
    bgColor: '#ffffff',
    textColor: '#111827',
  });

// ── Layout node builders ──

const builderNavbarNode = (_d: ReturnType<typeof getPersonalizedDefaults>, scheme?: ColorScheme) =>
  makeNode('BuilderNavbar', 'BuilderNavbar', {
    links: [
      { text: 'Inicio', url: '/' },
      { text: 'Financiamiento', url: '/financing' },
      { text: 'Consignaciones', url: '/consignments' },
      { text: 'Compra directa', url: '/buy-direct' },
      { text: 'Buscamos por ti', url: '/we-search-for-you' },
    ],
    ctaText: 'Contacto',
    ctaUrl: '/contact',
    bgColor: isDark(scheme) ? '#141414' : '#ffffff',
    textColor: isDark(scheme) ? '#d4d4d4' : '#4b5563',
    ctaBgColor: '',
    ctaTextColor: '#ffffff',
    logoUrl: '',
    showLogo: true,
    sticky: true,
  });

// ── Moderna node builders ──

const heroModernoNode = (_d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('HeroModerno', 'HeroModerno', {
    title: 'Encuentra tu próximo vehículo en',
    highlightText: '',
    subtitle: 'La mejor selección de vehículos con financiamiento a tu medida y atención personalizada.',
    buttonText: 'Ver vehículos',
    buttonLink: '#vehicles',
    buttonText2: 'Contáctanos',
    buttonLink2: '#contact',
    bgColor: '#fbfbfd',
    textColor: '#0f172a',
    accentColor: '',
    trustItems: [
      { text: '500+ autos vendidos' },
      { text: '4.9★ en Google' },
      { text: 'Financiamiento 100%' },
      { text: 'Garantía incluida' },
    ],
  });

const statsModernoNode = (_d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('StatsModerno', 'StatsModerno', {
    bgColor: '#ffffff',
    textColor: '#0f172a',
    accentColor: '',
  });

const testimonialsModernoNode = (_d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('TestimonialsModerno', 'TestimonialsModerno', {
    bgColor: '#fbfbfd',
    cardBgColor: '#ffffff',
    textColor: '#0f172a',
    starColor: '#f59e0b',
    accentColor: '',
  });

const ctaModernoNode = (_d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('CTAModerno', 'CTAModerno', {
    accentColor: '',
  });

const footerModernoNode = (_d: ReturnType<typeof getPersonalizedDefaults>, scheme?: ColorScheme) =>
  makeNode('FooterModerno', 'FooterModerno', {
    companyName: '',
    bgColor: isDark(scheme) ? '#141414' : '#f9fafb',
    textColor: isDark(scheme) ? '#737373' : '#6b7280',
    headingColor: isDark(scheme) ? '#e5e5e5' : '#111827',
    dividerColor: isDark(scheme) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    socialIconBgColor: isDark(scheme) ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
    accentColor: '',
  });

const heroMinimalisticNode = (d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode('HeroMinimalistic', 'HeroMinimalistic', {
    title: d.heroTitle,
    subtitle: d.heroSubtitle,
    buttonText1: d.buttonText1,
    buttonText2: d.buttonText2,
    buttonLink1: '#vehicles',
    buttonLink2: '#contact',
    bgColor: d.backgroundColor,
    textColor: d.textColor,
    buttonBgColor: d.primaryColor,
    buttonTextColor: d.secondaryColor,
  });

// ── FormEmbed node builders ──

const financingFormEmbedNode = (id: string, d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode(id, 'FinancingFormEmbed', {
    bgColor: d.backgroundColor || '#ffffff',
    textColor: d.textColor || '#111827',
    accentColor: d.primaryColor || '#3b82f6',
  });

const consignmentsFormEmbedNode = (id: string, d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode(id, 'ConsignmentsFormEmbed', {
    bgColor: d.backgroundColor || '#ffffff',
    textColor: d.textColor || '#111827',
    accentColor: d.primaryColor || '#3b82f6',
  });

const buyDirectFormEmbedNode = (id: string, d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode(id, 'BuyDirectFormEmbed', {
    bgColor: d.backgroundColor || '#ffffff',
    textColor: d.textColor || '#111827',
    accentColor: d.primaryColor || '#3b82f6',
  });

const weSearchFormEmbedNode = (id: string, d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode(id, 'WeSearchFormEmbed', {
    bgColor: d.backgroundColor || '#ffffff',
    textColor: d.textColor || '#111827',
    accentColor: d.primaryColor || '#3b82f6',
  });

const contactFormEmbedNode = (id: string, d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode(id, 'ContactFormEmbed', {
    bgColor: d.backgroundColor || '#ffffff',
    textColor: d.textColor || '#111827',
    accentColor: d.primaryColor || '#3b82f6',
  });

const aboutContentEmbedNode = (id: string, d: ReturnType<typeof getPersonalizedDefaults>) =>
  makeNode(id, 'AboutContentEmbed', {
    bgColor: d.backgroundColor || '#ffffff',
    textColor: d.textColor || '#111827',
    accentColor: d.primaryColor || '#3b82f6',
  });

// ── Page hero content ──

const PAGE_HERO_CONTENT: Record<Exclude<PageSlug, 'home'>, { title: string; subtitle: string }> = {
  financing: {
    title: 'Financiamiento a tu Medida',
    subtitle: 'Accede a las mejores opciones de crédito automotriz. Simula tu financiamiento y encuentra el plan perfecto para ti.',
  },
  consignments: {
    title: 'Consigna tu Vehículo',
    subtitle: 'Déjanos vender tu vehículo por ti. Nos encargamos de todo el proceso para que obtengas el mejor precio.',
  },
  'buy-direct': {
    title: 'Compra Directa',
    subtitle: '¿Quieres vender tu vehículo de forma rápida y segura? Te hacemos una oferta justa al instante.',
  },
  'we-search-for-you': {
    title: 'Buscamos por Ti',
    subtitle: 'Cuéntanos qué vehículo buscas y nuestro equipo se encargará de encontrarlo para ti.',
  },
  contact: {
    title: 'Contáctanos',
    subtitle: 'Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos a la brevedad.',
  },
  about: {
    title: 'Nosotros',
    subtitle: 'Conoce nuestra historia, nuestro equipo y lo que nos motiva cada día.',
  },
};

// ── Form component mapping ──

const PAGE_FORM_COMPONENT: Record<Exclude<PageSlug, 'home'>, string> = {
  financing: 'FinancingFormEmbed',
  consignments: 'ConsignmentsFormEmbed',
  'buy-direct': 'BuyDirectFormEmbed',
  'we-search-for-you': 'WeSearchFormEmbed',
  contact: 'ContactFormEmbed',
  about: 'AboutContentEmbed',
};

// ── Multi-page state builder helper ──

type NavbarFn = (d: ReturnType<typeof getPersonalizedDefaults>, scheme: ColorScheme) => Record<string, any>;
type FooterFn = (d: ReturnType<typeof getPersonalizedDefaults>, scheme: ColorScheme) => Record<string, any>;

const makePageState = (
  pageSlug: string,
  formResolvedName: string,
  formProps: Record<string, any>,
  extraSections: Record<string, any>[],
  extraIds: string[],
  navbarFn: NavbarFn,
  footerFn: FooterFn,
  d: ReturnType<typeof getPersonalizedDefaults>,
  scheme: ColorScheme
) => {
  const navId = `nav-${pageSlug}`;
  const formId = `form-${pageSlug}`;
  const footerId = `footer-${pageSlug}`;

  const navOrig = navbarFn(d, scheme);
  const navOrigId = Object.keys(navOrig)[0];
  const nav = { [navId]: { ...navOrig[navOrigId], parent: 'ROOT' } };

  const footerOrig = footerFn(d, scheme);
  const footerOrigId = Object.keys(footerOrig)[0];
  const footer = { [footerId]: { ...footerOrig[footerOrigId], parent: 'ROOT' } };

  // Merge extra sections
  const extraNodes: Record<string, any> = {};
  for (const section of extraSections) {
    Object.assign(extraNodes, section);
  }

  return {
    ...makeRoot([navId, formId, ...extraIds, footerId]),
    ...nav,
    ...makeNode(formId, formResolvedName, formProps),
    ...extraNodes,
    ...footer,
  };
};

// ── Per-template form props — MUST match each template's home page palette ──

const tradicionalFormProps = (
  d: ReturnType<typeof getPersonalizedDefaults>,
  scheme?: ColorScheme
) => {
  const dark = isDark(scheme);
  return {
    bgColor: dark ? '#141414' : '#ffffff',
    textColor: dark ? '#e5e5e5' : '#111827',
    accentColor: d.primaryColor || '#3b82f6',
    variant: 'traditional',
  };
};

const modernaFormProps = (
  d: ReturnType<typeof getPersonalizedDefaults>,
  scheme?: ColorScheme
) => {
  const dark = isDark(scheme);
  return {
    bgColor: dark ? '#141414' : '#fbfbfd',
    textColor: dark ? '#e5e5e5' : '#0f172a',
    accentColor: d.primaryColor || '#3b82f6',
    variant: 'moderna',
  };
};

const premiumFormProps = (
  d: ReturnType<typeof getPersonalizedDefaults>,
  scheme?: ColorScheme
) => {
  const dark = isDark(scheme);
  return {
    bgColor: dark ? '#0a0a0a' : '#ffffff',
    textColor: dark ? '#ffffff' : '#111827',
    accentColor: d.primaryColor || '#3b82f6',
    variant: 'premium',
  };
};

const minimalistaFormProps = (
  d: ReturnType<typeof getPersonalizedDefaults>,
  scheme?: ColorScheme
) => {
  const dark = isDark(scheme);
  return {
    bgColor: dark ? '#141414' : (d.backgroundColor || '#ffffff'),
    textColor: dark ? '#e5e5e5' : (d.textColor || '#111827'),
    accentColor: d.primaryColor || '#3b82f6',
    variant: 'minimalista',
  };
};

// ── Generic getPageState factory ──

type ExtraSectionsFn = (
  page: Exclude<PageSlug, 'home'>,
  d: ReturnType<typeof getPersonalizedDefaults>,
  scheme: ColorScheme
) => { sections: Record<string, any>[]; ids: string[] };

const createGetPageState = (
  formPropsFn: (d: ReturnType<typeof getPersonalizedDefaults>, scheme?: ColorScheme) => Record<string, any>,
  navbarFn: NavbarFn,
  footerFn: FooterFn,
  extraSectionsFn?: ExtraSectionsFn
) => {
  return (page: PageSlug, client: any, colorScheme?: ColorScheme): Record<string, any> | null => {
    if (page === 'home') return null;

    const d = getPersonalizedDefaults(client);
    const scheme: ColorScheme = colorScheme || 'LIGHT';
    const formComponent = PAGE_FORM_COMPONENT[page];
    if (!formComponent) return null;
    const content = PAGE_HERO_CONTENT[page] || { title: '', subtitle: '' };
    const formProps: Record<string, any> = {
      ...formPropsFn(d, scheme),
      title: content.title,
      subtitle: content.subtitle,
    };

    // About page gets extra editable props
    if (page === 'about') {
      formProps.values = [
        { title: 'Nuestra Misión', description: 'Ofrecer la mejor experiencia en compra y venta de vehículos, con transparencia y confianza en cada operación.', emoji: '🎯' },
        { title: 'Confianza', description: 'Nos destacamos por la honestidad y transparencia en cada transacción. Tu satisfacción es nuestra prioridad.', emoji: '🤝' },
        { title: 'Excelencia', description: 'Mejora continua en nuestros procesos para garantizar un servicio de primer nivel a todos nuestros clientes.', emoji: '⭐' },
      ];
      formProps.teamTitle = 'Nuestro Equipo';
      formProps.teamSubtitle = 'Conoce a las personas detrás de ' + d.companyName;
      formProps.showTeam = true;
      formProps.members = [
        { name: 'Nombre del Gerente', role: 'Gerente General', imageUrl: '' },
        { name: 'Nombre del Vendedor', role: 'Ventas', imageUrl: '' },
        { name: 'Nombre del Asesor', role: 'Atención al Cliente', imageUrl: '' },
      ];
    }

    const extras = extraSectionsFn ? extraSectionsFn(page, d, scheme) : { sections: [], ids: [] };

    return makePageState(
      page,
      formComponent,
      formProps,
      extras.sections,
      extras.ids,
      navbarFn,
      footerFn,
      d,
      scheme
    );
  };
};

// ── Extra sections per template style ──

const tradicionalExtraSections: ExtraSectionsFn = (page, d, scheme) => {
  const dark = isDark(scheme);
  const whyUsId = `whyus-${page}`;
  const ctaId = `cta-${page}`;

  return {
    ids: [whyUsId, ctaId],
    sections: [
      makeNode(whyUsId, 'TraditionalWhyUs', {
        title: page === 'financing' ? '¿Por qué financiar con nosotros?' :
                      page === 'consignments' ? '¿Por qué consignar con nosotros?' :
                      page === 'buy-direct' ? '¿Por qué vendernos tu auto?' :
                      page === 'we-search-for-you' ? '¿Por qué elegirnos?' :
                      page === 'contact' ? 'Nuestros servicios' :
                      '¿Por qué elegirnos?',
        bgColor: dark ? '#141414' : '#f8fafc',
        textColor: dark ? '#e5e5e5' : '#111827',
        subtitleColor: dark ? '#a3a3a3' : '#6b7280',
        accentColor: d.primaryColor,
        cardBgColor: dark ? '#1c1c1c' : '#ffffff',
      }),
      makeNode(ctaId, 'TraditionalContactCTA', {
        title: '¿Tienes dudas?',
        subtitle: 'Nuestro equipo está listo para ayudarte',
        bgColor: dark ? '#141414' : '#ffffff',
        textColor: dark ? '#e5e5e5' : '#111827',
        buttonColor: d.primaryColor,
        buttonTextColor: '#ffffff',
      }),
    ],
  };
};

const modernaExtraSections: ExtraSectionsFn = (page, _d, scheme) => {
  const dark = isDark(scheme);
  const faqId = `faq-${page}`;
  const ctaId = `cta-${page}`;

  return {
    ids: [faqId, ctaId],
    sections: [
      makeNode(faqId, 'FAQ', {
        title: 'Preguntas frecuentes',
        subtitle: '',
        bgColor: dark ? '#1c1c1c' : '#ffffff',
        textColor: dark ? '#e5e5e5' : '#0f172a',
        accentColor: '',
      }),
      makeNode(ctaId, 'CTAModerno', {
        accentColor: '',
      }),
    ],
  };
};

const premiumExtraSections: ExtraSectionsFn = (page, _d, scheme) => {
  const dark = isDark(scheme);
  const bg1 = dark ? '#0a0a0a' : '#ffffff';
  const bg2 = dark ? '#0f0f0f' : '#f9fafb';
  const text = dark ? '#ffffff' : '#111827';
  const featId = `feat-${page}`;
  const ctaId = `cta-${page}`;

  return {
    ids: [featId, ctaId],
    sections: [
      makeNode(featId, 'FeatureShowcase', {
        eyebrowText: 'Nuestras ventajas',
        sectionTitle: page === 'financing' ? 'Financiamiento premium' :
                      page === 'consignments' ? 'Servicio de consignación premium' :
                      page === 'buy-direct' ? 'Compra directa premium' :
                      page === 'we-search-for-you' ? 'Búsqueda personalizada' :
                      page === 'contact' ? 'Experiencia premium' :
                      'Lo que nos distingue',
        bgColor: bg1,
        textColor: text,
        accentColor: '',
      }),
      makeNode(ctaId, 'CTAPremium', {
        title: '¿Listo para comenzar?',
        subtitle: 'Contáctanos y descubre la diferencia',
        buttonText: 'Hablar con un asesor',
        buttonLink: '/contact',
        bgColor: bg2,
        textColor: text,
        accentColor: '',
      }),
    ],
  };
};

const minimalistaExtraSections: ExtraSectionsFn = (page, d, scheme) => {
  const dark = isDark(scheme);
  const ctaId = `cta-${page}`;

  return {
    ids: [ctaId],
    sections: [
      makeNode(ctaId, 'ContactCTA', {
        title: '¿Necesitas ayuda?',
        subtitle: 'Estamos a un mensaje de distancia',
        buttonText: 'Contáctanos',
        buttonLink: '/contact',
        bgColor: dark ? '#141414' : (d.backgroundColor || '#ffffff'),
        textColor: dark ? '#e5e5e5' : '#ffffff',
        buttonBgColor: d.primaryColor,
        buttonTextColor: '#ffffff',
      }),
    ],
  };
};

// ── Template Definitions ──
// "Tradicional" is FIRST and is the default — it matches the website-gocar
// TraditionalContent that renders when the builder page is inactive:
// WelcomeSection → NewVehiclesSection → HowToArrive → WhyUs → ContactCTA

export const builderTemplates: BuilderTemplate[] = [
  // 1. TRADICIONAL — La probada, buscador IA + filtros completos + mapa
  {
    id: 'tradicional',
    name: 'Tradicional',
    description: 'Buscador inteligente con IA, catálogo completo con filtros, mapa interactivo y beneficios.',
    sections: ['BuilderNavbar', 'HeroWelcome', 'TraditionalVehicleGrid', 'TraditionalHowToArrive', 'TraditionalWhyUs', 'TraditionalContactCTA', 'Footer'],
    getState: (client, scheme) => {
      const d = getPersonalizedDefaults(client);
      const dark = isDark(scheme);
      return {
        ...makeRoot(['BuilderNavbar', 'HeroWelcome', 'TraditionalVehicleGrid', 'TraditionalHowToArrive', 'TraditionalWhyUs', 'TraditionalContactCTA', 'Footer']),
        ...builderNavbarNode(d, scheme),
        ...heroWelcomeNode(d, scheme),
        ...makeNode('TraditionalVehicleGrid', 'TraditionalVehicleGrid', {
          sectionBgColor: dark ? '#141414' : '#f8fafc',
          filterBarBgColor: dark ? '#1a1a1a' : '#ffffff',
          filterBarBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
          filterTextColor: dark ? '#d4d4d4' : '#374151',
          filterActiveTextColor: '#ffffff',
          cardBgColor: dark ? '#1c1c1c' : '#ffffff',
          cardBorderColor: dark ? '#2a2a2a' : 'rgba(0,0,0,0.1)',
          cardTitleColor: dark ? '#f5f5f5' : '#171717',
          cardSubtitleColor: dark ? '#a3a3a3' : '#525252',
          cardSpecsColor: dark ? '#d4d4d4' : '#262626',
          cardPriceColor: dark ? '#f5f5f5' : '#171717',
        }),
        ...makeNode('TraditionalHowToArrive', 'TraditionalHowToArrive', {
          bgColor: dark ? '#141414' : '#f8fafc',
          textColor: dark ? '#e5e5e5' : '#111827',
          subtitleColor: dark ? '#a3a3a3' : '#6b7280',
          iconColor: d.primaryColor,
          cardBgColor: dark ? '#1c1c1c' : '#ffffff',
          cardBorderColor: dark ? '#2a2a2a' : 'rgba(0,0,0,0.1)',
          labelColor: dark ? '#737373' : '#6b7280',
          valueColor: dark ? '#e5e5e5' : '#111827',
        }),
        ...makeNode('TraditionalWhyUs', 'TraditionalWhyUs', {
          bgColor: dark ? '#141414' : '#f8fafc',
          textColor: dark ? '#e5e5e5' : '#111827',
          subtitleColor: dark ? '#a3a3a3' : '#6b7280',
          accentColor: d.primaryColor,
          cardBgColor: dark ? '#1c1c1c' : '#ffffff',
        }),
        ...makeNode('TraditionalContactCTA', 'TraditionalContactCTA', {
          bgColor: dark ? '#141414' : '#ffffff',
          textColor: dark ? '#e5e5e5' : '#111827',
          buttonColor: d.primaryColor,
          buttonTextColor: '#ffffff',
        }),
        ...footerNode(d, scheme),
      };
    },
    getPageState: createGetPageState(
      tradicionalFormProps,
      builderNavbarNode,
      footerNode,
      tradicionalExtraSections
    ),
  },

  // 2. MODERNA — Hero premium + catálogo + stats + testimonios + CTA
  {
    id: 'moderna',
    name: 'Moderna',
    description: 'Landing premium tipo Apple/Tesla. Hero animado, estadísticas, testimonios y CTA.',
    sections: ['BuilderNavbar', 'HeroModerno', 'TraditionalVehicleGrid', 'StatsModerno', 'TestimonialsModerno', 'CTAModerno', 'FooterModerno'],
    getState: (client, scheme) => {
      const d = getPersonalizedDefaults(client);
      const dark = isDark(scheme);
      return {
        ...makeRoot(['BuilderNavbar', 'HeroModerno', 'TraditionalVehicleGrid', 'StatsModerno', 'TestimonialsModerno', 'CTAModerno', 'FooterModerno']),
        ...builderNavbarNode(d, scheme),
        ...makeNode('HeroModerno', 'HeroModerno', {
          title: 'Encuentra tu próximo vehículo en', highlightText: '',
          subtitle: 'La mejor selección de vehículos con financiamiento a tu medida y atención personalizada.',
          buttonText: 'Ver vehículos', buttonLink: '#vehicles',
          buttonText2: 'Contáctanos', buttonLink2: '#contact',
          bgColor: dark ? '#141414' : '#fbfbfd', textColor: dark ? '#e5e5e5' : '#0f172a', accentColor: '',
          trustItems: [{ text: '500+ autos vendidos' }, { text: '4.9★ en Google' }, { text: 'Financiamiento 100%' }, { text: 'Garantía incluida' }],
        }),
        ...makeNode('TraditionalVehicleGrid', 'TraditionalVehicleGrid', {
          sectionBgColor: dark ? '#141414' : '#f8fafc',
          filterBarBgColor: dark ? '#1a1a1a' : '#ffffff',
          filterBarBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
          filterTextColor: dark ? '#d4d4d4' : '#374151',
          filterActiveTextColor: '#ffffff',
          cardBgColor: dark ? '#1c1c1c' : '#ffffff',
          cardBorderColor: dark ? '#2a2a2a' : 'rgba(0,0,0,0.1)',
          cardTitleColor: dark ? '#f5f5f5' : '#171717',
          cardSubtitleColor: dark ? '#a3a3a3' : '#525252',
          cardSpecsColor: dark ? '#d4d4d4' : '#262626',
          cardPriceColor: dark ? '#f5f5f5' : '#171717',
        }),
        ...makeNode('StatsModerno', 'StatsModerno', {
          bgColor: dark ? '#1c1c1c' : '#ffffff', textColor: dark ? '#e5e5e5' : '#0f172a', accentColor: '',
        }),
        ...makeNode('TestimonialsModerno', 'TestimonialsModerno', {
          bgColor: dark ? '#141414' : '#fbfbfd', cardBgColor: dark ? '#1c1c1c' : '#ffffff',
          textColor: dark ? '#e5e5e5' : '#0f172a', starColor: '#f59e0b', accentColor: '',
        }),
        ...makeNode('CTAModerno', 'CTAModerno', { accentColor: '' }),
        ...footerModernoNode(d, scheme),
      };
    },
    getPageState: createGetPageState(
      modernaFormProps,
      builderNavbarNode,
      footerModernoNode,
      modernaExtraSections
    ),
  },

  // 3. PREMIUM — Ultra premium dark. Hero cinematográfico, features bento, testimonios carousel, galería, CTA glass
  {
    id: 'premium',
    name: 'Premium',
    description: 'Diseño ultra premium estilo Porsche/Mercedes. Dark, glassmorphism, galería cinematográfica.',
    sections: ['BuilderNavbar', 'HeroPremium', 'TraditionalVehicleGrid', 'FeatureShowcase', 'TestimonialsPremium', 'GalleryPremium', 'CTAPremium', 'Footer'],
    getState: (client, scheme) => {
      const d = getPersonalizedDefaults(client);
      const dark = isDark(scheme);
      // Premium is dark by design — light mode uses very dark grays, dark mode uses pure blacks
      const bg1 = dark ? '#0a0a0a' : '#ffffff';
      const bg2 = dark ? '#0f0f0f' : '#f9fafb';
      const text = dark ? '#ffffff' : '#111827';
      return {
        ...makeRoot(['BuilderNavbar', 'HeroPremium', 'TraditionalVehicleGrid', 'FeatureShowcase', 'TestimonialsPremium', 'GalleryPremium', 'CTAPremium', 'Footer']),
        ...builderNavbarNode(d, scheme),
        ...makeNode('HeroPremium', 'HeroPremium', {
          title: 'Experiencia automotriz', highlightText: '', subtitle: 'Vehículos seleccionados para quienes exigen lo extraordinario.',
          buttonText: 'Explorar vehículos', buttonLink: '#vehicles',
          bgColor: bg1, textColor: text, accentColor: '',
        }),
        ...makeNode('TraditionalVehicleGrid', 'TraditionalVehicleGrid', {
          sectionBgColor: dark ? '#141414' : '#f8fafc',
          filterBarBgColor: dark ? '#1a1a1a' : '#ffffff',
          filterBarBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
          filterTextColor: dark ? '#d4d4d4' : '#374151',
          filterActiveTextColor: '#ffffff',
          cardBgColor: dark ? '#1c1c1c' : '#ffffff',
          cardBorderColor: dark ? '#2a2a2a' : 'rgba(0,0,0,0.1)',
          cardTitleColor: dark ? '#f5f5f5' : '#171717',
          cardSubtitleColor: dark ? '#a3a3a3' : '#525252',
          cardSpecsColor: dark ? '#d4d4d4' : '#262626',
          cardPriceColor: dark ? '#f5f5f5' : '#171717',
        }),
        ...makeNode('FeatureShowcase', 'FeatureShowcase', {
          eyebrowText: 'Por qué elegirnos', sectionTitle: 'Una experiencia premium en cada detalle',
          bgColor: bg1, textColor: text, accentColor: '',
        }),
        ...makeNode('TestimonialsPremium', 'TestimonialsPremium', {
          eyebrowText: 'Testimonios', bgColor: bg2, textColor: text, accentColor: '',
        }),
        ...makeNode('GalleryPremium', 'GalleryPremium', {
          sectionTitle: 'Nuestra galería', subtitle: 'Descubre nuestras instalaciones y vehículos destacados',
          bgColor: bg1, textColor: text, accentColor: '',
        }),
        ...makeNode('CTAPremium', 'CTAPremium', {
          title: 'Agenda tu visita exclusiva', subtitle: 'Reserva una cita personalizada con uno de nuestros asesores.',
          buttonText: 'Reservar ahora', buttonLink: '#contact',
          bgColor: bg1, textColor: text, accentColor: '',
        }),
        ...footerNode(d, scheme),
      };
    },
    getPageState: createGetPageState(
      premiumFormProps,
      builderNavbarNode,
      footerNode,
      premiumExtraSections
    ),
  },

  // 4. MINIMALISTA — Hero split + catálogo + testimonios + CTA
  {
    id: 'minimalista',
    name: 'Minimalista',
    description: 'Diseño ultra limpio. Hero elegante, catálogo con filtros, testimonios y contacto.',
    sections: ['BuilderNavbar', 'HeroMinimalistic', 'TraditionalVehicleGrid', 'Testimonials', 'ContactCTA', 'Footer'],
    getState: (client, scheme) => {
      const d = getPersonalizedDefaults(client);
      const dark = isDark(scheme);
      return {
        ...makeRoot(['BuilderNavbar', 'HeroMinimalistic', 'TraditionalVehicleGrid', 'Testimonials', 'ContactCTA', 'Footer']),
        ...builderNavbarNode(d, scheme),
        ...makeNode('HeroMinimalistic', 'HeroMinimalistic', {
          title: d.heroTitle, subtitle: d.heroSubtitle,
          buttonText1: d.buttonText1, buttonText2: d.buttonText2,
          buttonLink1: '#vehicles', buttonLink2: '#contact',
          bgColor: dark ? '#141414' : d.backgroundColor,
          textColor: dark ? '#e5e5e5' : d.textColor,
          buttonBgColor: d.primaryColor, buttonTextColor: d.secondaryColor,
        }),
        ...makeNode('TraditionalVehicleGrid', 'TraditionalVehicleGrid', {
          sectionBgColor: dark ? '#141414' : '#f8fafc',
          filterBarBgColor: dark ? '#1a1a1a' : '#ffffff',
          filterBarBorderColor: dark ? '#2a2a2a' : '#e5e7eb',
          filterTextColor: dark ? '#d4d4d4' : '#374151',
          filterActiveTextColor: '#ffffff',
          cardBgColor: dark ? '#1c1c1c' : '#ffffff',
          cardBorderColor: dark ? '#2a2a2a' : 'rgba(0,0,0,0.1)',
          cardTitleColor: dark ? '#f5f5f5' : '#171717',
          cardSubtitleColor: dark ? '#a3a3a3' : '#525252',
          cardSpecsColor: dark ? '#d4d4d4' : '#262626',
          cardPriceColor: dark ? '#f5f5f5' : '#171717',
        }),
        ...makeNode('Testimonials', 'Testimonials', {
          sectionTitle: 'Lo que dicen nuestros clientes',
          subtitle: `Experiencias reales de quienes confiaron en ${d.companyName}`,
          bgColor: dark ? '#141414' : '#ffffff',
          titleColor: dark ? '#f5f5f5' : '#111827',
          cardBgColor: dark ? '#1c1c1c' : '#f9fafb',
          nameColor: dark ? '#f5f5f5' : '#111827',
          roleColor: dark ? '#737373' : '#6b7280',
          testimonialColor: dark ? '#a3a3a3' : '#374151',
          starColor: '#f59e0b',
        }),
        ...makeNode('ContactCTA', 'ContactCTA', {
          title: '¿Listo para encontrar tu auto ideal?', subtitle: 'Contáctanos hoy mismo',
          buttonText: 'Contáctanos', buttonLink: '/contact',
          bgColor: dark ? '#141414' : d.backgroundColor,
          textColor: dark ? '#e5e5e5' : d.textColor,
          buttonBgColor: d.primaryColor, buttonTextColor: '#ffffff',
        }),
        ...footerNode(d, scheme),
      };
    },
    getPageState: createGetPageState(
      minimalistaFormProps,
      builderNavbarNode,
      footerNode,
      minimalistaExtraSections
    ),
  },
];

export const getTemplateById = (id: string) =>
  builderTemplates.find((t) => t.id === id);
