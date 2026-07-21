import React, { useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface NavLink {
  text: string;
  url: string;
}

interface HeroMegaProps {
  links?: NavLink[];
  ctaText?: string;
  ctaUrl?: string;
  logoUrl?: string;
  logoHeight?: number;
  showLogo?: boolean;
  titleLine1?: string;
  titleLine2?: string;
  backgroundImage?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  navTextColor?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
  searchButtonColor?: string;
  showSearch?: boolean;
  heroHeight?: number;
  fullWidth?: boolean;
}

/** Hamburger icon */
const MenuIcon = ({ color }: { color: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const SearchIcon = ({ color }: { color: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const HeroMega = ({
  links = [
    { text: 'Inicio', url: '/' },
    { text: 'Stock disponible', url: '/vehicles' },
    { text: 'Consignación', url: '/consignments' },
    { text: 'Compramos tu auto', url: '/buy-direct' },
    { text: 'Quiénes somos', url: '/about' },
    { text: 'Contacto', url: '/contact' },
  ],
  ctaText = 'Contacto',
  ctaUrl: _ctaUrl = '/contact',
  logoUrl = '',
  logoHeight = 44,
  showLogo = true,
  titleLine1 = 'Encuentra tu',
  titleLine2 = 'Próximo vehículo',
  backgroundImage = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1920',
  overlayColor = '#0b1120',
  overlayOpacity = 0.45,
  textColor = '#ffffff',
  navTextColor = '#ffffff',
  ctaBgColor = '',
  ctaTextColor = '#ffffff',
  searchButtonColor = '#dc2626',
  showSearch = true,
  heroHeight = 640,
  fullWidth = false,
}: HeroMegaProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { isEnabled } = useEditor((state) => ({ isEnabled: state.options.enabled }));

  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);

  const [mobileOpen, setMobileOpen] = useState(false);

  const finalCtaBgColor = ctaBgColor || clientDefaults.primaryColor;
  const companyName = clientDefaults.companyName;
  const finalLogoUrl = logoUrl || (client as any)?.logo_dark || clientDefaults.logoUrl || '';

  const containerWidth = fullWidth ? 'max-w-full' : 'max-w-7xl';

  return (
    <div
      ref={connectors.connect}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: textColor,
        minHeight: `${heroHeight}px`,
        position: 'relative',
        border: selected ? '2px dashed #666' : '1px solid transparent',
      }}
      className="w-full flex flex-col"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      {/* Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
      />

      {/* Navbar */}
      <nav className="relative z-20 w-full">
        <div className={`${containerWidth} mx-auto px-4 sm:px-6 lg:px-8`}>
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              {showLogo && finalLogoUrl ? (
                <img
                  src={finalLogoUrl}
                  alt={companyName}
                  className="w-auto object-contain"
                  style={{ height: `${logoHeight}px` }}
                />
              ) : (
                <span className="text-xl font-bold" style={{ color: navTextColor }}>
                  {companyName}
                </span>
              )}
            </div>

            {/* Desktop links */}
            <div className="hidden lg:flex items-center gap-1">
              {links.map((link, i) => (
                <span
                  key={i}
                  className="px-3 py-2 text-sm font-semibold rounded-md whitespace-nowrap"
                  style={{ color: navTextColor }}
                >
                  {link.text}
                </span>
              ))}
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <span
                className="hidden lg:block px-5 py-2.5 text-sm font-semibold rounded-md"
                style={{ backgroundColor: finalCtaBgColor, color: ctaTextColor }}
              >
                {ctaText}
              </span>
              <button
                onClick={(e) => { if (isEnabled) e.stopPropagation(); setMobileOpen(!mobileOpen); }}
                className="lg:hidden p-1.5 rounded-md"
                aria-label="Menú"
              >
                <MenuIcon color={navTextColor} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className={`relative z-10 flex-1 flex flex-col justify-center ${containerWidth} w-full mx-auto px-4 sm:px-6 lg:px-8 py-12`}>
        <h1 className="max-w-3xl" style={{ color: textColor }}>
          {titleLine1 && (
            <span className="block text-3xl sm:text-4xl md:text-5xl font-light tracking-tight">
              {titleLine1}
            </span>
          )}
          {titleLine2 && (
            <span className="block text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mt-1">
              {titleLine2}
            </span>
          )}
        </h1>

        {showSearch && (
          <div className="mt-8 w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <div className="w-full bg-gray-50 text-gray-500 rounded-xl pl-4 pr-9 py-3.5 text-sm font-medium">
                  Marca
                </div>
                <ChevronDown />
              </div>
              <div className="relative flex-1">
                <div className="w-full bg-gray-50 text-gray-500 rounded-xl pl-4 pr-9 py-3.5 text-sm font-medium">
                  Modelo
                </div>
                <ChevronDown />
              </div>
              <div
                className="flex items-center justify-center rounded-xl px-5 py-3.5 sm:w-14"
                style={{ backgroundColor: searchButtonColor }}
              >
                <SearchIcon color="#ffffff" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

HeroMega.craft = {
  displayName: 'Mega Cabecera',
  props: {
    links: [
      { text: 'Inicio', url: '/' },
      { text: 'Stock disponible', url: '/vehicles' },
      { text: 'Consignación', url: '/consignments' },
      { text: 'Compramos tu auto', url: '/buy-direct' },
      { text: 'Quiénes somos', url: '/about' },
      { text: 'Contacto', url: '/contact' },
    ],
    ctaText: 'Contacto',
    ctaUrl: '/contact',
    logoUrl: '',
    logoHeight: 44,
    showLogo: true,
    titleLine1: 'Encuentra tu',
    titleLine2: 'Próximo vehículo',
    backgroundImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1920',
    overlayColor: '#0b1120',
    overlayOpacity: 0.45,
    textColor: '#ffffff',
    navTextColor: '#ffffff',
    ctaBgColor: '',
    ctaTextColor: '#ffffff',
    searchButtonColor: '#dc2626',
    showSearch: true,
    heroHeight: 640,
    fullWidth: false,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};
