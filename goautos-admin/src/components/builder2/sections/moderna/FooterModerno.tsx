import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Facebook, Instagram, Twitter, Youtube, Linkedin, MessageCircle } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface FooterLink { text: string; url: string; }
interface FooterColumn { title: string; links: FooterLink[]; }
interface SocialLink { platform: 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'linkedin' | 'whatsapp'; url: string; }

const normalizeSocialUrl = (platform: string, raw: string): string => {
  const v = (raw || '').trim();
  if (!v || v === '#') return '';
  if (platform === 'whatsapp' && !/^https?:\/\//i.test(v)) {
    const digits = v.replace(/[^\d]/g, '');
    return digits ? `https://wa.me/${digits}` : '';
  }
  return v;
};

interface FooterModernoProps {
  companyName?: string;
  description?: string;
  columns?: FooterColumn[];
  socialLinks?: SocialLink[];
  copyrightText?: string;
  bgColor?: string;
  textColor?: string;
  headingColor?: string;
  accentColor?: string;
  dividerColor?: string;
  socialIconBgColor?: string;
}

const SocialIcon = ({ platform, size = 18 }: { platform: string; size?: number }) => {
  switch (platform) {
    case 'facebook': return <Facebook size={size} />;
    case 'instagram': return <Instagram size={size} />;
    case 'twitter': return <Twitter size={size} />;
    case 'youtube': return <Youtube size={size} />;
    case 'linkedin': return <Linkedin size={size} />;
    case 'whatsapp': return <MessageCircle size={size} />;
    default: return <Facebook size={size} />;
  }
};

export const FooterModerno = ({
  companyName = '',
  description = 'Tu aliado de confianza en la compra de vehículos. Ofrecemos la mejor selección, financiamiento flexible y garantía en cada auto.',
  columns = [
    { title: 'Empresa', links: [{ text: 'Sobre nosotros', url: '#about' }, { text: 'Equipo', url: '#team' }, { text: 'Contacto', url: '#contact' }] },
    { title: 'Servicios', links: [{ text: 'Financiamiento', url: '#financing' }, { text: 'Garantía', url: '#warranty' }, { text: 'Test Drive', url: '#testdrive' }] },
    { title: 'Legal', links: [{ text: 'Términos y condiciones', url: '#terms' }, { text: 'Política de privacidad', url: '#privacy' }] },
  ],
  socialLinks = [
    { platform: 'facebook', url: '' },
    { platform: 'instagram', url: '' },
    { platform: 'whatsapp', url: '' },
  ],
  copyrightText = '',
  bgColor = '#0f172a',
  textColor = '#94a3b8',
  headingColor = '#ffffff',
  accentColor = '#3b82f6',
  dividerColor = 'rgba(255,255,255,0.08)',
  socialIconBgColor = 'rgba(255,255,255,0.06)',
}: FooterModernoProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);

  const finalName = companyName || clientDefaults.companyName;
  // Pick logo based on footer bg luminance
  const isBgDark = (() => {
    const c = bgColor.replace('#', '');
    if (c.length !== 6) return true;
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.5;
  })();
  const logoDark = (client as any)?.logo_dark || '';
  const logoLight = clientDefaults.logoUrl || '';
  const finalLogoUrl = isBgDark ? (logoDark || logoLight) : (logoLight || logoDark);
  const currentYear = new Date().getFullYear();
  const finalCopyright = copyrightText || `© ${currentYear} ${finalName}. Todos los derechos reservados.`;

  const handleClick = (e: React.MouseEvent) => {
    if (isEnabled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={(el: HTMLDivElement | null) => { if (el) connectors.connect(el); }}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        position: 'relative',
        border: selected ? '2px dashed #666' : '1px solid transparent',
        outline: selected ? '1px dashed #999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            {finalLogoUrl ? (
              <img src={finalLogoUrl} alt={finalName} className="h-10 w-auto mb-4 object-contain" />
            ) : (
              <EditableText
                tag="h3"
                value={finalName}
                nodeId={id}
                propName="companyName"
                className="text-xl font-semibold mb-4"
                style={{ letterSpacing: '-0.025em', color: headingColor }}
              />
            )}
            <EditableText
              tag="p"
              value={description}
              nodeId={id}
              propName="description"
              className="text-[14px] leading-relaxed mb-6"
              style={{ color: textColor }}
            />
            {(() => {
              const visible = socialLinks
                .map((s) => ({ ...s, url: normalizeSocialUrl(s.platform, s.url) }))
                .filter((s) => s.url);
              if (visible.length === 0) return null;
              return (
                <div className="flex items-center gap-2">
                  {visible.map((social, index) => (
                    <a
                      key={index}
                      href={social.url}
                      onClick={handleClick}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                      style={{ backgroundColor: socialIconBgColor, color: textColor }}
                    >
                      <SocialIcon platform={social.platform} />
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Link columns */}
          {columns.map((col, i) => (
            <div key={i} className="lg:col-span-2 lg:col-start-auto">
              <h4 className="text-[13px] font-semibold uppercase tracking-wider mb-5" style={{ color: headingColor }}>
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href={link.url}
                      onClick={handleClick}
                      className="text-[14px] transition-colors duration-200"
                      style={{ color: textColor }}
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider + Copyright */}
        <div
          className="mt-14 pt-8 text-center"
          style={{ borderTop: `1px solid ${dividerColor}` }}
        >
          <EditableText
            tag="p"
            value={finalCopyright}
            nodeId={id}
            propName="copyrightText"
            className="text-[13px]"
            style={{ color: hexToRgba(textColor, 0.6) }}
          />
        </div>
      </div>
    </div>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(255,255,255,${alpha})`;
  const num = parseInt(clean, 16);
  return `rgba(${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff},${alpha})`;
}

FooterModerno.craft = {
  displayName: 'FooterModerno',
  props: {
    companyName: '',
    description: 'Tu aliado de confianza en la compra de vehículos. Ofrecemos la mejor selección, financiamiento flexible y garantía en cada auto.',
    columns: [
      { title: 'Empresa', links: [{ text: 'Sobre nosotros', url: '#about' }, { text: 'Equipo', url: '#team' }, { text: 'Contacto', url: '#contact' }] },
      { title: 'Servicios', links: [{ text: 'Financiamiento', url: '#financing' }, { text: 'Garantía', url: '#warranty' }, { text: 'Test Drive', url: '#testdrive' }] },
      { title: 'Legal', links: [{ text: 'Términos y condiciones', url: '#terms' }, { text: 'Política de privacidad', url: '#privacy' }] },
    ],
    socialLinks: [
      { platform: 'facebook', url: '' },
      { platform: 'instagram', url: '' },
      { platform: 'whatsapp', url: '' },
    ],
    copyrightText: '',
    bgColor: '#0f172a',
    textColor: '#94a3b8',
    headingColor: '#ffffff',
    accentColor: '#3b82f6',
    dividerColor: 'rgba(255,255,255,0.08)',
    socialIconBgColor: 'rgba(255,255,255,0.06)',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
