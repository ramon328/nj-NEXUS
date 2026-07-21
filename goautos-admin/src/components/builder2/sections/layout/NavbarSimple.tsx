import React, { useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';

interface NavLink {
  text: string;
  url: string;
}

interface NavbarSimpleProps {
  links?: NavLink[];
  bgColor?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
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

const ALIGN_MAP: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export const NavbarSimple = ({
  links = [
    { text: 'Inicio', url: '/' },
    { text: 'Financiamiento', url: '/financing' },
    { text: 'Consignaciones', url: '/consignments' },
    { text: 'Compra directa', url: '/buy-direct' },
  ],
  bgColor = '#ffffff',
  textColor = '#4b5563',
  align = 'center',
  sticky = true,
}: NavbarSimpleProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const [mobileOpen, setMobileOpen] = useState(false);

  const dark = (() => {
    const c = bgColor.replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.4;
  })();

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">
          {/* Desktop nav links */}
          <div className={`hidden sm:flex flex-1 items-center gap-1 ${ALIGN_MAP[align] || 'justify-center'}`}>
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                onClick={handleClick}
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors hover:opacity-80"
                style={{ color: textColor }}
              >
                {link.text}
              </a>
            ))}
          </div>

          {/* Mobile: spacer + hamburger */}
          <div className="flex sm:hidden items-center justify-end flex-1">
            <button
              onClick={(e) => {
                if (isEnabled) e.stopPropagation();
                setMobileOpen(!mobileOpen);
              }}
              className="p-1.5 rounded-md transition-colors hover:opacity-80"
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
          </div>
        </div>
      )}
    </div>
  );
};

NavbarSimple.craft = {
  displayName: 'NavbarSimple',
  props: {
    links: [
      { text: 'Inicio', url: '/' },
      { text: 'Financiamiento', url: '/financing' },
      { text: 'Consignaciones', url: '/consignments' },
      { text: 'Compra directa', url: '/buy-direct' },
    ],
    bgColor: '#ffffff',
    textColor: '#4b5563',
    align: 'center',
    sticky: true,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};
