import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Editable preview of the website navbar inside the builder iframe.
 * Texts are contentEditable and work with the TextColorToolbar.
 * Changes save to client config in Supabase.
 */
export const PreviewNavbar: React.FC = () => {
  const { client, refreshClient } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  const primaryColor = client?.theme?.light?.primary || '#e05d31';
  const logoUrl = client?.logo || '';
  const name = client?.name || 'Automotora';

  // Navbar config stored in client.navbar_config or defaults
  const navConfig = (client as any)?.navbar_config || {};
  const [links, setLinks] = useState<string[]>(
    navConfig.links || ['Inicio', 'Financiamiento', 'Consignaciones', 'Compra directa']
  );
  const [ctaText, setCtaText] = useState(navConfig.ctaText || 'Contacto');

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Make an element inline-editable with data-inline-edit for the color toolbar
  const makeEditable = useCallback((el: HTMLElement | null, onSave: (html: string) => void) => {
    if (!el) return;
    el.contentEditable = 'true';
    el.dataset.inlineEdit = 'true';
    el.style.cursor = 'text';
    el.style.outline = 'none';

    const handler = () => onSave(el.innerHTML);
    el.addEventListener('blur', handler);
    el.addEventListener('mousedown', (e) => e.stopPropagation());

    return () => {
      el.removeEventListener('blur', handler);
    };
  }, []);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9000,
        transition: 'all 0.3s',
        backgroundColor: isScrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(12px)' : 'none',
        boxShadow: isScrolled ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {logoUrl ? (
            <img src={logoUrl} alt={name} style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#111' }}>{name}</span>
          )}
        </div>

        {/* Nav links - each editable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {links.map((link, i) => (
            <span
              key={i}
              ref={(el) => {
                if (el) {
                  el.contentEditable = 'true';
                  el.dataset.inlineEdit = 'true';
                  el.style.cursor = 'text';
                  el.style.outline = 'none';
                  if (el.innerHTML !== link) el.innerHTML = link;
                }
              }}
              onBlur={(e) => {
                const newLinks = [...links];
                newLinks[i] = (e.target as HTMLElement).innerHTML;
                setLinks(newLinks);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                fontWeight: 500,
                color: isScrolled ? '#4b5563' : '#6b7280',
                borderRadius: '6px',
              }}
            />
          ))}
        </div>

        {/* CTA button - editable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            ref={(el) => {
              if (el) {
                el.contentEditable = 'true';
                el.dataset.inlineEdit = 'true';
                el.style.cursor = 'text';
                el.style.outline = 'none';
                if (el.innerHTML !== ctaText) el.innerHTML = ctaText;
              }
            }}
            onBlur={(e) => setCtaText((e.target as HTMLElement).innerHTML)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: primaryColor,
              borderRadius: '6px',
            }}
          />
        </div>
      </div>
    </div>
  );
};
