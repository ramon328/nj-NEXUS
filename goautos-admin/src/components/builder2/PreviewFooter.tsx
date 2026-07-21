import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Editable preview of the website footer inside the builder iframe.
 * Texts are contentEditable and work with the TextColorToolbar.
 */
export const PreviewFooter: React.FC = () => {
  const { client } = useAuth();
  const logoUrl = client?.logo || '';
  const name = client?.name || 'Automotora';
  const description = client?.seo?.description || 'Tu aliado de confianza en la compra de vehículos.';
  const phone = client?.contact?.phone || '';
  const email = client?.contact?.email || '';
  const year = new Date().getFullYear();

  const [footerDesc, setFooterDesc] = useState(description);
  const [linksTitle, setLinksTitle] = useState('Enlaces');
  const [contactTitle, setContactTitle] = useState('Contacto');
  const [linkItems, setLinkItems] = useState(['Vehículos', 'Nosotros', 'Contacto']);
  const [copyright, setCopyright] = useState(`© ${year} ${name}. Todos los derechos reservados.`);

  // Helper to make inline-editable span
  const editableRef = (initialValue: string, onSave: (v: string) => void) => (el: HTMLElement | null) => {
    if (!el) return;
    el.contentEditable = 'true';
    el.dataset.inlineEdit = 'true';
    el.style.cursor = 'text';
    el.style.outline = 'none';
    if (el.innerHTML !== initialValue) el.innerHTML = initialValue;
  };

  return (
    <div style={{ backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {/* Brand */}
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt={name} style={{ height: '32px', width: 'auto', marginBottom: '16px' }} />
            ) : (
              <div style={{ height: '32px', marginBottom: '16px' }} />
            )}
            <p
              ref={editableRef(footerDesc, setFooterDesc)}
              onBlur={(e) => setFooterDesc((e.target as HTMLElement).innerHTML)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}
            />
          </div>

          {/* Links */}
          <div>
            <h3
              ref={editableRef(linksTitle, setLinksTitle)}
              onBlur={(e) => setLinksTitle((e.target as HTMLElement).innerHTML)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkItems.map((link, i) => (
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
                    const newLinks = [...linkItems];
                    newLinks[i] = (e.target as HTMLElement).innerHTML;
                    setLinkItems(newLinks);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ fontSize: '14px', color: '#6b7280' }}
                />
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3
              ref={editableRef(contactTitle, setContactTitle)}
              onBlur={(e) => setContactTitle((e.target as HTMLElement).innerHTML)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
              {phone && (
                <span
                  ref={(el) => {
                    if (el) {
                      el.contentEditable = 'true';
                      el.dataset.inlineEdit = 'true';
                      el.style.cursor = 'text';
                      el.style.outline = 'none';
                      if (!el.innerHTML) el.innerHTML = phone;
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              )}
              {email && (
                <span
                  ref={(el) => {
                    if (el) {
                      el.contentEditable = 'true';
                      el.dataset.inlineEdit = 'true';
                      el.style.cursor = 'text';
                      el.style.outline = 'none';
                      if (!el.innerHTML) el.innerHTML = email;
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '32px', paddingTop: '32px', textAlign: 'center' }}>
          <p
            ref={editableRef(copyright, setCopyright)}
            onBlur={(e) => setCopyright((e.target as HTMLElement).innerHTML)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ fontSize: '14px', color: '#6b7280' }}
          />
        </div>
      </div>
    </div>
  );
};
