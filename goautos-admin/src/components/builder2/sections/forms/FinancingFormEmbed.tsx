import { useNode } from '@craftjs/core';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';

interface FinancingFormEmbedProps {
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  title?: string;
  subtitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  showEmail?: boolean;
  showPhone?: boolean;
}

export const FinancingFormEmbed = ({
  bgColor = '#ffffff',
  textColor = '#111827',
  accentColor = '#3b82f6',
  title = '',
  subtitle = '',
  contactEmail = '',
  contactPhone = '',
  showEmail = true,
  showPhone = true,
}: FinancingFormEmbedProps) => {
  const { connectors } = useNode();
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);

  const finalEmail = contactEmail || clientDefaults.contactEmail;
  const finalPhone = contactPhone || clientDefaults.contactPhone;
  const showContactBlock = showEmail || showPhone;

  const isDark = bgColor && (bgColor.startsWith('#0') || bgColor.startsWith('#1') || bgColor.startsWith('#2'));
  const cardBg = isDark ? '#1c1c1c' : '#ffffff';
  const cardBorder = isDark ? '#2a2a2a' : '#e5e7eb';
  const infoBg = isDark ? '#1c1c1c' : '#f9fafb';
  const inputBg = isDark ? '#262626' : '#ffffff';
  const inputBorder = isDark ? '#3a3a3a' : '#d1d5db';
  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  const FakeInput = ({ label }: { label: string }) => (
    <div className="w-full">
      <div className="text-xs mb-1" style={{ color: labelColor }}>{label}</div>
      <div className="h-10 rounded-lg border px-3 flex items-center" style={{ backgroundColor: inputBg, borderColor: inputBorder }}>
        <span className="text-xs" style={{ color: labelColor }}></span>
      </div>
    </div>
  );

  const FakeSelect = ({ label }: { label: string }) => (
    <div className="w-full">
      <div className="text-xs mb-1" style={{ color: labelColor }}>{label}</div>
      <div className="h-10 rounded-lg border px-3 flex items-center justify-between" style={{ backgroundColor: inputBg, borderColor: inputBorder }}>
        <span className="text-xs" style={{ color: labelColor }}></span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.4 }}>
          <path d="M3 5L6 8L9 5" stroke={isDark ? '#fff' : '#000'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );

  const FakeTextarea = ({ label }: { label: string }) => (
    <div className="w-full">
      <div className="text-xs mb-1" style={{ color: labelColor }}>{label}</div>
      <div className="h-20 rounded-lg border px-3 pt-2" style={{ backgroundColor: inputBg, borderColor: inputBorder }}>
        <span className="text-xs" style={{ color: labelColor }}></span>
      </div>
    </div>
  );

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Form card */}
          <div className="rounded-xl shadow-lg p-8 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FakeInput label="Nombre" />
                <FakeInput label="Apellido" />
              </div>
              <FakeInput label="Email" />
              <FakeInput label="Teléfono" />
              <FakeInput label="RUT" />
              <FakeInput label="Fecha de nacimiento" />
              <FakeSelect label="Actividad laboral" />
              <FakeInput label="Ingreso mensual" />
              <FakeSelect label="Vehículo" />
              <FakeInput label="Monto de pie" />
              <FakeTextarea label="Mensaje" />
              <div className="h-11 rounded-lg flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: accentColor }}>
                Solicitar financiamiento
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-xl p-8 border" style={{ backgroundColor: infoBg, borderColor: cardBorder }}>
            <h2 className="text-2xl font-bold mb-6" style={{ color: textColor }}>Opciones de financiamiento</h2>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3" style={{ color: textColor }}>Beneficios</h3>
              <ul className="list-disc pl-5 space-y-2">
                {['Aprobación rápida', 'Tasas competitivas', 'Plazos flexibles', 'Sin letra chica'].map((item, i) => (
                  <li key={i} className="text-sm" style={{ color: subtextColor }}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3" style={{ color: textColor }}>Requisitos</h3>
              <ul className="list-disc pl-5 space-y-2">
                {['Cédula de identidad', 'Liquidación de sueldo', 'Comprobante de domicilio', 'Antigüedad laboral mínima'].map((item, i) => (
                  <li key={i} className="text-sm" style={{ color: subtextColor }}>{item}</li>
                ))}
              </ul>
            </div>

            {showContactBlock && (
              <div>
                <h3 className="text-lg font-medium mb-3" style={{ color: textColor }}>Contacto directo</h3>
                <div className="space-y-2">
                  {showEmail && finalEmail && (
                    <p className="text-sm" style={{ color: subtextColor }}>{finalEmail}</p>
                  )}
                  {showPhone && finalPhone && (
                    <p className="text-sm" style={{ color: subtextColor }}>{finalPhone}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

FinancingFormEmbed.craft = {
  displayName: 'FinancingFormEmbed',
  props: {
    bgColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#3b82f6',
    title: 'Financiamiento a tu Medida',
    subtitle: 'Accede a las mejores opciones de crédito automotriz con tasas competitivas y plazos flexibles.',
    contactEmail: '',
    contactPhone: '',
    showEmail: true,
    showPhone: true,
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
