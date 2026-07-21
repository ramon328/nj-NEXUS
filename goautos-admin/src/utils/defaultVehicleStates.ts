export const DEFAULT_VEHICLE_STATES = [
  {
    name: 'Revisión Mecánica',
    description:
      'Vehículo en proceso de diagnóstico y evaluación técnica para garantizar su correcto funcionamiento.',
    color: '#9ca3af', // Gris
    order: 1,
    is_disabled: false,
    show_in_web: false,
  },
  {
    name: 'Preparación',
    description:
      'Vehículo en fase de acondicionamiento estético, incluyendo limpieza detallada y pulido para optimizar su presentación.',
    color: '#ef4444', // Rojo
    order: 2,
    is_disabled: false,
    show_in_web: false,
  },
  {
    name: 'Listo para la foto',
    description:
      'Vehículo completamente preparado para la sesión fotográfica profesional y captura de contenido multimedia.',
    color: '#f59e0b', // Ámbar/Naranja
    order: 3,
    is_disabled: false,
    show_in_web: false,
  },
  {
    name: 'Publicado',
    description:
      'Vehículo verificado y disponible para venta, con presencia activa en plataformas digitales y catálogo web.',
    color: '#3b82f6', // Azul
    order: 4,
    is_disabled: true,
    show_in_web: true,
  },
  {
    name: 'Reservado',
    description:
      'Vehículo apartado temporalmente para un cliente interesado, pendiente de formalizar la compra.',
    color: '#8b5cf6', // Violeta/Púrpura
    order: 5,
    is_disabled: true,
    show_in_web: true,
  },
  {
    name: 'Vendido',
    description:
      'Vehículo adquirido por un cliente, proceso de compra finalizado y en trámites de transferencia de propiedad.',
    color: '#10b981', // Verde
    order: 6,
    is_disabled: true,
    show_in_web: true,
  },
];
