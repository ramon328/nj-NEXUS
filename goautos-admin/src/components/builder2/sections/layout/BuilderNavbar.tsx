import React, { useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface NavLink {
  text: string;
  url: string;
}

interface BuilderNavbarProps {
  links?: NavLink[];
  ctaText?: string;
  ctaUrl?: string;
  bgColor?: string;
  textColor?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
  logoUrl?: string;
  logoHeight?: number;
  showLogo?: boolean;
  sticky?: boolean;
  transparentOnTop?: boolean;
  fullWidth?: boolean;
}

/** Returns true if hex color is dark (luminance < 0.4) */
function isDarkBg(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 0.4;
}

/** Hamburger / X icon */
const MenuIcon = ({ open, color }: { open: boolean; color: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ) : (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    )}
  </svg>
);

export const BuilderNavbar = ({
  links = [
    { text: 'Inicio', url: '/' },
    { text: 'Financiamiento', url: '/financing' },
    { text: 'Consignaciones', url: '/consignments' },
    { text: 'Compra directa', url: '/buy-direct' },
    { text: 'Buscamos por ti', url: '/we-search-for-you' },
  ],
  ctaText = 'Contacto',
  ctaUrl = '/contact',
  bgColor = '#ffffff',
  textColor = '#4b5563',
  ctaBgColor = '',
  ctaTextColor = '#ffffff',
  logoUrl = '',
  logoHeight = 36,
  showLogo = true,
  sticky = true,
  transparentOnTop: _transparentOnTop = true,
  fullWidth = false,
}: BuilderNavbarProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const [mobileOpen, setMobileOpen] = useState(false);

  const finalCtaBgColor = ctaBgColor || clientDefaults.primaryColor;
  const companyName = clientDefaults.companyName;

  // Pick logo based on background luminance
  const dark = isDarkBg(bgColor);
  const logoDark = (client as any)?.logo_dark || '';
  const logoLight = logoUrl || clientDefaults.logoUrl || '';
  const finalLogoUrl = dark && logoDark ? logoDark : logoLight;

  const handleClick = (e: React.MouseEvent) => {
    if (isEnabled) e.preventDefault();
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        backgroundColor: bgColor,
        position: 'relative',
        zIndex: 100,
        border: selected ? '2px dashed #666' : '1px solid transparent',
        outline: selected ? '1px dashed #999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className={`${fullWidth ? 'max-w-full' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showLogo && finalLogoUrl ? (
              <img
                src={finalLogoUrl}
                alt={companyName}
                className="w-auto object-contain"
                style={{ height: `${logoHeight}px` }}
              />
            ) : (
              <span className="text-lg font-bold" style={{ color: textColor }}>
                {companyName}
              </span>
            )}
          </div>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                onClick={handleClick}
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors hover:opacity-80 whitespace-nowrap"
                style={{ color: textColor }}
              >
                {link.text}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <a
              href={ctaUrl}
              onClick={handleClick}
              className="hidden sm:block px-4 py-2 text-sm font-medium rounded-md transition-colors hover:opacity-90"
              style={{
                backgroundColor: finalCtaBgColor,
                color: ctaTextColor,
              }}
            >
              {ctaText}
            </a>

            {/* Mobile hamburger button */}
            <button
              onClick={(e) => {
                if (isEnabled) e.stopPropagation();
                setMobileOpen(!mobileOpen);
              }}
              className="sm:hidden p-1.5 rounded-md transition-colors hover:opacity-80"
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <MenuIcon open={mobileOpen} color={textColor} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div
          className="sm:hidden overflow-hidden"
          style={{ backgroundColor: bgColor }}
        >
          <div className="mx-3 mt-1 mb-3 rounded-2xl border overflow-hidden"
            style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
            {/* Nav links */}
            <ul className="px-1 py-1">
              {links.map((link, i) => (
                <li key={i} className="list-none">
                  <a
                    href={link.url}
                    onClick={handleClick}
                    className="block w-full rounded-xl px-4 py-3 transition-colors hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{link.text}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </a>
                </li>
              ))}
            </ul>

            {/* CTA button */}
            <div className="p-3" style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
              <a
                href={ctaUrl}
                onClick={handleClick}
                className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-colors hover:opacity-90"
                style={{
                  backgroundColor: finalCtaBgColor,
                  color: ctaTextColor,
                }}
              >
                {ctaText}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

BuilderNavbar.craft = {
  displayName: 'BuilderNavbar',
  props: {
    links: [
      { text: 'Inicio', url: '/' },
      { text: 'Financiamiento', url: '/financing' },
      { text: 'Consignaciones', url: '/consignments' },
      { text: 'Compra directa', url: '/buy-direct' },
      { text: 'Buscamos por ti', url: '/we-search-for-you' },
    ],
    ctaText: 'Contacto',
    ctaUrl: '/contact',
    bgColor: '#ffffff',
    textColor: '#4b5563',
    ctaBgColor: '',
    ctaTextColor: '#ffffff',
    logoUrl: '',
    logoHeight: 36,
    showLogo: true,
    sticky: true,
    transparentOnTop: true,
    fullWidth: false,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};
