import { useAuth } from '@/contexts/AuthContext';

/**
 * Obtiene los valores por defecto personalizados para la automotora actual
 */
export const getClientDefaultValues = () => {
  // Importar useAuth aquí causaría problemas porque no es un hook
  // En su lugar, vamos a crear una función que reciba el cliente como parámetro
  return {
    // Valores por defecto genéricos
    primaryColor: '#e05d31',
    companyName: 'Automotora',
    heroTitle: 'Descubre Tu Próximo Vehículo',
    heroSubtitle:
      'Explora nuestra selección premium de autos y encuentra el que se adapta a tu estilo de vida',
  };
};

/**
 * Genera valores por defecto personalizados basados en la información del cliente
 */
export const getPersonalizedDefaults = (client: any) => {
  // Valores por defecto base
  const defaults = {
    primaryColor: '#e05d31',
    secondaryColor: '#ffffff',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    companyName: 'Automotora',
    heroTitle: 'Descubre Tu Próximo Vehículo',
    heroSubtitle:
      'Explora nuestra selección premium de autos y encuentra el que se adapta a tu estilo de vida',
    buttonText1: 'Ver vehículos',
    buttonText2: 'Contactar',
    contactEmail: 'contacto@automotora.com',
    contactPhone: '+56 9 1234 5678',
    logoText: client?.name || 'Automotora',
    logoUrl: client?.logo || '',
    heroBackgroundImage:
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470',
  };

  if (!client) {
    return defaults;
  }

  // Personalizar con información del cliente
  const personalized = {
    ...defaults,
    // Usar colores del tema del cliente si están disponibles
    primaryColor: client.theme?.light?.primary || defaults.primaryColor,
    secondaryColor: client.theme?.light?.secondary || defaults.secondaryColor,

    // Usar nombre de la empresa
    companyName: client.name || defaults.companyName,

    // Personalizar textos del hero
    heroTitle: `Bienvenido a ${client.name || 'Nuestra Automotora'}`,
    heroSubtitle: client.seo?.description || defaults.heroSubtitle,

    // Usar información de contacto del cliente
    contactEmail: client.contact?.email || defaults.contactEmail,
    contactPhone: client.contact?.phone || defaults.contactPhone,

    // Personalizar logo y imagen de fondo
    logoText: client.name || defaults.logoText,
    logoUrl: client.logo_url || client.logo || defaults.logoUrl,
    logoDarkUrl: client.logo_dark || '',
    heroBackgroundImage:
      client.hero_background_image || defaults.heroBackgroundImage,
  };

  return personalized;
};
