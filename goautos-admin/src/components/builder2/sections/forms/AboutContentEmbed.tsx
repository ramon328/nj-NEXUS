import { useNode } from '@craftjs/core';

interface ValueCard {
  title: string;
  description: string;
  emoji: string;
}

interface TeamMember {
  name: string;
  role: string;
  imageUrl: string;
}

interface AboutContentEmbedProps {
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  title?: string;
  subtitle?: string;
  values?: ValueCard[];
  teamTitle?: string;
  teamSubtitle?: string;
  members?: TeamMember[];
  showTeam?: boolean;
}

export const AboutContentEmbed = ({
  bgColor = '#ffffff',
  textColor = '#111827',
  accentColor = '#3b82f6',
  title = '',
  subtitle = '',
  values = [
    { title: 'Nuestra Misión', description: 'Ofrecer la mejor experiencia en compra y venta de vehículos, con transparencia y confianza en cada operación.', emoji: '🎯' },
    { title: 'Confianza', description: 'Nos destacamos por la honestidad y transparencia en cada transacción. Tu satisfacción es nuestra prioridad.', emoji: '🤝' },
    { title: 'Excelencia', description: 'Mejora continua en nuestros procesos para garantizar un servicio de primer nivel a todos nuestros clientes.', emoji: '⭐' },
  ],
  teamTitle = 'Nuestro Equipo',
  teamSubtitle = 'Conoce a las personas detrás de nuestra automotora',
  members = [
    { name: 'Nombre del Gerente', role: 'Gerente General', imageUrl: '' },
    { name: 'Nombre del Vendedor', role: 'Ventas', imageUrl: '' },
    { name: 'Nombre del Asesor', role: 'Atención al Cliente', imageUrl: '' },
  ],
  showTeam = true,
}: AboutContentEmbedProps) => {
  const { connectors } = useNode();

  const isDark = bgColor && (bgColor.startsWith('#0') || bgColor.startsWith('#1') || bgColor.startsWith('#2'));
  const cardBg = isDark ? '#1c1c1c' : '#ffffff';
  const cardBorder = isDark ? '#2a2a2a' : '#e5e7eb';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const avatarBg = isDark ? '#262626' : '#e5e7eb';

  return (
    <div
      ref={(el: HTMLDivElement | null) => { if (el) connectors.connect(el); }}
      style={{ backgroundColor: bgColor, color: textColor }}
      className="w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8"
    >
      {title && (
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold" style={{ color: textColor }}>{title}</h1>
          {subtitle && <p className="mt-4 text-lg" style={{ color: subtextColor }}>{subtitle}</p>}
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Values cards */}
        {values.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {values.map((card, i) => (
              <div key={i} className="rounded-xl shadow-lg p-8 border text-center" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                  <span className="text-2xl">{card.emoji || '⭐'}</span>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: textColor }}>{card.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: subtextColor }}>{card.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Team section */}
        {showTeam && members.length > 0 && (
          <>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold mb-2" style={{ color: textColor }}>{teamTitle}</h2>
              <p className="text-sm" style={{ color: subtextColor }}>{teamSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {members.map((member, i) => (
                <div key={i} className="rounded-xl shadow-lg p-8 border flex flex-col items-center" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt={member.name} className="w-24 h-24 rounded-full mb-4 object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full mb-4" style={{ backgroundColor: avatarBg }} />
                  )}
                  <h3 className="text-lg font-bold" style={{ color: textColor }}>{member.name}</h3>
                  <p className="text-sm mt-1" style={{ color: subtextColor }}>{member.role}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

AboutContentEmbed.craft = {
  displayName: 'AboutContentEmbed',
  props: {
    bgColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#3b82f6',
    title: 'Nosotros',
    subtitle: 'Conoce nuestra historia, nuestro equipo y lo que nos motiva cada día.',
    values: [
      { title: 'Nuestra Misión', description: 'Ofrecer la mejor experiencia en compra y venta de vehículos, con transparencia y confianza en cada operación.', emoji: '🎯' },
      { title: 'Confianza', description: 'Nos destacamos por la honestidad y transparencia en cada transacción. Tu satisfacción es nuestra prioridad.', emoji: '🤝' },
      { title: 'Excelencia', description: 'Mejora continua en nuestros procesos para garantizar un servicio de primer nivel a todos nuestros clientes.', emoji: '⭐' },
    ],
    teamTitle: 'Nuestro Equipo',
    teamSubtitle: 'Conoce a las personas detrás de nuestra automotora',
    members: [
      { name: 'Nombre del Gerente', role: 'Gerente General', imageUrl: '' },
      { name: 'Nombre del Vendedor', role: 'Ventas', imageUrl: '' },
      { name: 'Nombre del Asesor', role: 'Atención al Cliente', imageUrl: '' },
    ],
    showTeam: true,
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
