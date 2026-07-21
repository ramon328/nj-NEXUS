import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';
import { Megaphone, Tag, Percent, Gift, Zap } from 'lucide-react';

interface PromoBannerProps {
  text?: string;
  ctaText?: string;
  ctaLink?: string;
  bgColor?: string;
  textColor?: string;
  icon?: 'megaphone' | 'tag' | 'percent' | 'gift' | 'zap';
}

const iconMap = {
  megaphone: Megaphone,
  tag: Tag,
  percent: Percent,
  gift: Gift,
  zap: Zap,
};

export const PromoBanner = ({
  text = '¡Oferta especial! Aprovecha nuestras promociones exclusivas este mes.',
  ctaText = 'Ver ofertas',
  ctaLink = '/vehiculos',
  bgColor,
  textColor = '#ffffff',
  icon = 'megaphone',
}: PromoBannerProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalBgColor = bgColor || clientDefaults.primaryColor;

  const IconComponent = iconMap[icon] || Megaphone;

  const handleCtaClick = () => {
    if (isEnabled) return;
    if (ctaLink) {
      if (ctaLink.startsWith('http://') || ctaLink.startsWith('https://')) {
        window.open(ctaLink, '_blank');
      } else if (ctaLink.startsWith('#')) {
        document.querySelector(ctaLink)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = ctaLink;
      }
    }
  };

  // Derive a darker shade for the gradient
  const darkenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  const gradientStart = finalBgColor;
  const gradientEnd = darkenColor(finalBgColor, 40);

  return (
    <div
      ref={connectors.connect}
      style={{
        background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
        color: textColor,
        padding: '40px 20px',
        position: 'relative',
        border: selected ? '2px dashed #666666' : '1px solid transparent',
        outline: selected ? '1px dashed #999999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className='w-full'
    >
      {selected && <DeleteButton nodeId={id} />}
      <div className='max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left'>
        <div
          className='flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center'
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <IconComponent size={28} style={{ color: textColor }} />
        </div>

        <EditableText tag="p" value={text} nodeId={id} propName="text"
          className='text-lg md:text-xl font-semibold flex-1'
          style={{ color: textColor }}
        />

        <button
          onClick={handleCtaClick}
          className='flex-shrink-0 px-8 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:shadow-lg'
          style={{
            backgroundColor: textColor,
            color: finalBgColor,
            cursor: isEnabled ? 'default' : 'pointer',
          }}
        >
          <EditableText tag="span" value={ctaText} nodeId={id} propName="ctaText" />
        </button>
      </div>
    </div>
  );
};

const clientDefaults = getPersonalizedDefaults(null);

PromoBanner.craft = {
  displayName: 'PromoBanner',
  props: {
    text: '¡Oferta especial! Aprovecha nuestras promociones exclusivas este mes.',
    ctaText: 'Ver ofertas',
    ctaLink: '/vehiculos',
    bgColor: clientDefaults.primaryColor,
    textColor: '#ffffff',
    icon: 'megaphone',
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
};
