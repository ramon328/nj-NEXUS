import React, { useEffect, useRef } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import MarqueeLib from 'react-fast-marquee';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Interop defensivo: en el build de producción (Vite/Rollup) el import default de
// react-fast-marquee puede llegar como namespace { default: Component } en vez del
// componente en sí, lo que rompe el render con React #130. Lo desenvolvemos.
const Marquee: any = (MarqueeLib as any)?.default ?? MarqueeLib;

interface GalleryImage {
  imageUrl: string;
  caption: string;
}

interface GalleryPremiumProps {
  sectionTitle?: string;
  subtitle?: string;
  images?: GalleryImage[];
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

const DEFAULT_IMAGES: GalleryImage[] = [
  { imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop', caption: 'Deportivo de lujo' },
  { imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=500&fit=crop', caption: 'Elegancia en movimiento' },
  { imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=500&fit=crop', caption: 'Potencia y diseño' },
  { imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=500&fit=crop', caption: 'Clásico moderno' },
  { imageUrl: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&h=500&fit=crop', caption: 'Heritage edition' },
];

const DEFAULT_URLS = new Set(DEFAULT_IMAGES.map((img) => img.imageUrl));

export const GalleryPremium = ({
  sectionTitle = 'Nuestra galería',
  subtitle = 'Descubre nuestras instalaciones y vehículos destacados',
  images = DEFAULT_IMAGES,
  bgColor = '#0a0a0a',
  textColor = '#ffffff',
  accentColor = '',
}: GalleryPremiumProps) => {
  const { connectors, selected, id, actions: { setProp } } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth();
  const accent = accentColor || getPersonalizedDefaults(client).primaryColor;
  const fetchedRef = useRef(false);

  // Auto-populate with dealership vehicle images on first mount
  useEffect(() => {
    if (fetchedRef.current || !client?.id) return;
    // Only replace if current images are the defaults
    const isDefault = images.length === DEFAULT_IMAGES.length && images.every((img) => DEFAULT_URLS.has(img.imageUrl));
    if (!isDefault) return;

    fetchedRef.current = true;

    (async () => {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('main_image, brand:brand_id(name), model:model_id(name)')
        .eq('client_id', client.id)
        .not('main_image', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!vehicles || vehicles.length === 0) return;

      // Pick up to 5 distinct vehicles (different main_image)
      const seen = new Set<string>();
      const vehicleImages: GalleryImage[] = [];
      for (const v of vehicles) {
        if (!v.main_image || seen.has(v.main_image)) continue;
        seen.add(v.main_image);
        const brandName = (v.brand as any)?.name || '';
        const modelName = (v.model as any)?.name || '';
        const caption = [brandName, modelName].filter(Boolean).join(' ') || 'Vehículo destacado';
        vehicleImages.push({ imageUrl: v.main_image, caption });
        if (vehicleImages.length >= 5) break;
      }

      if (vehicleImages.length === 0) return;

      // Fill remaining slots with defaults
      const finalImages = [...vehicleImages];
      let defaultIdx = 0;
      while (finalImages.length < 5 && defaultIdx < DEFAULT_IMAGES.length) {
        finalImages.push(DEFAULT_IMAGES[defaultIdx]);
        defaultIdx++;
      }

      setProp((props: any) => { props.images = finalImages; });
    })();
  }, [client?.id]);

  return (
    <div
      ref={connectors.connect}
      style={{ backgroundColor: bgColor, color: textColor, position: 'relative', border: selected ? '2px dashed #444' : '1px solid transparent' }}
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className="px-6 py-24 lg:py-32">
        {/* Header */}
        <div className="text-center mb-14 max-w-4xl mx-auto">
          <EditableText
            tag="h2"
            value={sectionTitle}
            nodeId={id}
            propName="sectionTitle"
            className="text-[2rem] sm:text-[2.75rem] font-bold mb-4"
            style={{ color: textColor, letterSpacing: '-0.03em' }}
          />
          <EditableText
            tag="p"
            value={subtitle}
            nodeId={id}
            propName="subtitle"
            className="text-lg max-w-xl mx-auto"
            style={{ color: hexToRgba(textColor, 0.5) }}
          />
        </div>

        {/* Auto-scrolling gallery */}
        <Marquee gradient={false} speed={40} pauseOnHover autoFill>
          {images.map((img, i) => (
            <div
              key={i}
              className="mx-2.5 w-[80vw] sm:w-[55vw] lg:w-[38vw] aspect-[16/10] rounded-2xl overflow-hidden relative group cursor-pointer"
            >
              <img
                src={img.imageUrl}
                alt={img.caption}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Vignette + caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end">
                <p className="text-white text-sm font-medium p-5">{img.caption}</p>
              </div>
              {/* Subtle border */}
              <div className="absolute inset-0 rounded-2xl" style={{ border: `1px solid ${hexToRgba(textColor, 0.08)}` }} />
            </div>
          ))}
        </Marquee>
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

GalleryPremium.craft = {
  displayName: 'GalleryPremium',
  props: {
    sectionTitle: 'Nuestra galería', subtitle: 'Descubre nuestras instalaciones y vehículos destacados',
    images: DEFAULT_IMAGES,
    bgColor: '#0a0a0a', textColor: '#ffffff', accentColor: '',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
