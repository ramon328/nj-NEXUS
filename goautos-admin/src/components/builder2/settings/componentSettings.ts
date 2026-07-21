// Define field settings for all component types
// These will be passed to the SettingsManager component

import { getPersonalizedDefaults } from '@/utils/clientDefaults';

// Extend the SettingField interface to include helpText
interface SettingField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'select'
    | 'color'
    | 'range'
    | 'number'
    | 'complex'
    | 'imageSelector';
  defaultValue?: any;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  placeholder?: string;
  fields?: SettingField[];
  helpText?: string;
}

// Function to get client-specific default values
const getClientDefaults = (client: any) => {
  return getPersonalizedDefaults(client);
};

export const textSettings = [
  {
    name: 'text',
    label: 'Contenido del texto',
    type: 'textarea' as const,
    rows: 3,
  },
  {
    name: 'fontSize',
    label: 'Tamaño de fuente',
    type: 'number' as const,
    defaultValue: 16,
    min: 8,
    max: 72,
    step: 1,
  },
  {
    name: 'fontWeight',
    label: 'Peso de fuente',
    type: 'select' as const,
    defaultValue: 'normal',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'bold', label: 'Bold' },
      { value: '100', label: 'Thin (100)' },
      { value: '200', label: 'Extra Light (200)' },
      { value: '300', label: 'Light (300)' },
      { value: '400', label: 'Regular (400)' },
      { value: '500', label: 'Medium (500)' },
      { value: '600', label: 'Semi Bold (600)' },
      { value: '700', label: 'Bold (700)' },
      { value: '800', label: 'Extra Bold (800)' },
      { value: '900', label: 'Black (900)' },
    ],
  },
  {
    name: 'textAlign',
    label: 'Alineación del texto',
    type: 'select' as const,
    defaultValue: 'left',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
      { value: 'justify', label: 'Justify' },
    ],
  },
  {
    name: 'color',
    label: 'Color del texto',
    type: 'color' as const,
    defaultValue: '#000000',
  },
  {
    name: 'background',
    label: 'Color de fondo',
    type: 'color' as const,
    defaultValue: 'transparent',
  },
  {
    name: 'padding',
    label: 'Espacio interior (px)',
    helpText: 'Espacio entre el borde del cuadro y el texto.',
    type: 'number' as const,
    defaultValue: 10,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    name: 'margin',
    label: 'Margen vertical (px)',
    helpText: 'Separación con los elementos de arriba y abajo.',
    type: 'number' as const,
    defaultValue: 5,
    min: 0,
    max: 100,
    step: 1,
  },
];

export const containerSettings = [
  {
    name: 'background',
    label: 'Color de fondo',
    type: 'color' as const,
    defaultValue: '#ffffff',
  },
  {
    name: 'fullWidth',
    label: 'Ancho completo (pegado a los bordes)',
    helpText: 'Quita el espacio lateral y las esquinas redondeadas para que el contenido llegue de borde a borde.',
    type: 'toggle' as const,
    defaultValue: false,
  },
  {
    name: 'padding',
    label: 'Espacio interior (px)',
    helpText: 'Espacio entre el borde del contenedor y su contenido. Con "Ancho completo" solo aplica arriba y abajo.',
    type: 'number' as const,
    defaultValue: 20,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    name: 'margin',
    label: 'Margen vertical (px)',
    helpText: 'Separación con los elementos de arriba y abajo.',
    type: 'number' as const,
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    name: 'borderRadius',
    label: 'Esquinas redondeadas (px)',
    type: 'number' as const,
    defaultValue: 0,
    min: 0,
    max: 50,
    step: 1,
  },
  {
    name: 'contentAlign',
    label: 'Alineación del contenido',
    helpText: 'Cómo se alinean los elementos dentro del contenedor.',
    type: 'select' as const,
    defaultValue: 'stretch',
    options: [
      { value: 'stretch', label: 'Ancho completo' },
      { value: 'left', label: 'Izquierda' },
      { value: 'center', label: 'Centro' },
      { value: 'right', label: 'Derecha' },
    ],
  },
];

export const imageSettings = [
  {
    name: 'src',
    label: 'Seleccionar Imagen',
    type: 'imageSelector' as const,
    placeholder: 'Arrastra una imagen aquí o haz clic para seleccionar',
  },
  {
    name: 'alt',
    label: 'Texto alternativo',
    helpText: 'Descripción de la imagen (ayuda al SEO y a lectores de pantalla).',
    type: 'text' as const,
  },
  {
    name: 'width',
    label: 'Ancho',
    helpText: 'Ej: 100% para ocupar todo el ancho, o 300px para tamaño fijo.',
    type: 'text' as const,
    defaultValue: '100%',
  },
  {
    name: 'height',
    label: 'Alto',
    helpText: 'Ej: auto para mantener proporción, o 200px para alto fijo.',
    type: 'text' as const,
    defaultValue: 'auto',
  },
  {
    name: 'objectFit',
    label: 'Ajuste de la imagen',
    type: 'select' as const,
    defaultValue: 'cover',
    options: [
      { value: 'cover', label: 'Llenar (recorta si sobra)' },
      { value: 'contain', label: 'Ajustar (sin recortar)' },
      { value: 'fill', label: 'Estirar' },
      { value: 'none', label: 'Original' },
    ],
  },
  {
    name: 'align',
    label: 'Alineación',
    helpText: 'Dónde se ubica la imagen cuando su ancho es menor a 100%.',
    type: 'select' as const,
    defaultValue: 'left',
    options: [
      { value: 'left', label: 'Izquierda' },
      { value: 'center', label: 'Centro' },
      { value: 'right', label: 'Derecha' },
    ],
  },
  {
    name: 'padding',
    label: 'Espacio exterior (px)',
    helpText: 'Espacio alrededor de la imagen. En 0 pega al borde (ancho completo).',
    type: 'number' as const,
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    name: 'margin',
    label: 'Margen vertical (px)',
    helpText: 'Separación con los elementos de arriba y abajo. En 0 quedan pegados.',
    type: 'number' as const,
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    name: 'borderRadius',
    label: 'Esquinas redondeadas (px)',
    type: 'number' as const,
    defaultValue: 4,
    min: 0,
    max: 50,
    step: 1,
  },
];

export const heroBasicSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: clientDefaults.heroTitle,
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      rows: 2,
      defaultValue: clientDefaults.heroSubtitle,
    },
    {
      name: 'alignment',
      label: 'Alineación',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ],
    },
    {
      name: 'buttonText',
      label: 'Texto del botón (Principal)',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText1,
    },
    {
      name: 'buttonLink',
      label: 'Enlace del botón (Principal)',
      type: 'text' as const,
      defaultValue: '#vehicles',
    },
    {
      name: 'buttonBgColor',
      label: 'Color de fondo del botón (Principal)',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'buttonTextColor',
      label: 'Color de texto del botón (Principal)',
      type: 'color' as const,
      defaultValue: clientDefaults.secondaryColor,
    },
    {
      name: 'buttonTextSecondary',
      label: 'Texto del botón (Secundario)',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText2,
    },
    {
      name: 'buttonLinkSecondary',
      label: 'Enlace del botón (Secundario)',
      type: 'text' as const,
      defaultValue: '#contact',
    },
    {
      name: 'buttonSecondaryBgColor',
      label: 'Color de fondo del botón (Secundario)',
      type: 'color' as const,
      defaultValue: 'transparent',
    },
    {
      name: 'buttonSecondaryTextColor',
      label: 'Color de texto del botón (Secundario)',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
  ];
};

export const heroWithCardSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: clientDefaults.heroTitle,
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      rows: 2,
      defaultValue: clientDefaults.heroSubtitle,
    },
    {
      name: 'cardTitle',
      label: 'Card Title',
      type: 'text' as const,
      defaultValue: `¿Por qué elegir ${clientDefaults.companyName}?`,
    },
    {
      name: 'cardDescription',
      label: 'Card Description',
      type: 'textarea' as const,
      rows: 3,
      defaultValue:
        'Descubre las ventajas que nos hacen únicos en el mercado automotriz',
    },
    {
      name: 'buttonText',
      label: 'Button Text',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText1,
    },
    {
      name: 'buttonLink',
      label: 'Button Link',
      type: 'text' as const,
      defaultValue: '#vehicles',
    },
    {
      name: 'backgroundImage',
      label: 'Imagen de Fondo',
      type: 'imageSelector' as const,
      placeholder:
        'Arrastra una imagen de fondo aquí o haz clic para seleccionar',
    },
    {
      name: 'overlayColor',
      label: 'Overlay Color',
      type: 'color' as const,
      defaultValue: '#000000',
    },
    {
      name: 'overlayOpacity',
      label: 'Overlay Opacity',
      type: 'range' as const,
      defaultValue: 0.6,
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'cardPosition',
      label: 'Card Position',
      type: 'select' as const,
      defaultValue: 'right',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ],
    },
    {
      name: 'cardBackground',
      label: 'Card Background Color',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'cardTextColor',
      label: 'Card Text Color',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
  ];
};

export const heroWithBackgroundSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: clientDefaults.heroTitle,
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      rows: 2,
      defaultValue: clientDefaults.heroSubtitle,
    },
    {
      name: 'textAlignment',
      label: 'Text Alignment',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ],
    },
    {
      name: 'buttonText',
      label: 'Texto del botón (Principal)',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText1,
    },
    {
      name: 'buttonLink',
      label: 'Enlace del botón (Principal)',
      type: 'text' as const,
      defaultValue: '#vehicles',
    },
    {
      name: 'buttonBgColor',
      label: 'Color de fondo del botón (Principal)',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'buttonTextColor',
      label: 'Color de texto del botón (Principal)',
      type: 'color' as const,
      defaultValue: clientDefaults.secondaryColor,
    },
    {
      name: 'buttonTextSecondary',
      label: 'Texto del botón (Secundario)',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText2,
    },
    {
      name: 'buttonLinkSecondary',
      label: 'Enlace del botón (Secundario)',
      type: 'text' as const,
      defaultValue: '#contact',
    },
    {
      name: 'buttonSecondaryBgColor',
      label: 'Color de fondo del botón (Secundario)',
      type: 'color' as const,
      defaultValue: 'transparent',
    },
    {
      name: 'buttonSecondaryTextColor',
      label: 'Color de texto del botón (Secundario)',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'backgroundImage',
      label: 'Imagen de Fondo',
      type: 'imageSelector' as const,
      placeholder:
        'Arrastra una imagen de fondo aquí o haz clic para seleccionar',
    },
    {
      name: 'overlayColor',
      label: 'Overlay Color',
      type: 'color' as const,
      defaultValue: '#000000',
    },
    {
      name: 'overlayOpacity',
      label: 'Overlay Opacity',
      type: 'range' as const,
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'height',
      label: 'Height',
      type: 'text' as const,
      defaultValue: '500px',
    },
  ];
};

export const heroWithVideoEmbedSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'videoUrl',
      label: 'URL del Video (Streamable / Vimeo)',
      type: 'text' as const,
      defaultValue: '',
      placeholder: 'https://streamable.com/abc123',
      helpText:
        'Pega el link de Streamable o Vimeo. El video se reproduce automáticamente, sin sonido y en loop.',
    },
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: clientDefaults.heroTitle,
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      rows: 2,
      defaultValue: clientDefaults.heroSubtitle,
    },
    {
      name: 'textAlignment',
      label: 'Alineación del texto',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
      ],
    },
    {
      name: 'buttonText',
      label: 'Texto del botón (Principal)',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText1,
    },
    {
      name: 'buttonLink',
      label: 'Enlace del botón (Principal)',
      type: 'text' as const,
      defaultValue: '#vehicles',
    },
    {
      name: 'buttonBgColor',
      label: 'Color de fondo del botón (Principal)',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'buttonTextColor',
      label: 'Color de texto del botón (Principal)',
      type: 'color' as const,
      defaultValue: clientDefaults.secondaryColor,
    },
    {
      name: 'buttonTextSecondary',
      label: 'Texto del botón (Secundario)',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText2,
    },
    {
      name: 'buttonLinkSecondary',
      label: 'Enlace del botón (Secundario)',
      type: 'text' as const,
      defaultValue: '#contact',
    },
    {
      name: 'buttonSecondaryBgColor',
      label: 'Color de fondo del botón (Secundario)',
      type: 'color' as const,
      defaultValue: 'transparent',
    },
    {
      name: 'buttonSecondaryTextColor',
      label: 'Color de texto del botón (Secundario)',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'overlayColor',
      label: 'Color del overlay',
      type: 'color' as const,
      defaultValue: '#000000',
    },
    {
      name: 'overlayOpacity',
      label: 'Opacidad del overlay',
      type: 'range' as const,
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      helpText:
        'Sube la opacidad si el video tiene mucho movimiento o colores claros y el texto no se lee.',
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'height',
      label: 'Altura',
      type: 'text' as const,
      defaultValue: '500px',
    },
    {
      name: 'maxWidth',
      label: 'Ancho del hero',
      type: 'select' as const,
      defaultValue: '1280px',
      options: [
        { value: '1280px', label: 'Centrado (recomendado)' },
        { value: '1440px', label: 'Centrado ancho' },
        { value: '100%', label: 'Full width (todo el ancho)' },
      ],
    },
    {
      name: 'borderRadius',
      label: 'Bordes redondeados',
      type: 'text' as const,
      defaultValue: '16px',
      helpText: 'Ej: 0, 16px, 24px, 9999px (totalmente redondo).',
    },
  ];
};

export const heroMinimalisticSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: clientDefaults.heroTitle,
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      defaultValue: clientDefaults.heroSubtitle,
      rows: 2,
    },
    {
      name: 'titleAlignment',
      label: 'Alineación del texto',
      type: 'select' as const,
      defaultValue: 'left',
      options: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
      ],
    },
    {
      name: 'buttonText1',
      label: 'Texto Botón 1',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText1,
    },
    {
      name: 'buttonLink1',
      label: 'Enlace Botón 1',
      type: 'text' as const,
      defaultValue: '#vehicles',
    },
    {
      name: 'buttonText2',
      label: 'Texto Botón 2',
      type: 'text' as const,
      defaultValue: clientDefaults.buttonText2,
    },
    {
      name: 'buttonLink2',
      label: 'Enlace Botón 2',
      type: 'text' as const,
      defaultValue: '#contact',
    },
    {
      name: 'buttonPaddingX',
      label: 'Padding horizontal del botón',
      type: 'text' as const,
      defaultValue: '1.5rem',
    },
    {
      name: 'buttonPaddingY',
      label: 'Padding vertical del botón',
      type: 'text' as const,
      defaultValue: '0.5rem',
    },
    {
      name: 'carImageUrl',
      label: 'Imagen del Auto',
      type: 'imageSelector' as const,
      placeholder:
        'Arrastra una imagen del auto aquí o haz clic para seleccionar',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'textColor',
      label: 'Color de texto',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'buttonBgColor',
      label: 'Color de fondo del botón',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'buttonTextColor',
      label: 'Color de texto del botón',
      type: 'color' as const,
      defaultValue: clientDefaults.secondaryColor,
    },
  ];
};

export const whyChooseUsSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'sectionTitle',
      label: 'Título de la sección',
      type: 'text' as const,
      defaultValue: `¿Por qué elegir ${clientDefaults.companyName}?`,
    },
    {
      name: 'titleAlignment',
      label: 'Alineación del título',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
      ],
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'textColor',
      label: 'Color del título',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'features',
      label: 'Característica',
      helpText: `💡 Consejos de enlaces:
• Internos: usa "/" en lugar de "#"
• WhatsApp: usa "+569" al inicio
`,
      type: 'complex' as const,
      defaultValue: [
        {
          icon: 'check',
          title: 'Autos inspeccionados y garantizados',
          description: 'Seguridad y calidad aseguradas',
          link: '#garantia',
        },
        {
          icon: 'dollar',
          title: 'Financiamiento a tu medida',
          description: 'Diseñado según tus necesidades',
          link: '#financiamiento',
        },
        {
          icon: 'user',
          title: 'Atención personalizada',
          description: 'Un asesor te acompaña en todo el proceso',
          link: '#contacto',
        },
      ],
      fields: [
        {
          name: 'icon',
          label: 'Icono',
          type: 'select' as const,
          options: [
            { value: 'check', label: 'Check' },
            { value: 'dollar', label: 'Dollar' },
            { value: 'user', label: 'User' },
            { value: 'car', label: 'Car' },
            { value: 'star', label: 'Star' },
            { value: 'shield', label: 'Shield' },
            { value: 'home', label: 'Home' },
            { value: 'clock', label: 'Clock' },
            { value: 'settings', label: 'Settings' },
            { value: 'phone', label: 'Phone' },
            { value: 'mail', label: 'Mail' },
            { value: 'map', label: 'Map' },
          ],
        },
        {
          name: 'title',
          label: 'Título',
          type: 'text' as const,
        },
        {
          name: 'description',
          label: 'Descripción',
          type: 'textarea' as const,
          rows: 2,
        },
        {
          name: 'link',
          label: 'Enlace de la Característica',
          type: 'text' as const,
          placeholder:
            'Ej: #seccion, /pagina, https://ejemplo.com, +56996366455, 96366455, 996366455',
          helpText: `💡 Tipos de enlaces soportados:
• WhatsApp: usa "+569" al inicio
• URLs completas: https://instagram.com/usuario
• Internos: usa "/" en lugar de "#"
• Redes sociales: instagram.com, facebook.com, twitter.com, youtube.com`,
        },
      ],
    },
    {
      name: 'cardBgColor',
      label: 'Color de fondo de la tarjeta',
      type: 'color' as const,
      defaultValue: '#f8f9fa',
    },
    {
      name: 'cardTextColor',
      label: 'Color de texto de la tarjeta',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'iconColor',
      label: 'Color de los iconos',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'descriptionColor',
      label: 'Color de la descripción',
      type: 'color' as const,
      defaultValue: '#666666',
    },
    {
      name: 'cardStyle',
      label: 'Estilo de tarjeta',
      type: 'select' as const,
      defaultValue: 'bordered',
      options: [
        { value: 'flat', label: 'Plano' },
        { value: 'elevated', label: 'Elevado' },
        { value: 'bordered', label: 'Con borde' },
        { value: 'glass', label: 'Cristal' },
      ],
    },
    {
      name: 'columns',
      label: 'Columnas',
      type: 'select' as const,
      defaultValue: '3',
      options: [
        { value: '2', label: '2 columnas' },
        { value: '3', label: '3 columnas' },
        { value: '4', label: '4 columnas' },
      ],
    },
  ];
};

export const faqSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'sectionTitle',
      label: 'Título de la sección',
      type: 'text' as const,
      defaultValue: 'Preguntas Frecuentes',
    },
    {
      name: 'titleAlignment',
      label: 'Alineación del título',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ],
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'titleColor',
      label: 'Color del título',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'questions',
      label: 'Pregunta',
      type: 'complex' as const,
      defaultValue: [
        {
          question: '¿Qué tipos de vehículos ofrecen?',
          answer:
            'Ofrecemos una amplia gama de vehículos, desde compactos hasta SUVs y vehículos de lujo. Todos nuestros vehículos son seminuevos y han pasado por un riguroso proceso de inspección.',
        },
        {
          question: '¿Cómo funciona el financiamiento?',
          answer:
            'Trabajamos con diversas entidades financieras para ofrecer opciones que se adapten a tus necesidades. Nuestros asesores pueden ayudarte a encontrar el plan más adecuado según tu situación financiera.',
        },
        {
          question: '¿Ofrecen garantía en sus vehículos?',
          answer:
            'Sí, todos nuestros vehículos incluyen garantía. La duración y cobertura pueden variar según el modelo, año y estado del vehículo. Consulta con nuestros asesores para más detalles.',
        },
      ],
      fields: [
        {
          name: 'question',
          label: 'Pregunta',
          type: 'text' as const,
        },
        {
          name: 'answer',
          label: 'Respuesta',
          type: 'textarea' as const,
          rows: 3,
        },
      ],
    },
    {
      name: 'questionColor',
      label: 'Color de texto de la pregunta',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'answerColor',
      label: 'Color de texto de la respuesta',
      type: 'color' as const,
      defaultValue: '#666666',
    },
    {
      name: 'accentColor',
      label: 'Color de los iconos',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'style',
      label: 'Estilo',
      type: 'select' as const,
      defaultValue: 'bordered',
      options: [
        { value: 'minimal', label: 'Minimalista' },
        { value: 'bordered', label: 'Con borde' },
        { value: 'cards', label: 'Tarjetas' },
      ],
    },
  ];
};

export const testimonialsSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'sectionTitle',
      label: 'Título de la sección',
      type: 'text' as const,
      defaultValue: 'Lo que dicen nuestros clientes',
    },
    {
      name: 'titleAlignment',
      label: 'Alineación del título',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ],
    },
    {
      name: 'columns',
      label: 'Número de columnas',
      type: 'select' as const,
      defaultValue: '3',
      options: [
        { value: '1', label: '1 Columna' },
        { value: '2', label: '2 Columnas' },
        { value: '3', label: '3 Columnas' },
      ],
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'titleColor',
      label: 'Color del título',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'cardBgColor',
      label: 'Color de fondo de la tarjeta',
      type: 'color' as const,
      defaultValue: '#f8f9fa',
    },
    {
      name: 'nameColor',
      label: 'Color de texto del nombre',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'roleColor',
      label: 'Color de texto del rol',
      type: 'color' as const,
      defaultValue: '#666666',
    },
    {
      name: 'testimonialColor',
      label: 'Color de texto del testimonio',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'starColor',
      label: 'Color de las estrellas',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'testimonials',
      label: 'Testimonio',
      type: 'complex' as const,
      defaultValue: [
        {
          name: 'Carlos Rodríguez',
          role: 'Comprador de Toyota Corolla',
          testimonial:
            'Excelente servicio de principio a fin. El proceso de compra fue rápido y transparente. Estoy muy contento con mi nuevo auto.',
          rating: '5',
          photo: '',
        },
        {
          name: 'María González',
          role: 'Compradora de Honda CR-V',
          testimonial:
            'El asesor fue muy paciente y resolvió todas mis dudas. Me ayudaron a conseguir el financiamiento perfecto para mis necesidades.',
          rating: '4',
          photo: '',
        },
        {
          name: 'Juan Pérez',
          role: 'Comprador de Nissan Sentra',
          testimonial:
            'La garantía y el servicio post-venta son excelentes. Me han atendido siempre que lo he necesitado sin problemas.',
          rating: '5',
          photo: '',
        },
      ],
      fields: [
        {
          name: 'name',
          label: 'Nombre',
          type: 'text' as const,
        },
        {
          name: 'role',
          label: 'Rol/Posición',
          type: 'text' as const,
        },
        {
          name: 'testimonial',
          label: 'Texto del testimonio',
          type: 'textarea' as const,
          rows: 3,
        },
        {
          name: 'rating',
          label: 'Calificación (1-5)',
          type: 'select' as const,
          options: [
            { value: '1', label: '1 Estrella' },
            { value: '2', label: '2 Estrellas' },
            { value: '3', label: '3 Estrellas' },
            { value: '4', label: '4 Estrellas' },
            { value: '5', label: '5 Estrellas' },
          ],
        },
        {
          name: 'photo',
          label: 'URL de la foto (opcional)',
          type: 'text' as const,
        },
      ],
    },
  ];
};

export const vehicleCarouselSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: 'Vehículos destacados',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'text' as const,
      defaultValue: 'Descubre nuestra selección de vehículos',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'textColor',
      label: 'Color de texto',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'buttonText',
      label: 'Texto del botón',
      type: 'text' as const,
      defaultValue: 'Ver todos',
    },
    {
      name: 'buttonLink',
      label: 'Enlace del botón',
      type: 'text' as const,
      defaultValue: '/vehicles',
    },
    {
      name: 'buttonBgColor',
      label: 'Color de fondo del botón',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'buttonTextColor',
      label: 'Color de texto del botón',
      type: 'color' as const,
      defaultValue: clientDefaults.secondaryColor,
    },
    {
      name: 'newBadgeText',
      label: 'Texto del badge "Recién Publicado"',
      type: 'text' as const,
      defaultValue: 'Recién publicado',
    },
    {
      name: 'cardSettings',
      label: 'Configuración de tarjetas',
      type: 'complex' as const,
      defaultValue: [
        {
          cardBgColor: '#ffffff',
          cardBorderColor: '#e5e7eb',
          cardTextColor: '#1f2937',
          cardPriceColor: '#ffffff',
          cardButtonColor: '#3b82f6',
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
      fields: [
        {
          name: 'cardBgColor',
          label: 'Color de fondo de tarjeta',
          type: 'color' as const,
          defaultValue: '#ffffff',
        },
        {
          name: 'cardBorderColor',
          label: 'Color de borde de tarjeta',
          type: 'color' as const,
          defaultValue: '#e5e7eb',
        },
        {
          name: 'cardTextColor',
          label: 'Color de texto de tarjeta',
          type: 'color' as const,
          defaultValue: '#1f2937',
        },

        {
          name: 'cardButtonColor',
          label: 'Color de botón de tarjeta',
          type: 'color' as const,
          defaultValue: '#3b82f6',
        },
        {
          name: 'cardButtonTextColor',
          label: 'Color de fondo del botón',
          type: 'color' as const,
          defaultValue: '#ffffff',
        },
        {
          name: 'detailsButtonText',
          label: 'Texto del botón de detalles',
          type: 'text' as const,
          defaultValue: 'Ver detalles',
        },
        {
          name: 'featuresConfig',
          label: 'Configuración de características',
          type: 'complex' as const,
          defaultValue: {
            feature1: 'category',
            feature2: 'year',
            feature3: 'fuel',
            feature4: 'mileage',
          },
          fields: [
            {
              name: 'feature1',
              label: 'Característica 1',
              type: 'select' as const,
              defaultValue: 'category',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature2',
              label: 'Característica 2',
              type: 'select' as const,
              defaultValue: 'year',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature3',
              label: 'Característica 3',
              type: 'select' as const,
              defaultValue: 'fuel',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature4',
              label: 'Característica 4',
              type: 'select' as const,
              defaultValue: 'mileage',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
          ],
        },
        {
          name: 'bannerPosition',
          label: 'Posición del Banner (Vendido/Reservado)',
          type: 'select' as const,
          defaultValue: 'right',
          options: [
            { value: 'right', label: 'Derecha' },
            { value: 'left', label: 'Izquierda' },
          ],
        },
        {
          name: 'pricePosition',
          label: 'Posición del Precio',
          type: 'select' as const,
          defaultValue: 'overlay',
          options: [
            { value: 'overlay', label: 'Sobre la imagen (actual)' },
            { value: 'below-title', label: 'Debajo del título' },
          ],
        },
      ],
    },
  ];
};

export const vehicleGridSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: 'Nuestros vehículos',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'text' as const,
      defaultValue: 'Explora nuestro inventario de vehículos disponibles',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'textColor',
      label: 'Color de texto',
      type: 'color' as const,
      defaultValue: '#333333',
    },
    {
      name: 'columns',
      label: 'Columnas',
      type: 'select' as const,
      defaultValue: '3',
      options: [
        { value: '2', label: '2 Columnas' },
        { value: '3', label: '3 Columnas' },
        { value: '4', label: '4 Columnas' },
      ],
    },
    {
      name: 'newBadgeText',
      label: 'Texto del badge "Recién Publicado"',
      type: 'text' as const,
      defaultValue: 'Recién publicado',
    },
    {
      name: 'filterButtonColors',
      label: 'Colores de Botones de Filtro',
      type: 'complex' as const,
      defaultValue: [
        {
          buttonBgColor: '#ffffff',
          buttonTextColor: '#8c8c8c',
          buttonBorderColor: '#454545',
          activeButtonBgColor: clientDefaults.primaryColor,
          activeButtonTextColor: '#ffffff',
          activeButtonBorderColor: clientDefaults.primaryColor,
          containerBgColor: '#ffffff',
          containerBorderColor: '#e5e7eb',
        },
      ],
      fields: [
        {
          name: 'buttonBgColor',
          label: 'Color de fondo del botón (inactivo)',
          type: 'color' as const,
          defaultValue: '#ffffff',
        },
        {
          name: 'buttonTextColor',
          label: 'Color de texto del botón (inactivo)',
          type: 'color' as const,
          defaultValue: '#8c8c8c',
        },
        {
          name: 'buttonBorderColor',
          label: 'Color de borde del botón (inactivo)',
          type: 'color' as const,
          defaultValue: '#454545',
        },
        {
          name: 'activeButtonBgColor',
          label: 'Color de fondo del botón (activo)',
          type: 'color' as const,
          defaultValue: '#224887',
        },
        {
          name: 'activeButtonTextColor',
          label: 'Color de texto del botón (activo)',
          type: 'color' as const,
          defaultValue: '#ffffff',
        },
        {
          name: 'activeButtonBorderColor',
          label: 'Color de borde del botón (activo)',
          type: 'color' as const,
          defaultValue: '#3b82f6',
        },
        {
          name: 'containerBgColor',
          label: 'Color de fondo del contenedor',
          type: 'color' as const,
          defaultValue: '#f8fafc',
        },
        {
          name: 'containerBorderColor',
          label: 'Color de borde del contenedor',
          type: 'color' as const,
          defaultValue: '#e2e8f0',
        },
      ],
    },
    {
      name: 'cardSettings',
      label: 'Configuración de tarjetas',
      type: 'complex' as const,
      defaultValue: [
        {
          cardBgColor: '#ffffff',
          cardBorderColor: '#e5e7eb',
          cardTextColor: '#1f2937',
          cardPriceColor: '#ffffff',
          cardButtonColor: '#3b82f6',
          cardButtonTextColor: '#ffffff',
          detailsButtonText: 'Ver detalles',
          bannerPosition: 'right',
          pricePosition: 'overlay',
        },
      ],
      fields: [
        {
          name: 'cardBgColor',
          label: 'Color de fondo de tarjeta',
          type: 'color' as const,
          defaultValue: '#ffffff',
        },
        {
          name: 'cardBorderColor',
          label: 'Color de borde de tarjeta',
          type: 'color' as const,
          defaultValue: '#e5e7eb',
        },
        {
          name: 'cardTextColor',
          label: 'Color de texto de tarjeta',
          type: 'color' as const,
          defaultValue: '#1f2937',
        },

        {
          name: 'cardButtonColor',
          label: 'Color del borde del botón de tarjeta',
          type: 'color' as const,
          defaultValue: '#3b82f6',
        },
        {
          name: 'cardButtonTextColor',
          label: 'Color de fondo del botón',
          type: 'color' as const,
          defaultValue: '#ffffff',
        },
        {
          name: 'detailsButtonText',
          label: 'Texto del botón de detalles',
          type: 'text' as const,
          defaultValue: 'Ver detalles',
        },
        {
          name: 'featuresConfig',
          label: 'Configuración de características',
          type: 'complex' as const,
          defaultValue: {
            feature1: 'category',
            feature2: 'year',
            feature3: 'fuel',
            feature4: 'mileage',
          },
          fields: [
            {
              name: 'feature1',
              label: 'Característica 1',
              type: 'select' as const,
              defaultValue: 'category',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature2',
              label: 'Característica 2',
              type: 'select' as const,
              defaultValue: 'year',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature3',
              label: 'Característica 3',
              type: 'select' as const,
              defaultValue: 'fuel',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature4',
              label: 'Característica 4',
              type: 'select' as const,
              defaultValue: 'mileage',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
          ],
        },
        {
          name: 'bannerPosition',
          label: 'Posición del Banner (Vendido/Reservado)',
          type: 'select' as const,
          defaultValue: 'right',
          options: [
            { value: 'right', label: 'Derecha' },
            { value: 'left', label: 'Izquierda' },
          ],
        },
        {
          name: 'pricePosition',
          label: 'Posición del Precio',
          type: 'select' as const,
          defaultValue: 'overlay',
          options: [
            { value: 'overlay', label: 'Sobre la imagen (actual)' },
            { value: 'below-title', label: 'Debajo del título' },
          ],
        },
      ],
    },
  ];
};

export const howToArriveSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: '¿Cómo llegar?',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      defaultValue: 'Encuentranos en la siguiente dirección:',
      rows: 2,
    },
    {
      name: 'titleAlignment',
      label: 'Alineación del título y subtítulo',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
      ],
    },
    {
      name: 'height',
      label: 'Altura del mapa',
      type: 'text' as const,
      defaultValue: '400px',
    },
  ];
};

export const videoEmbedSettings = [
  {
    name: 'videoUrl',
    label: 'URL del Video (YouTube/Vimeo)',
    type: 'text' as const,
    defaultValue: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    name: 'title',
    label: 'Título',
    type: 'text' as const,
    defaultValue: 'Título del Video Impactante',
  },
  {
    name: 'subtitle',
    label: 'Subtítulo',
    type: 'textarea' as const,
    rows: 2,
    defaultValue: 'Atrae a tus visitantes con contenido visual atractivo.',
  },
  {
    name: 'bgColor',
    label: 'Color de Fondo de Sección',
    type: 'color' as const,
    defaultValue: '#f7fafc',
  },
  {
    name: 'textColor',
    label: 'Color de Texto (Título/Subtítulo)',
    type: 'color' as const,
    defaultValue: '#1a202c',
  },
  {
    name: 'aspectRatio',
    label: 'Relación de Aspecto del Video',
    type: 'select' as const,
    defaultValue: '16:9',
    options: [
      { value: '16:9', label: '16:9 (Panorámico)' },
      { value: '4:3', label: '4:3 (Estándar)' },
      { value: '1:1', label: '1:1 (Cuadrado)' },
      { value: '21:9', label: '21:9 (Cinemascope)' },
    ],
  },
  {
    name: 'maxWidth',
    label: 'Ancho Máximo del Contenedor del Video',
    type: 'text' as const,
    defaultValue: '800px',
    placeholder: 'Ej: 800px, 100%, 60rem',
  },
];

export const heroWelcomeSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título (antes del nombre)',
      type: 'text' as const,
      defaultValue: 'Bienvenido a',
    },
    {
      name: 'highlightedText',
      label: 'Texto destacado (nombre empresa)',
      type: 'text' as const,
      defaultValue: clientDefaults.companyName,
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      defaultValue: 'Encuentra tu próximo vehículo con nuestra búsqueda inteligente',
      rows: 2,
    },
    {
      name: 'searchPlaceholder',
      label: 'Placeholder del buscador',
      type: 'text' as const,
      defaultValue: 'Toyota Corolla blanco',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'textColor',
      label: 'Color de texto',
      type: 'color' as const,
      defaultValue: '#111827',
    },
    {
      name: 'highlightColor',
      label: 'Color del texto destacado',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
  ];
};

export const contactCTASettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: '¿Listo para encontrar tu auto ideal?',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'text' as const,
      defaultValue: 'Contáctanos hoy mismo',
    },
    {
      name: 'buttonText',
      label: 'Texto del botón',
      type: 'text' as const,
      defaultValue: 'Contáctanos',
    },
    {
      name: 'buttonLink',
      label: 'Enlace del botón',
      type: 'text' as const,
      defaultValue: '/contact',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'textColor',
      label: 'Color de texto',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'buttonBgColor',
      label: 'Color de fondo del botón',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'buttonTextColor',
      label: 'Color de texto del botón',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
  ];
};

export const vehicleGrid2Settings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: 'Explora nuestro stock',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'text' as const,
      defaultValue: '',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'textColor',
      label: 'Color de texto',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'columns',
      label: 'Columnas',
      type: 'select' as const,
      defaultValue: '3',
      options: [
        { value: '2', label: '2 Columnas' },
        { value: '3', label: '3 Columnas' },
        { value: '4', label: '4 Columnas' },
      ],
    },
    {
      name: 'newBadgeText',
      label: 'Texto del badge "Recién Publicado"',
      type: 'text' as const,
      defaultValue: 'Recién publicado',
    },
    {
      name: 'cardSettings',
      label: 'Configuración de tarjetas',
      type: 'complex' as const,
      defaultValue: [
        {
          cardBgColor: '#ffffff',
          cardBorderColor: '#e5e7eb',
          cardTextColor: '#1f2937',
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
      ],
      fields: [
        {
          name: 'cardBgColor',
          label: 'Color de fondo de tarjeta',
          type: 'color' as const,
          defaultValue: '#ffffff',
        },
        {
          name: 'cardBorderColor',
          label: 'Color de borde de tarjeta',
          type: 'color' as const,
          defaultValue: '#e5e7eb',
        },
        {
          name: 'cardTextColor',
          label: 'Color de texto de tarjeta',
          type: 'color' as const,
          defaultValue: '#1f2937',
        },
        {
          name: 'cardButtonColor',
          label: 'Color del botón de tarjeta',
          type: 'color' as const,
          defaultValue: clientDefaults.primaryColor,
        },
        {
          name: 'cardButtonTextColor',
          label: 'Color de texto del botón',
          type: 'color' as const,
          defaultValue: '#ffffff',
        },
        {
          name: 'detailsButtonText',
          label: 'Texto del botón de detalles',
          type: 'text' as const,
          defaultValue: 'Ver detalles',
        },
        {
          name: 'featuresConfig',
          label: 'Configuración de características',
          type: 'complex' as const,
          defaultValue: {
            feature1: 'category',
            feature2: 'year',
            feature3: 'fuel',
            feature4: 'mileage',
          },
          fields: [
            {
              name: 'feature1',
              label: 'Característica 1',
              type: 'select' as const,
              defaultValue: 'category',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature2',
              label: 'Característica 2',
              type: 'select' as const,
              defaultValue: 'year',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature3',
              label: 'Característica 3',
              type: 'select' as const,
              defaultValue: 'fuel',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
            {
              name: 'feature4',
              label: 'Característica 4',
              type: 'select' as const,
              defaultValue: 'mileage',
              options: [
                { value: 'category', label: 'Categoría' },
                { value: 'year', label: 'Año' },
                { value: 'fuel', label: 'Tipo de Combustible' },
                { value: 'mileage', label: 'Kilometraje' },
                { value: 'transmission', label: 'Transmisión' },
              ],
            },
          ],
        },
        {
          name: 'bannerPosition',
          label: 'Posición del Banner (Vendido/Reservado)',
          type: 'select' as const,
          defaultValue: 'right',
          options: [
            { value: 'right', label: 'Derecha' },
            { value: 'left', label: 'Izquierda' },
          ],
        },
        {
          name: 'pricePosition',
          label: 'Posición del Precio',
          type: 'select' as const,
          defaultValue: 'overlay',
          options: [
            { value: 'overlay', label: 'Sobre la imagen (actual)' },
            { value: 'below-title', label: 'Debajo del título' },
          ],
        },
      ],
    },
  ];
};

export const heroWithLogoSettings = (client: any) => {
  console.log('🔧 heroWithLogoSettings - Cliente recibido:', client);
  console.log('🔧 heroWithLogoSettings - Logo:', client?.logo);
  const clientDefaults = getClientDefaults(client);
  console.log('🔧 heroWithLogoSettings - ClientDefaults:', clientDefaults);

  return [
    {
      name: 'carruselImages',
      label: 'Imágenes carrusel',
      type: 'group' as const,
      fields: [
        {
          name: 'backgroundImage',
          label: 'Imagen de fondo 1',
          type: 'imageSelector' as const,
          placeholder:
            'Arrastra una imagen de fondo aquí o haz clic para seleccionar',
        },
        {
          name: 'backgroundImage2',
          label: 'Imagen de fondo 2',
          type: 'imageSelector' as const,
          placeholder:
            'Arrastra una imagen de fondo aquí o haz clic para seleccionar',
        },
        {
          name: 'backgroundImage3',
          label: 'Imagen de fondo 3',
          type: 'imageSelector' as const,
          placeholder:
            'Arrastra una imagen de fondo aquí o haz clic para seleccionar',
        },
        {
          name: 'backgroundImage4',
          label: 'Imagen de fondo 4',
          type: 'imageSelector' as const,
          placeholder:
            'Arrastra una imagen de fondo aquí o haz clic para seleccionar',
        },
      ],
    },
    {
      name: 'logoUrl',
      label: 'Logo',
      type: 'imageSelector' as const,
      placeholder: 'Arrastra el logo aquí o haz clic para seleccionar',
      defaultValue: clientDefaults.logoUrl || '',
    },
    {
      name: 'logoText',
      label: 'Texto del logo',
      type: 'text' as const,
      defaultValue: clientDefaults.companyName || 'Automotora',
    },
    {
      name: 'logoScale',
      label: 'Tamaño del logo',
      type: 'range' as const,
      defaultValue: 1,
      min: 0.5,
      max: 2,
      step: 0.1,
    },
    {
      name: 'buttonText',
      label: 'Texto del botón',
      type: 'text' as const,
      defaultValue: 'Ver Stock Completo',
    },
    {
      name: 'buttonLink',
      label: 'Link del botón',
      type: 'text' as const,
      defaultValue: '/vehicles',
    },
    {
      name: 'buttonBgColor',
      label: 'Color de fondo del botón',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor || '#1e3a8a',
    },
    {
      name: 'buttonTextColor',
      label: 'Color del texto del botón',
      type: 'color' as const,
      defaultValue: clientDefaults.secondaryColor || '#ffffff',
    },
    {
      name: 'buttonBorderColor',
      label: 'Color del borde del botón',
      type: 'color' as const,
      defaultValue: '#000000',
    },
    {
      name: 'buttonBorderWidth',
      label: 'Grosor del borde',
      type: 'range' as const,
      defaultValue: 0,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      name: 'buttonBorderRadius',
      label: 'Bordes redondeados',
      type: 'range' as const,
      defaultValue: 8,
      min: 0,
      max: 50,
      step: 1,
    },

    {
      name: 'overlayColor',
      label: 'Color del overlay',
      type: 'color' as const,
      defaultValue: '#000000',
    },
    {
      name: 'overlayOpacity',
      label: 'Opacidad del overlay',
      type: 'range' as const,
      defaultValue: 0.3,
      min: 0,
      max: 1,
      step: 0.1,
    },
    {
      name: 'height',
      label: 'Altura',
      type: 'text' as const,
      defaultValue: '600px',
    },
  ];
};

// ── New Base Component Settings ──

export const buttonSettings = [
  {
    name: 'text',
    label: 'Texto del botón',
    type: 'text' as const,
    defaultValue: 'Click aquí',
  },
  {
    name: 'link',
    label: 'Enlace (URL)',
    helpText: 'A dónde lleva al hacer clic. Ej: https://... o /vehicles',
    type: 'text' as const,
    defaultValue: '#',
  },
  {
    name: 'variant',
    label: 'Estilo',
    type: 'select' as const,
    defaultValue: 'primary',
    options: [
      { value: 'primary', label: 'Relleno' },
      { value: 'secondary', label: 'Suave' },
      { value: 'outline', label: 'Contorno' },
      { value: 'ghost', label: 'Transparente' },
    ],
  },
  {
    name: 'bgColor',
    label: 'Color de fondo',
    type: 'color' as const,
    defaultValue: '#3b82f6',
  },
  {
    name: 'textColor',
    label: 'Color del texto',
    type: 'color' as const,
    defaultValue: '#ffffff',
  },
  {
    name: 'fontSize',
    label: 'Tamaño del texto (px)',
    type: 'range' as const,
    defaultValue: 16,
    min: 10,
    max: 48,
    step: 1,
  },
  {
    name: 'size',
    label: 'Tamaño del botón',
    helpText: 'Controla el relleno (qué tan grande es el botón alrededor del texto).',
    type: 'select' as const,
    defaultValue: 'md',
    options: [
      { value: 'sm', label: 'Pequeño' },
      { value: 'md', label: 'Mediano' },
      { value: 'lg', label: 'Grande' },
    ],
  },
  {
    name: 'borderRadius',
    label: 'Bordes redondeados',
    type: 'range' as const,
    defaultValue: 8,
    min: 0,
    max: 50,
    step: 1,
  },
  {
    name: 'align',
    label: 'Alineación',
    type: 'select' as const,
    defaultValue: 'left',
    options: [
      { value: 'left', label: 'Izquierda' },
      { value: 'center', label: 'Centro' },
      { value: 'right', label: 'Derecha' },
    ],
  },
  {
    name: 'fullWidth',
    label: 'Ancho completo',
    helpText: 'El botón ocupa todo el ancho disponible.',
    type: 'toggle' as const,
    defaultValue: false,
  },
];

export const gridSettings = [
  {
    name: 'columns',
    label: 'Columnas',
    helpText: 'Cuántas columnas tiene la grilla. El contenido que sueltes se acomoda solo.',
    type: 'range' as const,
    defaultValue: 3,
    min: 1,
    max: 6,
    step: 1,
  },
  {
    name: 'gap',
    label: 'Espacio entre celdas (px)',
    type: 'range' as const,
    defaultValue: 16,
    min: 0,
    max: 64,
    step: 1,
  },
  {
    name: 'rowMinHeight',
    label: 'Alto mínimo de fila (px)',
    type: 'number' as const,
    defaultValue: 100,
    min: 20,
    max: 600,
    step: 10,
  },
  {
    name: 'maxWidth',
    label: 'Ancho máximo (px)',
    helpText: '0 = sin límite (ancho completo). Con un valor, la grilla se limita a ese ancho y queda centrada.',
    type: 'number' as const,
    defaultValue: 0,
    min: 0,
    max: 2000,
    step: 10,
  },
  {
    name: 'maxHeight',
    label: 'Alto máximo (px)',
    helpText: '0 = sin límite (crece con el contenido). Con un valor, si el contenido pasa esa altura aparece scroll.',
    type: 'number' as const,
    defaultValue: 0,
    min: 0,
    max: 2000,
    step: 10,
  },
  {
    name: 'background',
    label: 'Color de fondo',
    type: 'color' as const,
    defaultValue: '#ffffff',
  },
  {
    name: 'padding',
    label: 'Espacio interior (px)',
    type: 'number' as const,
    defaultValue: 16,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    name: 'margin',
    label: 'Margen vertical (px)',
    type: 'number' as const,
    defaultValue: 0,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    name: 'borderRadius',
    label: 'Bordes redondeados',
    type: 'range' as const,
    defaultValue: 0,
    min: 0,
    max: 50,
    step: 1,
  },
  {
    name: 'justifyItems',
    label: 'Alineación horizontal del contenido',
    type: 'select' as const,
    defaultValue: 'stretch',
    options: [
      { value: 'stretch', label: 'Estirar' },
      { value: 'start', label: 'Izquierda' },
      { value: 'center', label: 'Centro' },
      { value: 'end', label: 'Derecha' },
    ],
  },
  {
    name: 'alignItems',
    label: 'Alineación vertical del contenido',
    type: 'select' as const,
    defaultValue: 'stretch',
    options: [
      { value: 'stretch', label: 'Estirar' },
      { value: 'start', label: 'Arriba' },
      { value: 'center', label: 'Centro' },
      { value: 'end', label: 'Abajo' },
    ],
  },
];

export const headingSettings = [
  {
    name: 'text',
    label: 'Texto',
    type: 'text' as const,
    defaultValue: 'Título de sección',
  },
  {
    name: 'level',
    label: 'Nivel de encabezado',
    type: 'select' as const,
    defaultValue: 'h2',
    options: [
      { value: 'h1', label: 'H1 - Principal' },
      { value: 'h2', label: 'H2 - Sección' },
      { value: 'h3', label: 'H3 - Subsección' },
      { value: 'h4', label: 'H4 - Subtítulo' },
      { value: 'h5', label: 'H5 - Pequeño' },
      { value: 'h6', label: 'H6 - Mini' },
    ],
  },
  {
    name: 'color',
    label: 'Color',
    type: 'color' as const,
    defaultValue: '#111827',
  },
  {
    name: 'textAlign',
    label: 'Alineación',
    type: 'select' as const,
    defaultValue: 'left',
    options: [
      { value: 'left', label: 'Izquierda' },
      { value: 'center', label: 'Centro' },
      { value: 'right', label: 'Derecha' },
    ],
  },
  {
    name: 'fontWeight',
    label: 'Peso de fuente',
    type: 'select' as const,
    defaultValue: '700',
    options: [
      { value: '400', label: 'Normal' },
      { value: '500', label: 'Medio' },
      { value: '600', label: 'Semi Bold' },
      { value: '700', label: 'Bold' },
      { value: '800', label: 'Extra Bold' },
      { value: '900', label: 'Black' },
    ],
  },
];

export const dividerSettings = [
  {
    name: 'color',
    label: 'Color',
    type: 'color' as const,
    defaultValue: '#e5e7eb',
  },
  {
    name: 'thickness',
    label: 'Grosor (px)',
    type: 'number' as const,
    defaultValue: 1,
    min: 1,
    max: 10,
    step: 1,
  },
  {
    name: 'marginY',
    label: 'Margen vertical (px)',
    type: 'number' as const,
    defaultValue: 16,
    min: 0,
    max: 100,
    step: 4,
  },
  {
    name: 'style',
    label: 'Estilo',
    type: 'select' as const,
    defaultValue: 'solid',
    options: [
      { value: 'solid', label: 'Sólido' },
      { value: 'dashed', label: 'Guiones' },
      { value: 'dotted', label: 'Puntos' },
    ],
  },
  {
    name: 'width',
    label: 'Ancho',
    type: 'select' as const,
    defaultValue: '100%',
    options: [
      { value: '100%', label: '100%' },
      { value: '75%', label: '75%' },
      { value: '50%', label: '50%' },
      { value: '25%', label: '25%' },
    ],
  },
];

export const spacerSettings = [
  {
    name: 'height',
    label: 'Altura (px)',
    type: 'number' as const,
    defaultValue: 40,
    min: 8,
    max: 200,
    step: 8,
  },
];

export const socialLinksSettings = [
  {
    name: 'links',
    label: 'Redes sociales',
    type: 'complex' as const,
    defaultValue: [
      { platform: 'facebook', url: 'https://facebook.com' },
      { platform: 'instagram', url: 'https://instagram.com' },
      { platform: 'whatsapp', url: 'https://wa.me/56912345678' },
    ],
    fields: [
      {
        name: 'platform',
        label: 'Plataforma',
        type: 'select' as const,
        options: [
          { value: 'facebook', label: 'Facebook' },
          { value: 'instagram', label: 'Instagram' },
          { value: 'twitter', label: 'Twitter/X' },
          { value: 'youtube', label: 'YouTube' },
          { value: 'linkedin', label: 'LinkedIn' },
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'website', label: 'Sitio web' },
        ],
      },
      {
        name: 'url',
        label: 'URL',
        type: 'text' as const,
      },
    ],
  },
  {
    name: 'iconSize',
    label: 'Tamaño de iconos',
    type: 'number' as const,
    defaultValue: 24,
    min: 16,
    max: 48,
    step: 4,
  },
  {
    name: 'iconColor',
    label: 'Color de iconos',
    type: 'color' as const,
    defaultValue: '#374151',
  },
  {
    name: 'layout',
    label: 'Disposición',
    type: 'select' as const,
    defaultValue: 'horizontal',
    options: [
      { value: 'horizontal', label: 'Horizontal' },
      { value: 'vertical', label: 'Vertical' },
    ],
  },
];

export const iconSettings = [
  {
    name: 'name',
    label: 'Icono',
    type: 'select' as const,
    defaultValue: 'star',
    options: [
      { value: 'star', label: 'Estrella' },
      { value: 'heart', label: 'Corazón' },
      { value: 'check', label: 'Check' },
      { value: 'phone', label: 'Teléfono' },
      { value: 'mail', label: 'Email' },
      { value: 'map-pin', label: 'Ubicación' },
      { value: 'clock', label: 'Reloj' },
      { value: 'shield', label: 'Escudo' },
      { value: 'car', label: 'Auto' },
      { value: 'dollar', label: 'Dólar' },
      { value: 'users', label: 'Usuarios' },
      { value: 'settings', label: 'Configuración' },
      { value: 'home', label: 'Inicio' },
      { value: 'award', label: 'Premio' },
      { value: 'zap', label: 'Rayo' },
      { value: 'thumbs-up', label: 'Me gusta' },
    ],
  },
  {
    name: 'size',
    label: 'Tamaño',
    type: 'number' as const,
    defaultValue: 24,
    min: 12,
    max: 96,
    step: 4,
  },
  {
    name: 'color',
    label: 'Color',
    type: 'color' as const,
    defaultValue: '#374151',
  },
];

// ── New Section Settings ──

export const footerSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#111827',
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#9ca3af',
    },
    {
      name: 'headingColor',
      label: 'Color de títulos',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'dividerColor',
      label: 'Color del divisor',
      type: 'color' as const,
      defaultValue: '#1f2937',
    },
    {
      name: 'socialIconBgColor',
      label: 'Fondo iconos sociales',
      type: 'color' as const,
      defaultValue: '#1f2937',
    },
    {
      name: 'copyrightText',
      label: 'Texto de copyright',
      type: 'text' as const,
      defaultValue: `© ${new Date().getFullYear()} ${clientDefaults.companyName}. Todos los derechos reservados.`,
    },
    {
      name: 'logoUrl',
      label: 'Logo',
      type: 'imageSelector' as const,
      placeholder: 'Seleccionar logo',
    },
    {
      name: 'showSocial',
      label: 'Mostrar redes sociales',
      type: 'toggle' as const,
      defaultValue: true,
    },
    {
      name: 'socialLinks',
      label: 'Redes sociales',
      type: 'complex' as const,
      defaultValue: [
        { platform: 'facebook', url: '' },
        { platform: 'instagram', url: '' },
        { platform: 'whatsapp', url: '' },
      ],
      fields: [
        {
          name: 'platform',
          label: 'Plataforma',
          type: 'select' as const,
          options: [
            { value: 'facebook', label: 'Facebook' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'twitter', label: 'Twitter/X' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'whatsapp', label: 'WhatsApp' },
          ],
        },
        { name: 'url', label: 'URL (o teléfono p/ WhatsApp)', type: 'text' as const },
      ],
    },
  ];
};

export const statsCounterSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#111827',
    },
    {
      name: 'accentColor',
      label: 'Color de acentuación',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'columns',
      label: 'Columnas',
      type: 'select' as const,
      defaultValue: '4',
      options: [
        { value: '2', label: '2 columnas' },
        { value: '3', label: '3 columnas' },
        { value: '4', label: '4 columnas' },
      ],
    },
    {
      name: 'stats',
      label: 'Estadísticas',
      type: 'complex' as const,
      defaultValue: [
        { value: '500+', label: 'Vehículos vendidos', prefix: '', suffix: '' },
        { value: '98%', label: 'Clientes satisfechos', prefix: '', suffix: '' },
        { value: '10+', label: 'Años de experiencia', prefix: '', suffix: '' },
        { value: '24h', label: 'Tiempo de respuesta', prefix: '', suffix: '' },
      ],
      fields: [
        { name: 'value', label: 'Valor', type: 'text' as const },
        { name: 'label', label: 'Etiqueta', type: 'text' as const },
        { name: 'prefix', label: 'Prefijo', type: 'text' as const },
        { name: 'suffix', label: 'Sufijo', type: 'text' as const },
      ],
    },
  ];
};

export const promoBannerSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'text',
      label: 'Texto principal',
      type: 'text' as const,
      defaultValue: '¡Oferta especial este mes! Financiamiento desde 0% de interés',
    },
    {
      name: 'ctaText',
      label: 'Texto del botón',
      type: 'text' as const,
      defaultValue: 'Ver ofertas',
    },
    {
      name: 'ctaLink',
      label: 'Enlace del botón',
      type: 'text' as const,
      defaultValue: '#vehicles',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'icon',
      label: 'Icono',
      type: 'select' as const,
      defaultValue: 'megaphone',
      options: [
        { value: 'megaphone', label: 'Megáfono' },
        { value: 'tag', label: 'Etiqueta' },
        { value: 'percent', label: 'Porcentaje' },
        { value: 'gift', label: 'Regalo' },
        { value: 'zap', label: 'Rayo' },
      ],
    },
  ];
};

export const awardsBadgesSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'sectionTitle',
      label: 'Título de la sección',
      type: 'text' as const,
      defaultValue: 'Reconocimientos y certificaciones',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      rows: 2,
      defaultValue:
        'Nuestro trabajo respaldado por las principales instituciones del rubro',
    },
    {
      name: 'titleAlignment',
      label: 'Alineación del encabezado',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
      ],
    },
    {
      name: 'columns',
      label: 'Número de columnas',
      type: 'select' as const,
      defaultValue: '3',
      options: [
        { value: '2', label: '2 columnas' },
        { value: '3', label: '3 columnas' },
        { value: '4', label: '4 columnas' },
      ],
    },
    {
      name: 'cardStyle',
      label: 'Estilo de tarjeta',
      type: 'select' as const,
      defaultValue: 'card',
      options: [
        { value: 'card', label: 'Con tarjeta (fondo + sombra)' },
        { value: 'minimal', label: 'Minimalista (sin tarjeta)' },
      ],
    },
    {
      name: 'iconPosition',
      label: 'Posición del icono',
      type: 'select' as const,
      defaultValue: 'top',
      options: [
        { value: 'top', label: 'Arriba del texto' },
        { value: 'left', label: 'A la izquierda' },
      ],
    },
    {
      name: 'bgColor',
      label: 'Color de fondo de la sección',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'accentColor',
      label: 'Color de acento (badge del año, línea, fondo del icono)',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
      helpText:
        'Toma por defecto el color primario de la marca configurada para esta automotora.',
    },
    {
      name: 'cardBgColor',
      label: 'Color de fondo de la tarjeta',
      type: 'color' as const,
      defaultValue: '#ffffff',
      helpText: 'Solo aplica si el estilo es "Con tarjeta".',
    },
    {
      name: 'awards',
      label: 'Reconocimiento',
      type: 'complex' as const,
      defaultValue: [
        {
          icon: '',
          title: 'Mejor Automotora',
          year: '2024',
          description: 'Reconocimiento al servicio al cliente',
        },
        {
          icon: '',
          title: 'Concesionario Certificado',
          year: '2023',
          description: 'Estándares de calidad internacionales',
        },
        {
          icon: '',
          title: 'Premio Excelencia',
          year: '2023',
          description: 'Otorgado por AutoChile',
        },
      ],
      fields: [
        {
          name: 'icon',
          label: 'Imagen del sello / medalla / logo',
          type: 'imageSelector' as const,
          helpText:
            'Sube una imagen PNG/JPG/SVG del sello, logo de certificación o medalla. Si lo dejas vacío aparece un placeholder con forma de medalla.',
        },
        {
          name: 'title',
          label: 'Título del reconocimiento',
          type: 'text' as const,
        },
        {
          name: 'year',
          label: 'Año',
          type: 'text' as const,
        },
        {
          name: 'description',
          label: 'Descripción (opcional)',
          type: 'textarea' as const,
          rows: 2,
        },
      ],
    },
  ];
};

export const trustBadgesSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);

  return [
    {
      name: 'sectionTitle',
      label: 'Título de la sección',
      type: 'text' as const,
      defaultValue: '¿Por qué confiar en nosotros?',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      rows: 2,
      defaultValue: 'Compromisos concretos con cada cliente',
    },
    {
      name: 'titleAlignment',
      label: 'Alineación del encabezado',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
      ],
    },
    {
      name: 'columns',
      label: 'Número de columnas',
      type: 'select' as const,
      defaultValue: '4',
      options: [
        { value: '2', label: '2 columnas' },
        { value: '3', label: '3 columnas' },
        { value: '4', label: '4 columnas' },
      ],
    },
    {
      name: 'cardStyle',
      label: 'Estilo de tarjeta',
      type: 'select' as const,
      defaultValue: 'card',
      options: [
        { value: 'card', label: 'Con tarjeta (fondo + sombra)' },
        { value: 'minimal', label: 'Minimalista (sin tarjeta)' },
      ],
    },
    {
      name: 'iconPosition',
      label: 'Posición del icono',
      type: 'select' as const,
      defaultValue: 'top',
      options: [
        { value: 'top', label: 'Arriba del texto' },
        { value: 'left', label: 'A la izquierda' },
      ],
    },
    {
      name: 'bgColor',
      label: 'Color de fondo de la sección',
      type: 'color' as const,
      defaultValue: clientDefaults.backgroundColor,
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: clientDefaults.textColor,
    },
    {
      name: 'accentColor',
      label: 'Color de acento (íconos y detalles)',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
      helpText:
        'Toma por defecto el color primario de la marca configurada para esta automotora.',
    },
    {
      name: 'cardBgColor',
      label: 'Color de fondo de la tarjeta',
      type: 'color' as const,
      defaultValue: '#ffffff',
      helpText: 'Solo aplica si el estilo es "Con tarjeta".',
    },
    {
      name: 'badges',
      label: 'Sello de confianza',
      type: 'complex' as const,
      defaultValue: [
        {
          icon: 'shield-check',
          title: 'Garantía 12 meses',
          subtitle: 'Cobertura completa de motor y transmisión',
        },
        {
          icon: 'search',
          title: 'Inspección 150 puntos',
          subtitle: 'Cada vehículo revisado por mecánicos certificados',
        },
        {
          icon: 'refresh-ccw',
          title: 'Devolución 7 días',
          subtitle: 'Si no quedas conforme, te devolvemos tu plata',
        },
        {
          icon: 'banknote',
          title: 'Financiamiento aprobado',
          subtitle: 'En 24 horas, con o sin pie',
        },
      ],
      fields: [
        {
          name: 'icon',
          label: 'Ícono',
          type: 'select' as const,
          options: [
            { value: 'shield-check', label: 'Escudo con check (Garantía)' },
            { value: 'badge-check', label: 'Insignia verificada (Certificado)' },
            { value: 'award', label: 'Premio' },
            { value: 'search', label: 'Lupa (Inspección)' },
            { value: 'refresh-ccw', label: 'Flechas circulares (Devolución)' },
            { value: 'banknote', label: 'Billete (Financiamiento)' },
            { value: 'clock', label: 'Reloj (Tiempo / 24h)' },
            { value: 'wrench', label: 'Llave inglesa (Mantenimiento)' },
            { value: 'file-check', label: 'Documento con check (Papeles al día)' },
            { value: 'headphones', label: 'Auriculares (Soporte)' },
            { value: 'truck', label: 'Camión (Entrega)' },
            { value: 'lock', label: 'Candado (Transacción segura)' },
            { value: 'sparkles', label: 'Brillos (Premium / Detailing)' },
            { value: 'handshake', label: 'Apretón de manos (Compromiso)' },
            { value: 'thumbs-up', label: 'Pulgar arriba (Calidad)' },
          ],
        },
        {
          name: 'title',
          label: 'Título del sello',
          type: 'text' as const,
        },
        {
          name: 'subtitle',
          label: 'Subtítulo / descripción (opcional)',
          type: 'textarea' as const,
          rows: 2,
        },
      ],
    },
  ];
};

export const photoGallerySettings = [
  {
    name: 'sectionTitle',
    label: 'Título de la sección',
    type: 'text' as const,
    defaultValue: 'Nuestra galería',
  },
  {
    name: 'layout',
    label: 'Disposición',
    type: 'select' as const,
    defaultValue: 'grid',
    options: [
      { value: 'grid', label: 'Cuadrícula' },
      { value: 'masonry', label: 'Mosaico' },
    ],
  },
  {
    name: 'columns',
    label: 'Columnas',
    type: 'select' as const,
    defaultValue: '3',
    options: [
      { value: '2', label: '2 columnas' },
      { value: '3', label: '3 columnas' },
      { value: '4', label: '4 columnas' },
    ],
  },
  {
    name: 'gap',
    label: 'Espaciado (px)',
    type: 'number' as const,
    defaultValue: 8,
    min: 0,
    max: 32,
    step: 4,
  },
  {
    name: 'rounded',
    label: 'Bordes redondeados',
    type: 'select' as const,
    defaultValue: 'true',
    options: [
      { value: 'true', label: 'Sí' },
      { value: 'false', label: 'No' },
    ],
  },
  {
    name: 'showCaptions',
    label: 'Mostrar descripciones',
    type: 'select' as const,
    defaultValue: 'true',
    options: [
      { value: 'true', label: 'Sí' },
      { value: 'false', label: 'No' },
    ],
  },
  {
    name: 'bgColor',
    label: 'Color de fondo',
    type: 'color' as const,
    defaultValue: '#ffffff',
  },
  {
    name: 'textColor',
    label: 'Color del texto',
    type: 'color' as const,
    defaultValue: '#111827',
  },
];

export const imageCarouselSettings = [
  {
    name: 'sectionTitle',
    label: 'Título de la sección',
    type: 'text' as const,
    defaultValue: 'Galería',
    helpText: 'Déjalo vacío si no quieres mostrar un título arriba del carrusel.',
  },
  {
    name: 'separator_images',
    label: 'Imágenes',
    type: 'separator' as const,
    defaultValue: 'Sube las fotos que irán corriendo de lado. Puedes agregar todas las que quieras.',
  },
  {
    name: 'images',
    label: 'Imagen',
    type: 'complex' as const,
    defaultValue: [{ imageUrl: '', caption: '' }],
    fields: [
      { name: 'imageUrl', label: 'Imagen', type: 'imageSelector' as const, placeholder: 'Subir o seleccionar imagen' },
      { name: 'caption', label: 'Descripción (opcional)', type: 'text' as const },
    ],
  },
  {
    name: 'separator_movement',
    label: 'Movimiento',
    type: 'separator' as const,
    defaultValue: '',
  },
  {
    name: 'speed',
    label: 'Velocidad',
    type: 'range' as const,
    defaultValue: 50,
    min: 10,
    max: 150,
    step: 5,
    helpText: 'Más alto = se mueve más rápido.',
  },
  {
    name: 'direction',
    label: 'Dirección',
    type: 'select' as const,
    defaultValue: 'left',
    options: [
      { value: 'left', label: 'Hacia la izquierda' },
      { value: 'right', label: 'Hacia la derecha' },
    ],
  },
  {
    name: 'pauseOnHover',
    label: 'Pausar al pasar el mouse',
    type: 'select' as const,
    defaultValue: 'true',
    options: [
      { value: 'true', label: 'Sí' },
      { value: 'false', label: 'No' },
    ],
  },
  {
    name: 'separator_style',
    label: 'Estilo',
    type: 'separator' as const,
    defaultValue: '',
  },
  {
    name: 'imageHeight',
    label: 'Alto de las imágenes (px)',
    type: 'number' as const,
    defaultValue: 320,
    min: 120,
    max: 600,
    step: 10,
  },
  {
    name: 'gap',
    label: 'Separación entre imágenes (px)',
    type: 'number' as const,
    defaultValue: 16,
    min: 0,
    max: 48,
    step: 2,
  },
  {
    name: 'rounded',
    label: 'Bordes redondeados',
    type: 'select' as const,
    defaultValue: 'true',
    options: [
      { value: 'true', label: 'Sí' },
      { value: 'false', label: 'No' },
    ],
  },
  {
    name: 'showCaptions',
    label: 'Mostrar descripciones',
    type: 'select' as const,
    defaultValue: 'false',
    options: [
      { value: 'true', label: 'Sí' },
      { value: 'false', label: 'No' },
    ],
  },
  {
    name: 'bgColor',
    label: 'Color de fondo',
    type: 'color' as const,
    defaultValue: '#0a0a0a',
  },
  {
    name: 'textColor',
    label: 'Color del texto',
    type: 'color' as const,
    defaultValue: '#ffffff',
  },
];

// ── Moderna section settings ──

export const heroModernoSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: 'Tu próximo auto está en',
    },
    {
      name: 'badgeText',
      label: 'Texto del badge',
      type: 'text' as const,
      defaultValue: 'Tu automotora de confianza',
    },
    {
      name: 'highlightText',
      label: 'Texto destacado (gradient)',
      type: 'text' as const,
      defaultValue: clientDefaults.companyName,
      helpText: 'Se mostrará con efecto gradient',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      rows: 2,
      defaultValue: 'La mejor selección de vehículos con financiamiento a tu medida y atención personalizada.',
    },
    {
      name: 'buttonText',
      label: 'Texto botón principal',
      type: 'text' as const,
      defaultValue: 'Ver vehículos',
    },
    {
      name: 'buttonLink',
      label: 'Enlace botón principal',
      type: 'text' as const,
      defaultValue: '#vehicles',
    },
    {
      name: 'buttonText2',
      label: 'Texto botón secundario',
      type: 'text' as const,
      defaultValue: 'Contáctanos',
    },
    {
      name: 'buttonLink2',
      label: 'Enlace botón secundario',
      type: 'text' as const,
      defaultValue: '#contact',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#fbfbfd',
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#0f172a',
    },
    {
      name: 'accentColor',
      label: 'Color de acento',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'trustItems',
      label: 'Indicadores de confianza',
      type: 'complex' as const,
      defaultValue: [
        { text: '500+ autos vendidos' },
        { text: '4.9★ en Google' },
        { text: 'Financiamiento 100%' },
        { text: 'Garantía incluida' },
      ],
      fields: [
        { name: 'text', label: 'Texto', type: 'text' as const },
      ],
    },
  ];
};

export const statsModernoSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#0f172a',
    },
    {
      name: 'accentColor',
      label: 'Color de acento',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'stats',
      label: 'Estadísticas',
      type: 'complex' as const,
      defaultValue: [
        { value: '500', suffix: '+', label: 'Vehículos vendidos' },
        { value: '2,000', suffix: '+', label: 'Clientes satisfechos' },
        { value: '15', suffix: '+', label: 'Años de experiencia' },
        { value: '4.9', suffix: '★', label: 'Rating en Google' },
      ],
      fields: [
        { name: 'value', label: 'Valor', type: 'text' as const },
        { name: 'suffix', label: 'Sufijo', type: 'text' as const },
        { name: 'label', label: 'Etiqueta', type: 'text' as const },
      ],
    },
  ];
};

export const testimonialsModernoSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'eyebrowText',
      label: 'Texto superior (eyebrow)',
      type: 'text' as const,
      defaultValue: 'Testimonios',
    },
    {
      name: 'sectionTitle',
      label: 'Título de la sección',
      type: 'text' as const,
      defaultValue: 'Lo que dicen nuestros clientes',
    },
    {
      name: 'sectionSubtitle',
      label: 'Subtítulo de la sección',
      type: 'text' as const,
      defaultValue: 'Experiencias reales de quienes confiaron en nosotros',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#fbfbfd',
    },
    {
      name: 'cardBgColor',
      label: 'Color de fondo tarjetas',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#0f172a',
    },
    {
      name: 'starColor',
      label: 'Color de estrellas',
      type: 'color' as const,
      defaultValue: '#f59e0b',
    },
    {
      name: 'accentColor',
      label: 'Color de acento',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'testimonials',
      label: 'Testimonios',
      type: 'complex' as const,
      defaultValue: [
        { stars: 5, quote: 'Excelente experiencia de compra.', authorName: 'Carlos Méndez', authorRole: 'Cliente desde 2023', avatarUrl: '' },
        { stars: 5, quote: 'El mejor servicio postventa.', authorName: 'María González', authorRole: 'Cliente desde 2022', avatarUrl: '' },
        { stars: 5, quote: 'Financiamiento rápido y transparente.', authorName: 'Roberto Silva', authorRole: 'Cliente desde 2024', avatarUrl: '' },
      ],
      fields: [
        { name: 'stars', label: 'Estrellas (1-5)', type: 'number' as const, min: 1, max: 5 },
        { name: 'quote', label: 'Cita', type: 'textarea' as const, rows: 2 },
        { name: 'authorName', label: 'Nombre del autor', type: 'text' as const },
        { name: 'authorRole', label: 'Rol/descripción', type: 'text' as const },
        { name: 'avatarUrl', label: 'URL del avatar', type: 'text' as const },
      ],
    },
  ];
};

export const ctaModernoSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'title',
      label: 'Título',
      type: 'text' as const,
      defaultValue: '¿Listo para encontrar tu auto ideal?',
    },
    {
      name: 'subtitle',
      label: 'Subtítulo',
      type: 'textarea' as const,
      rows: 2,
      defaultValue: 'Contáctanos hoy y descubre las mejores opciones de financiamiento.',
    },
    {
      name: 'buttonText',
      label: 'Texto del botón',
      type: 'text' as const,
      defaultValue: 'Comenzar ahora',
    },
    {
      name: 'buttonLink',
      label: 'Enlace del botón',
      type: 'text' as const,
      defaultValue: '#contact',
    },
    {
      name: 'accentColor',
      label: 'Color de acento (gradient)',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
  ];
};

export const footerModernoSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'companyName',
      label: 'Nombre de la empresa',
      type: 'text' as const,
      defaultValue: clientDefaults.companyName,
    },
    {
      name: 'description',
      label: 'Descripción',
      type: 'textarea' as const,
      rows: 3,
      defaultValue: 'Tu aliado de confianza en la compra de vehículos.',
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#0f172a',
    },
    {
      name: 'textColor',
      label: 'Color del texto',
      type: 'color' as const,
      defaultValue: '#94a3b8',
    },
    {
      name: 'headingColor',
      label: 'Color de títulos',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'accentColor',
      label: 'Color de acento',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'dividerColor',
      label: 'Color del divisor',
      type: 'color' as const,
      defaultValue: '#1e293b',
    },
    {
      name: 'socialIconBgColor',
      label: 'Fondo iconos sociales',
      type: 'color' as const,
      defaultValue: '#1e293b',
    },
    {
      name: 'copyrightText',
      label: 'Texto de copyright',
      type: 'text' as const,
      defaultValue: '',
      helpText: 'Déjalo vacío para generar automáticamente',
    },
    {
      name: 'columns',
      label: 'Columnas de enlaces',
      type: 'complex' as const,
      defaultValue: [
        { title: 'Empresa', links: [{ text: 'Sobre nosotros', url: '#about' }, { text: 'Contacto', url: '#contact' }] },
        { title: 'Servicios', links: [{ text: 'Financiamiento', url: '#financing' }, { text: 'Garantía', url: '#warranty' }] },
        { title: 'Legal', links: [{ text: 'Términos', url: '#terms' }, { text: 'Privacidad', url: '#privacy' }] },
      ],
      fields: [
        { name: 'title', label: 'Título de columna', type: 'text' as const },
        {
          name: 'links',
          label: 'Enlaces',
          type: 'complex' as const,
          fields: [
            { name: 'text', label: 'Texto', type: 'text' as const },
            { name: 'url', label: 'URL', type: 'pageUrl' as const },
          ],
        },
      ],
    },
    {
      name: 'socialLinks',
      label: 'Redes sociales',
      type: 'complex' as const,
      defaultValue: [
        { platform: 'facebook', url: '' },
        { platform: 'instagram', url: '' },
        { platform: 'whatsapp', url: '' },
      ],
      fields: [
        {
          name: 'platform',
          label: 'Plataforma',
          type: 'select' as const,
          options: [
            { value: 'facebook', label: 'Facebook' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'twitter', label: 'Twitter/X' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'whatsapp', label: 'WhatsApp' },
          ],
        },
        { name: 'url', label: 'URL (o teléfono p/ WhatsApp)', type: 'text' as const },
      ],
    },
  ];
};

export const teamMembersSettings = [
  {
    name: 'sectionTitle',
    label: 'Título de la sección',
    type: 'text' as const,
    defaultValue: 'Nuestro equipo',
  },
  {
    name: 'eyebrowText',
    label: 'Texto superior',
    type: 'text' as const,
    defaultValue: 'Conócenos',
  },
  {
    name: 'columns',
    label: 'Columnas',
    type: 'select' as const,
    defaultValue: '3',
    options: [
      { value: '2', label: '2 columnas' },
      { value: '3', label: '3 columnas' },
      { value: '4', label: '4 columnas' },
    ],
  },
  {
    name: 'cardStyle',
    label: 'Estilo de tarjeta',
    type: 'select' as const,
    defaultValue: 'grid',
    options: [
      { value: 'grid', label: 'Tarjetas' },
      { value: 'minimal', label: 'Minimalista' },
    ],
  },
  { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: 'Personaliza los colores de esta sección' },
  {
    name: 'bgColor',
    label: 'Color de fondo',
    type: 'color' as const,
    defaultValue: '#ffffff',
  },
  {
    name: 'textColor',
    label: 'Color del texto',
    type: 'color' as const,
    defaultValue: '#1a1a1a',
  },
  {
    name: 'accentColor',
    label: 'Color de acento (roles)',
    type: 'color' as const,
    defaultValue: '#2563eb',
  },
  {
    name: 'bioColor',
    label: 'Color de biografía',
    type: 'color' as const,
    defaultValue: '#6b7280',
  },
  {
    name: 'cardBgColor',
    label: 'Color fondo tarjetas',
    type: 'color' as const,
    defaultValue: '#ffffff',
  },
  {
    name: 'members',
    label: 'Miembros del equipo',
    type: 'complex' as const,
    defaultValue: [
      { name: 'Juan Pérez', role: 'Gerente General', image: '', bio: 'Más de 15 años de experiencia en el sector automotriz.' },
      { name: 'María González', role: 'Asesora de Ventas', image: '', bio: 'Especialista en encontrar el vehículo perfecto para cada cliente.' },
      { name: 'Carlos Rodríguez', role: 'Servicio Técnico', image: '', bio: 'Técnico certificado con amplio conocimiento en mecánica automotriz.' },
    ],
    fields: [
      { name: 'name', label: 'Nombre', type: 'text' as const },
      { name: 'role', label: 'Cargo', type: 'text' as const },
      { name: 'image', label: 'URL de foto', type: 'text' as const },
      { name: 'bio', label: 'Biografía', type: 'textarea' as const, rows: 2 },
    ],
  },
];

// ── Traditional sections ──

export const traditionalWhyUsSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: '¿Por qué elegirnos?' },
    { name: 'subtitle', label: 'Subtítulo', type: 'text' as const, defaultValue: 'Descubre por qué nuestros clientes confían en nosotros' },
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: 'Personaliza los colores de esta sección' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#f8fafc' },
    { name: 'textColor', label: 'Color del título', type: 'color' as const, defaultValue: '#111827' },
    { name: 'subtitleColor', label: 'Color del subtítulo', type: 'color' as const, defaultValue: '#4b5563' },
    { name: 'accentColor', label: 'Color de acento (iconos)', type: 'color' as const, defaultValue: clientDefaults.primaryColor },
    { name: 'cardBgColor', label: 'Color fondo tarjetas', type: 'color' as const, defaultValue: '#ffffff' },
    {
      name: 'items',
      label: 'Características',
      type: 'complex' as const,
      defaultValue: [
        { title: 'Garantía', description: 'Todos nuestros vehículos cuentan con garantía', icon: 'mdi:shield-check' },
        { title: 'Financiamiento', description: 'Opciones de financiamiento flexibles', icon: 'mdi:cash-multiple' },
        { title: 'Calidad', description: 'Vehículos seleccionados y certificados', icon: 'mdi:certificate' },
      ],
      fields: [
        { name: 'title', label: 'Título', type: 'text' as const },
        { name: 'description', label: 'Descripción', type: 'text' as const },
        { name: 'icon', label: 'Icono (mdi:nombre)', type: 'text' as const, helpText: 'Usa iconos de https://icon-sets.iconify.design/ ej: mdi:shield-check' },
      ],
    },
  ];
};

export const traditionalContactCTASettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: '¿Listo para encontrar tu próximo vehículo?' },
    { name: 'subtitle', label: 'Subtítulo', type: 'text' as const, defaultValue: 'Contáctanos hoy mismo.' },
    { name: 'buttonText', label: 'Texto del botón', type: 'text' as const, defaultValue: 'Contáctanos' },
    { name: 'buttonLink', label: 'Enlace del botón', type: 'text' as const, defaultValue: '/contact' },
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: 'Personaliza los colores de esta sección' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'textColor', label: 'Color del texto', type: 'color' as const, defaultValue: '#000000' },
    { name: 'buttonColor', label: 'Color del botón', type: 'color' as const, defaultValue: clientDefaults.primaryColor },
    { name: 'buttonTextColor', label: 'Color texto del botón', type: 'color' as const, defaultValue: '#ffffff' },
  ];
};

export const traditionalHowToArriveSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: '¿Cómo llegar?' },
    { name: 'subtitle', label: 'Subtítulo', type: 'text' as const, defaultValue: 'Encuéntranos en la siguiente dirección:' },
    { name: 'buttonText', label: 'Texto del botón', type: 'text' as const, defaultValue: 'Cómo llegar' },
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: 'Personaliza los colores de esta sección' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#f8fafc' },
    { name: 'textColor', label: 'Color del título', type: 'color' as const, defaultValue: '#111827' },
    { name: 'subtitleColor', label: 'Color del subtítulo', type: 'color' as const, defaultValue: '#4b5563' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: clientDefaults.primaryColor },
  ];
};

export const traditionalVehicleGridSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: 'Personaliza los colores del catálogo de vehículos' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: clientDefaults.primaryColor },
    { name: 'sectionBgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#f8fafc' },
    { name: 'separator_filters', label: 'Barra de filtros', type: 'separator' as const, defaultValue: '' },
    { name: 'filterStyle', label: 'Estilo de filtros', type: 'select' as const, defaultValue: 'buttons', options: [
      { value: 'images', label: 'Con imágenes' },
      { value: 'buttons', label: 'Botones (sin imágenes)' },
    ] },
    { name: 'filterBarBgColor', label: 'Fondo barra filtros', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'filterBarBorderColor', label: 'Borde barra filtros', type: 'color' as const, defaultValue: '#e5e7eb' },
    { name: 'filterTextColor', label: 'Texto filtros inactivos', type: 'color' as const, defaultValue: '#374151' },
    { name: 'filterActiveTextColor', label: 'Texto filtro activo', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'separator_offers', label: 'Pestaña de ofertas (campañas)', type: 'separator' as const, defaultValue: 'Crea una pestaña roja destacada (ej. "Ofertas Cyber") que muestra solo los autos cuya etiqueta contenga la palabra indicada. Si ningún auto tiene esa etiqueta, la pestaña no aparece. Para terminar la campaña, borra las etiquetas de los autos o deja estos campos vacíos.' },
    { name: 'offerTabLabel', label: 'Nombre de la pestaña (ej. Ofertas Cyber)', type: 'text' as const, defaultValue: '' },
    { name: 'offerTabFilter', label: 'Palabra de la etiqueta a filtrar (ej. cyber)', type: 'text' as const, defaultValue: '' },
    { name: 'separator_category_images', label: 'Imágenes de categorías (solo estilo "Con imágenes")', type: 'separator' as const, defaultValue: 'Deja vacío para usar la foto del primer vehículo de cada categoría' },
    { name: 'categoryImage_all', label: 'Imagen: Todos', type: 'imageSelector' as const, defaultValue: '' },
    { name: 'categoryImage_SUV', label: 'Imagen: SUV', type: 'imageSelector' as const, defaultValue: '' },
    { name: 'categoryImage_Sedan', label: 'Imagen: Sedán', type: 'imageSelector' as const, defaultValue: '' },
    { name: 'categoryImage_Hatchback', label: 'Imagen: Hatchback', type: 'imageSelector' as const, defaultValue: '' },
    { name: 'categoryImage_Pickup', label: 'Imagen: Pickup', type: 'imageSelector' as const, defaultValue: '' },
    { name: 'categoryImage_Van', label: 'Imagen: Van', type: 'imageSelector' as const, defaultValue: '' },
    { name: 'categoryImage_Coupe', label: 'Imagen: Coupé', type: 'imageSelector' as const, defaultValue: '' },
    { name: 'categoryImage_Wagon', label: 'Imagen: Wagon', type: 'imageSelector' as const, defaultValue: '' },
    { name: 'separator_cards', label: 'Tarjetas de vehículos', type: 'separator' as const, defaultValue: '' },
    { name: 'cardTitleField', label: 'Título de la tarjeta', type: 'select' as const, defaultValue: 'model', options: [
      { value: 'model', label: 'Modelo (subtítulo: marca)' },
      { value: 'brand', label: 'Marca (subtítulo: modelo)' },
      { value: 'brand_model', label: 'Marca + Modelo (subtítulo: año)' },
    ] },
    { name: 'cardBgColor', label: 'Fondo tarjeta', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'cardBorderColor', label: 'Borde tarjeta', type: 'color' as const, defaultValue: '#e5e7eb' },
    { name: 'cardTitleColor', label: 'Color título', type: 'color' as const, defaultValue: '#171717' },
    { name: 'cardSubtitleColor', label: 'Color subtítulo', type: 'color' as const, defaultValue: '#525252' },
    { name: 'cardSpecsColor', label: 'Color especificaciones', type: 'color' as const, defaultValue: '#262626' },
    { name: 'cardPriceColor', label: 'Color precio', type: 'color' as const, defaultValue: '#171717' },
    { name: 'separator_badges', label: 'Badges de las tarjetas', type: 'separator' as const, defaultValue: 'Elige qué badges se muestran en las tarjetas de vehículos' },
    { name: 'showBadgeCondition', label: 'Condición (Nuevo / Usado)', type: 'toggle' as const, defaultValue: true },
    { name: 'showBadgePromo', label: 'Promocional (Recién llegado, Oportunidad, etc.)', type: 'toggle' as const, defaultValue: true },
    { name: 'showBadgeNew', label: 'Recién llegado (vehículos recientes)', type: 'toggle' as const, defaultValue: true },
    { name: 'showBadgeCustom', label: 'Etiquetas personalizadas del vehículo', type: 'toggle' as const, defaultValue: true },
    { name: 'showRibbonSold', label: 'Cinta "VENDIDO"', type: 'toggle' as const, defaultValue: true },
    { name: 'showRibbonReserved', label: 'Cinta "RESERVADO"', type: 'toggle' as const, defaultValue: true },
    { name: 'showBadgeDiscount', label: 'Precio con descuento', type: 'toggle' as const, defaultValue: true },
    { name: 'separator_grid', label: 'Columnas del grid', type: 'separator' as const, defaultValue: 'Cuántas tarjetas por fila en cada tamaño de pantalla' },
    { name: 'gridColsSm', label: 'Columnas SM (≥640px)', type: 'select' as const, defaultValue: '2', options: [
      { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
    ] },
    { name: 'gridColsMd', label: 'Columnas MD (≥768px)', type: 'select' as const, defaultValue: '3', options: [
      { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
    ] },
    { name: 'gridColsLg', label: 'Columnas LG (≥1024px)', type: 'select' as const, defaultValue: '3', options: [
      { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
    ] },
    { name: 'gridColsXl', label: 'Columnas XL (≥1280px)', type: 'select' as const, defaultValue: '4', options: [
      { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' },
    ] },
    { name: 'separator_texts', label: 'Textos', type: 'separator' as const, defaultValue: '' },
    { name: 'noResultsTitle', label: 'Título sin resultados', type: 'text' as const, defaultValue: 'Sin resultados' },
    { name: 'noResultsText', label: 'Mensaje sin resultados', type: 'text' as const, defaultValue: 'No encontramos vehículos con esos filtros' },
    { name: 'noResultsButtonText', label: 'Botón sin resultados', type: 'text' as const, defaultValue: 'Ver todos los vehículos' },
  ];
};

// ── Premium sections ──

export const heroPremiumSettings = (client: any) => {
  const cd = getClientDefaults(client);
  return [
    { name: 'eyebrowText', label: 'Texto superior', type: 'text' as const, defaultValue: 'Premium Collection' },
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Experiencia automotriz' },
    { name: 'highlightText', label: 'Texto destacado (glow)', type: 'text' as const, defaultValue: cd.companyName },
    { name: 'subtitle', label: 'Subtítulo', type: 'textarea' as const, rows: 2, defaultValue: 'Vehículos seleccionados para quienes exigen lo extraordinario.' },
    { name: 'buttonText', label: 'Texto del botón', type: 'text' as const, defaultValue: 'Explorar vehículos' },
    { name: 'buttonLink', label: 'Enlace del botón', type: 'text' as const, defaultValue: '#vehicles' },
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: '' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#0a0a0a' },
    { name: 'textColor', label: 'Color del texto', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: cd.primaryColor },
  ];
};

export const featureShowcaseSettings = (client: any) => {
  const cd = getClientDefaults(client);
  return [
    { name: 'eyebrowText', label: 'Texto superior', type: 'text' as const, defaultValue: 'Por qué elegirnos' },
    { name: 'sectionTitle', label: 'Título', type: 'text' as const, defaultValue: 'Una experiencia premium en cada detalle' },
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: '' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#0a0a0a' },
    { name: 'textColor', label: 'Color del texto', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: cd.primaryColor },
    {
      name: 'features', label: 'Características', type: 'complex' as const,
      defaultValue: [
        { icon: 'Shield', title: 'Garantía extendida', description: 'Cobertura completa' },
        { icon: 'CreditCard', title: 'Financiamiento flexible', description: 'Planes a tu medida' },
      ],
      fields: [
        { name: 'icon', label: 'Icono (Shield, Clock, CreditCard, Award, Truck, Headphones)', type: 'text' as const },
        { name: 'title', label: 'Título', type: 'text' as const },
        { name: 'description', label: 'Descripción', type: 'text' as const },
      ],
    },
  ];
};

export const testimonialsPremiumSettings = (client: any) => {
  const cd = getClientDefaults(client);
  return [
    { name: 'eyebrowText', label: 'Texto superior', type: 'text' as const, defaultValue: 'Testimonios' },
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: '' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#0f0f0f' },
    { name: 'textColor', label: 'Color del texto', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: cd.primaryColor },
    {
      name: 'testimonials', label: 'Testimonios', type: 'complex' as const,
      defaultValue: [
        { quote: 'Experiencia excepcional.', authorName: 'Carolina V.', authorRole: 'Empresaria' },
      ],
      fields: [
        { name: 'quote', label: 'Cita', type: 'textarea' as const, rows: 2 },
        { name: 'authorName', label: 'Nombre', type: 'text' as const },
        { name: 'authorRole', label: 'Rol', type: 'text' as const },
      ],
    },
  ];
};

export const galleryPremiumSettings = (client: any) => {
  const cd = getClientDefaults(client);
  return [
    { name: 'sectionTitle', label: 'Título', type: 'text' as const, defaultValue: 'Nuestra galería' },
    { name: 'subtitle', label: 'Subtítulo', type: 'text' as const, defaultValue: 'Descubre nuestras instalaciones' },
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: '' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#0a0a0a' },
    { name: 'textColor', label: 'Color del texto', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: cd.primaryColor },
    {
      name: 'images', label: 'Imágenes', type: 'complex' as const,
      defaultValue: [{ imageUrl: '', caption: '' }],
      fields: [
        { name: 'imageUrl', label: 'URL de imagen', type: 'text' as const },
        { name: 'caption', label: 'Descripción', type: 'text' as const },
      ],
    },
  ];
};

export const ctaPremiumSettings = (client: any) => {
  const cd = getClientDefaults(client);
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Agenda tu visita exclusiva' },
    { name: 'subtitle', label: 'Subtítulo', type: 'textarea' as const, rows: 2, defaultValue: 'Reserva una cita personalizada.' },
    { name: 'buttonText', label: 'Texto del botón', type: 'text' as const, defaultValue: 'Reservar ahora' },
    { name: 'buttonLink', label: 'Enlace del botón', type: 'text' as const, defaultValue: '#contact' },
    { name: 'separator_colors', label: 'Colores', type: 'separator' as const, defaultValue: '' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#0a0a0a' },
    { name: 'textColor', label: 'Color del texto', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: cd.primaryColor },
  ];
};

// ── BuilderNavbar Settings ──

export const builderNavbarSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'textColor',
      label: 'Color de los links',
      type: 'color' as const,
      defaultValue: '#4b5563',
    },
    {
      name: 'ctaText',
      label: 'Texto del botón CTA',
      type: 'text' as const,
      defaultValue: 'Contacto',
    },
    {
      name: 'ctaUrl',
      label: 'Enlace del botón CTA',
      type: 'pageUrl' as const,
      defaultValue: '/contact',
    },
    {
      name: 'ctaBgColor',
      label: 'Color del botón CTA',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'ctaTextColor',
      label: 'Color texto del botón CTA',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'logoUrl',
      label: 'Logo',
      type: 'imageSelector' as const,
      placeholder: 'Seleccionar logo',
    },
    {
      name: 'logoHeight',
      label: 'Tamaño del logo (px)',
      type: 'range' as const,
      defaultValue: 36,
      min: 20,
      max: 100,
      step: 2,
    },
    {
      name: 'links',
      label: 'Links de navegación',
      type: 'complex' as const,
      defaultValue: [
        { text: 'Inicio', url: '/' },
        { text: 'Financiamiento', url: '/financing' },
        { text: 'Consignaciones', url: '/consignments' },
        { text: 'Compra directa', url: '/buy-direct' },
      ],
      fields: [
        { name: 'text', label: 'Texto', type: 'text' as const },
        { name: 'url', label: 'URL', type: 'pageUrl' as const },
      ],
    },
    {
      name: 'transparentOnTop',
      label: 'Fondo transparente al inicio (efecto scroll)',
      type: 'toggle' as const,
      defaultValue: true,
    },
    {
      name: 'fullWidth',
      label: 'Ocupar todo el ancho (evita salto de línea en los links)',
      type: 'toggle' as const,
      defaultValue: false,
    },
  ];
};

// ── HeroMega (Mega Cabecera: navbar + hero + buscador) ──

export const heroMegaSettings = (client: any) => {
  const clientDefaults = getClientDefaults(client);
  return [
    {
      name: 'backgroundImage',
      label: 'Imagen de fondo',
      type: 'imageSelector' as const,
      placeholder: 'Arrastra una imagen de fondo aquí o haz clic para seleccionar',
    },
    {
      name: 'titleLine1',
      label: 'Título — primera línea',
      type: 'text' as const,
      defaultValue: 'Encuentra tu',
    },
    {
      name: 'titleLine2',
      label: 'Título — segunda línea (resaltada)',
      type: 'text' as const,
      defaultValue: 'Próximo vehículo',
    },
    {
      name: 'textColor',
      label: 'Color del título',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'overlayColor',
      label: 'Color del overlay (oscurecer imagen)',
      type: 'color' as const,
      defaultValue: '#0b1120',
    },
    {
      name: 'overlayOpacity',
      label: 'Opacidad del overlay',
      type: 'range' as const,
      defaultValue: 0.45,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      name: 'heroHeight',
      label: 'Alto en escritorio (px)',
      type: 'range' as const,
      defaultValue: 640,
      min: 400,
      max: 900,
      step: 10,
    },
    {
      name: 'fullWidth',
      label: 'Ocupar todo el ancho (navbar y contenido)',
      type: 'toggle' as const,
      defaultValue: false,
    },
    // ── Navbar ──
    {
      name: 'logoUrl',
      label: 'Logo',
      type: 'imageSelector' as const,
      placeholder: 'Seleccionar logo',
    },
    {
      name: 'showLogo',
      label: 'Mostrar logo',
      type: 'toggle' as const,
      defaultValue: true,
    },
    {
      name: 'logoHeight',
      label: 'Tamaño del logo (px)',
      type: 'range' as const,
      defaultValue: 44,
      min: 24,
      max: 100,
      step: 2,
    },
    {
      name: 'navTextColor',
      label: 'Color de los links del navbar',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'links',
      label: 'Links de navegación',
      type: 'complex' as const,
      defaultValue: [
        { text: 'Inicio', url: '/' },
        { text: 'Stock disponible', url: '/vehicles' },
        { text: 'Consignación', url: '/consignments' },
        { text: 'Compramos tu auto', url: '/buy-direct' },
        { text: 'Quiénes somos', url: '/about' },
        { text: 'Contacto', url: '/contact' },
      ],
      fields: [
        { name: 'text', label: 'Texto', type: 'text' as const },
        { name: 'url', label: 'URL', type: 'pageUrl' as const },
      ],
    },
    {
      name: 'ctaText',
      label: 'Texto del botón CTA',
      type: 'text' as const,
      defaultValue: 'Contacto',
    },
    {
      name: 'ctaUrl',
      label: 'Enlace del botón CTA',
      type: 'pageUrl' as const,
      defaultValue: '/contact',
    },
    {
      name: 'ctaBgColor',
      label: 'Color del botón CTA',
      type: 'color' as const,
      defaultValue: clientDefaults.primaryColor,
    },
    {
      name: 'ctaTextColor',
      label: 'Color texto del botón CTA',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    // ── Buscador ──
    {
      name: 'showSearch',
      label: 'Mostrar buscador (Marca / Modelo)',
      type: 'toggle' as const,
      defaultValue: true,
    },
    {
      name: 'searchButtonColor',
      label: 'Color del botón Buscar',
      type: 'color' as const,
      defaultValue: '#dc2626',
    },
  ];
};

export const navbarSimpleSettings = (_client: any) => {
  return [
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'textColor',
      label: 'Color de los links',
      type: 'color' as const,
      defaultValue: '#4b5563',
    },
    {
      name: 'align',
      label: 'Alineación de los links',
      type: 'select' as const,
      defaultValue: 'center',
      options: [
        { label: 'Izquierda', value: 'left' },
        { label: 'Centro', value: 'center' },
        { label: 'Derecha', value: 'right' },
      ],
    },
    {
      name: 'links',
      label: 'Páginas de navegación',
      type: 'complex' as const,
      defaultValue: [
        { text: 'Inicio', url: '/' },
        { text: 'Financiamiento', url: '/financing' },
        { text: 'Consignaciones', url: '/consignments' },
        { text: 'Compra directa', url: '/buy-direct' },
      ],
      fields: [
        { name: 'text', label: 'Texto', type: 'text' as const },
        { name: 'url', label: 'URL', type: 'pageUrl' as const },
      ],
    },
    {
      name: 'sticky',
      label: 'Fijar barra arriba al hacer scroll',
      type: 'toggle' as const,
      defaultValue: true,
    },
  ];
};

// ── Form Embed Settings ──

export const financingFormEmbedSettings = (client: any) => {
  const cd = getClientDefaults(client);
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Financiamiento a tu Medida' },
    { name: 'subtitle', label: 'Subtítulo', type: 'textarea' as const, defaultValue: 'Accede a las mejores opciones de crédito automotriz. Simula tu financiamiento y encuentra el plan perfecto para ti.' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'textColor', label: 'Color de texto', type: 'color' as const, defaultValue: '#111827' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: client?.primary_color || '#3b82f6' },
    { name: 'separator_contact', label: 'Contacto directo', type: 'separator' as const, defaultValue: '' },
    { name: 'showEmail', label: 'Mostrar email', type: 'toggle' as const, defaultValue: true },
    { name: 'contactEmail', label: 'Email de contacto', type: 'text' as const, defaultValue: cd.contactEmail || '' },
    { name: 'showPhone', label: 'Mostrar teléfono', type: 'toggle' as const, defaultValue: true },
    { name: 'contactPhone', label: 'Teléfono de contacto', type: 'text' as const, defaultValue: cd.contactPhone || '' },
  ];
};

export const consignmentsFormEmbedSettings = (client: any) => {
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Consigna tu Vehículo' },
    { name: 'subtitle', label: 'Subtítulo', type: 'textarea' as const, defaultValue: 'Déjanos vender tu vehículo por ti. Nos encargamos de todo el proceso para que obtengas el mejor precio.' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'textColor', label: 'Color de texto', type: 'color' as const, defaultValue: '#111827' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: client?.primary_color || '#3b82f6' },
  ];
};

export const buyDirectFormEmbedSettings = (client: any) => {
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Compra Directa' },
    { name: 'subtitle', label: 'Subtítulo', type: 'textarea' as const, defaultValue: '¿Quieres vender tu vehículo de forma rápida y segura? Te hacemos una oferta justa al instante.' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'textColor', label: 'Color de texto', type: 'color' as const, defaultValue: '#111827' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: client?.primary_color || '#3b82f6' },
  ];
};

// Campos por defecto del formulario "Buscamos por ti" (replican el formulario original).
// Se usan: (a) como valor inicial visible para nodos que aún no tienen `formFields`,
// y (b) el primer item es el que se clona al pulsar "Agregar".
export const WE_SEARCH_DEFAULT_FIELDS = [
  { label: 'Nombre', fieldType: 'name', options: '', required: true },
  { label: 'Apellido', fieldType: 'lastname', options: '', required: true },
  { label: 'Email', fieldType: 'email', options: '', required: true },
  { label: 'Teléfono', fieldType: 'tel', options: '', required: true },
  { label: 'Marca', fieldType: 'brand', options: '', required: true },
  { label: 'Modelo', fieldType: 'model', options: '', required: true },
  { label: 'Año desde', fieldType: 'number', options: '', required: false },
  { label: 'Año hasta', fieldType: 'number', options: '', required: false },
  { label: 'Kilometraje máximo', fieldType: 'number', options: '', required: false },
  { label: 'Presupuesto', fieldType: 'number', options: '', required: false },
  { label: 'Mensaje', fieldType: 'textarea', options: '', required: false },
];

const WE_SEARCH_FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Lista de opciones' },
  { value: 'textarea', label: 'Párrafo largo' },
  { value: 'email', label: 'Email (datos de cliente)' },
  { value: 'tel', label: 'Teléfono (datos de cliente)' },
  { value: 'name', label: 'Nombre (datos de cliente)' },
  { value: 'lastname', label: 'Apellido (datos de cliente)' },
  { value: 'rut', label: 'RUT (datos de cliente)' },
  { value: 'brand', label: 'Marca (selector conectado)' },
  { value: 'model', label: 'Modelo (selector conectado)' },
  { value: 'heading', label: 'Separador / título de sección' },
];

export const weSearchFormEmbedSettings = (client: any) => {
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Buscamos por Ti' },
    { name: 'subtitle', label: 'Subtítulo', type: 'textarea' as const, defaultValue: 'Cuéntanos qué vehículo buscas y nuestro equipo se encargará de encontrarlo para ti.' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'textColor', label: 'Color de texto', type: 'color' as const, defaultValue: '#111827' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: client?.primary_color || '#3b82f6' },
    {
      name: 'formFields',
      label: 'Campo del formulario',
      type: 'complex' as const,
      helpText:
        'Agrega, quita y ordena los campos del formulario. El "Tipo de campo" define cómo se ingresa y a qué se conecta:\n• Marca/Modelo: selectores conectados a tu catálogo.\n• Email/Teléfono/Nombre/Apellido/RUT: se guardan también como datos del cliente.\n• Lista de opciones: escribe las opciones separadas por coma.\n• Separador: muestra un título de sección (no es un campo).\nActiva "Obligatorio" para exigir el campo.',
      defaultValue: WE_SEARCH_DEFAULT_FIELDS,
      fields: [
        { name: 'label', label: 'Etiqueta', type: 'text' as const, defaultValue: 'Nuevo campo' },
        {
          name: 'fieldType',
          label: 'Tipo de campo',
          type: 'select' as const,
          defaultValue: 'text',
          options: WE_SEARCH_FIELD_TYPE_OPTIONS,
        },
        {
          name: 'options',
          label: 'Opciones (separadas por coma — solo para "Lista de opciones")',
          type: 'text' as const,
          defaultValue: '',
        },
        { name: 'required', label: 'Obligatorio', type: 'toggle' as const, defaultValue: false },
      ],
    },
  ];
};

export const contactFormEmbedSettings = (client: any) => {
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Contáctanos' },
    { name: 'subtitle', label: 'Subtítulo', type: 'textarea' as const, defaultValue: 'Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos a la brevedad.' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'textColor', label: 'Color de texto', type: 'color' as const, defaultValue: '#111827' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: client?.primary_color || '#3b82f6' },
  ];
};

export const aboutContentEmbedSettings = (client: any) => {
  return [
    { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Nosotros' },
    { name: 'subtitle', label: 'Subtítulo', type: 'textarea' as const, defaultValue: 'Conoce nuestra historia, nuestro equipo y lo que nos motiva cada día.' },
    { name: 'bgColor', label: 'Color de fondo', type: 'color' as const, defaultValue: '#ffffff' },
    { name: 'textColor', label: 'Color de texto', type: 'color' as const, defaultValue: '#111827' },
    { name: 'accentColor', label: 'Color de acento', type: 'color' as const, defaultValue: client?.primary_color || '#3b82f6' },
    {
      name: 'values',
      label: 'Valor',
      type: 'complex' as const,
      defaultValue: [{ title: 'Nuevo valor', description: 'Descripción del valor.', emoji: '⭐' }],
      fields: [
        { name: 'emoji', label: 'Emoji', type: 'text' as const, defaultValue: '⭐' },
        { name: 'title', label: 'Título', type: 'text' as const, defaultValue: 'Valor' },
        { name: 'description', label: 'Descripción', type: 'textarea' as const, defaultValue: 'Descripción del valor.' },
      ],
    },
    { name: 'teamTitle', label: 'Título equipo', type: 'text' as const, defaultValue: 'Nuestro Equipo' },
    { name: 'teamSubtitle', label: 'Subtítulo equipo', type: 'text' as const, defaultValue: 'Conoce a las personas detrás de nuestra automotora' },
    { name: 'showTeam', label: 'Mostrar equipo', type: 'toggle' as const, defaultValue: true },
    {
      name: 'members',
      label: 'Miembro',
      type: 'complex' as const,
      defaultValue: [{ name: 'Nombre', role: 'Cargo', imageUrl: '' }],
      fields: [
        { name: 'name', label: 'Nombre', type: 'text' as const, defaultValue: 'Nombre' },
        { name: 'role', label: 'Cargo', type: 'text' as const, defaultValue: 'Cargo' },
        { name: 'imageUrl', label: 'Foto (URL)', type: 'text' as const, defaultValue: '' },
      ],
    },
  ];
};

export const floatingWhatsAppSettings = () => {
  return [
    {
      name: 'phoneOverride',
      label: 'Sobrescribir número (opcional)',
      type: 'text' as const,
      placeholder: '+56 9 1234 5678',
      helpText:
        'Si lo dejas vacío usa el teléfono cargado en los datos del cliente. Llena esto solo si quieres un número distinto para este botón.',
    },
    {
      name: 'message',
      label: 'Mensaje pre-rellenado',
      type: 'textarea' as const,
      rows: 3,
      defaultValue:
        'Hola, me interesa saber más sobre sus vehículos disponibles.',
      helpText: 'Texto que aparece escrito al abrir WhatsApp.',
    },
    {
      name: 'position',
      label: 'Posición',
      type: 'select' as const,
      defaultValue: 'right',
      options: [
        { value: 'right', label: 'Esquina inferior derecha' },
        { value: 'left', label: 'Esquina inferior izquierda' },
      ],
    },
    {
      name: 'size',
      label: 'Tamaño',
      type: 'select' as const,
      defaultValue: 'md',
      options: [
        { value: 'sm', label: 'Pequeño' },
        { value: 'md', label: 'Mediano' },
        { value: 'lg', label: 'Grande' },
      ],
    },
    {
      name: 'bottomOffset',
      label: 'Distancia desde abajo (px)',
      type: 'number' as const,
      defaultValue: 24,
      min: 0,
      max: 200,
      step: 4,
    },
    {
      name: 'bgColor',
      label: 'Color de fondo',
      type: 'color' as const,
      defaultValue: '#25D366',
      helpText: 'Verde oficial de WhatsApp por defecto.',
    },
    {
      name: 'iconColor',
      label: 'Color del ícono',
      type: 'color' as const,
      defaultValue: '#ffffff',
    },
    {
      name: 'showTooltip',
      label: 'Mostrar tooltip al hover',
      type: 'toggle' as const,
      defaultValue: false,
    },
    {
      name: 'tooltipText',
      label: 'Texto del tooltip',
      type: 'text' as const,
      defaultValue: '¿Tienes dudas? Escríbenos',
    },
    {
      name: 'hideOnMobile',
      label: 'Ocultar en móvil',
      type: 'toggle' as const,
      defaultValue: false,
    },
    {
      name: 'hideOnDesktop',
      label: 'Ocultar en desktop',
      type: 'toggle' as const,
      defaultValue: false,
    },
  ];
};
