import { useNode } from '@craftjs/core';

interface FormFieldDef {
  label?: string;
  fieldType?: string;
  options?: string;
  required?: boolean;
}

interface WeSearchFormEmbedProps {
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  title?: string;
  subtitle?: string;
  formFields?: FormFieldDef[];
}

// Debe coincidir con WE_SEARCH_DEFAULT_FIELDS en settings/componentSettings.ts
const DEFAULT_FIELDS: FormFieldDef[] = [
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

export const WeSearchFormEmbed = ({
  bgColor = '#ffffff',
  textColor = '#111827',
  accentColor = '#3b82f6',
  title = '',
  subtitle = '',
  formFields = DEFAULT_FIELDS,
}: WeSearchFormEmbedProps) => {
  const { connectors } = useNode();

  const isDark = bgColor && (bgColor.startsWith('#0') || bgColor.startsWith('#1') || bgColor.startsWith('#2'));
  const cardBg = isDark ? '#1c1c1c' : '#ffffff';
  const cardBorder = isDark ? '#2a2a2a' : '#e5e7eb';
  const infoBg = isDark ? '#1c1c1c' : '#f9fafb';
  const inputBg = isDark ? '#262626' : '#ffffff';
  const inputBorder = isDark ? '#3a3a3a' : '#d1d5db';
  const labelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  const fieldLabel = (f: FormFieldDef) => `${f.label || 'Campo'}${f.required ? ' *' : ''}`;

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

  const renderField = (f: FormFieldDef, i: number) => {
    switch (f.fieldType) {
      case 'heading':
        return (
          <div key={i} className="pt-3 mt-1 border-t" style={{ borderColor: cardBorder }}>
            <div className="text-sm font-semibold" style={{ color: textColor }}>{f.label || ''}</div>
          </div>
        );
      case 'brand':
      case 'model':
      case 'select':
        return <FakeSelect key={i} label={fieldLabel(f)} />;
      case 'textarea':
        return <FakeTextarea key={i} label={fieldLabel(f)} />;
      default:
        return <FakeInput key={i} label={fieldLabel(f)} />;
    }
  };

  const fields = Array.isArray(formFields) && formFields.length > 0 ? formFields : DEFAULT_FIELDS;

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
            <div className="space-y-4">
              {fields.map((f, i) => renderField(f, i))}
              <div className="h-11 rounded-lg flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: accentColor }}>
                Iniciar búsqueda
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-xl p-8 border" style={{ backgroundColor: infoBg, borderColor: cardBorder }}>
            <h2 className="text-2xl font-bold mb-6" style={{ color: textColor }}>¿Cómo funciona?</h2>

            <div className="space-y-5 mb-8">
              {[
                { step: '1', title: 'Cuéntanos qué buscas', desc: 'Completa el formulario con tus preferencias y presupuesto.' },
                { step: '2', title: 'Buscamos por ti', desc: 'Nuestro equipo busca en toda nuestra red de proveedores.' },
                { step: '3', title: 'Te mostramos opciones', desc: 'Te presentamos las mejores alternativas encontradas.' },
                { step: '4', title: 'Compra segura', desc: 'Gestionamos la compra con verificación mecánica incluida.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: accentColor }}>
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: textColor }}>{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: subtextColor }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3" style={{ color: textColor }}>Beneficios</h3>
              <ul className="list-disc pl-5 space-y-2">
                {['Búsqueda personalizada', 'Acceso a red de proveedores', 'Verificación mecánica incluida', 'Garantía de satisfacción'].map((item, i) => (
                  <li key={i} className="text-sm" style={{ color: subtextColor }}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

WeSearchFormEmbed.craft = {
  displayName: 'WeSearchFormEmbed',
  props: {
    bgColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#3b82f6',
    title: 'Buscamos por Ti',
    subtitle: 'Cuéntanos qué vehículo buscas y nuestro equipo se encargará de encontrarlo.',
    formFields: DEFAULT_FIELDS,
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
