import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Globe,
  MessageCircle,
} from 'lucide-react';

interface SocialLink {
  platform: string;
  url: string;
}

interface SocialLinksProps {
  links?: SocialLink[];
  iconSize?: number;
  iconColor?: string;
  layout?: 'horizontal' | 'vertical';
}

const platformIcons: Record<string, React.FC<{ size: number; color: string }>> = {
  facebook: ({ size, color }) => <Facebook size={size} color={color} />,
  instagram: ({ size, color }) => <Instagram size={size} color={color} />,
  twitter: ({ size, color }) => <Twitter size={size} color={color} />,
  youtube: ({ size, color }) => <Youtube size={size} color={color} />,
  linkedin: ({ size, color }) => <Linkedin size={size} color={color} />,
  whatsapp: ({ size, color }) => <MessageCircle size={size} color={color} />,
  website: ({ size, color }) => <Globe size={size} color={color} />,
};

export const SocialLinks = ({
  links = [
    { platform: 'facebook', url: 'https://facebook.com' },
    { platform: 'instagram', url: 'https://instagram.com' },
    { platform: 'whatsapp', url: 'https://wa.me/56912345678' },
  ],
  iconSize = 24,
  iconColor = '#374151',
  layout = 'horizontal',
}: SocialLinksProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const handleClick = (url: string) => {
    if (isEnabled) return;
    window.open(url, '_blank');
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
        padding: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: layout === 'vertical' ? 'column' : 'row',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {links.map((link, index) => {
          const IconComponent = platformIcons[link.platform] || platformIcons.website;
          return (
            <button
              key={index}
              onClick={() => handleClick(link.url)}
              style={{
                background: 'none',
                border: 'none',
                cursor: isEnabled ? 'move' : 'pointer',
                padding: '8px',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="hover:bg-gray-100"
            >
              <IconComponent size={iconSize} color={iconColor} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

(SocialLinks as any).craft = {
  displayName: 'SocialLinks',
  props: {
    links: [
      { platform: 'facebook', url: 'https://facebook.com' },
      { platform: 'instagram', url: 'https://instagram.com' },
      { platform: 'whatsapp', url: 'https://wa.me/56912345678' },
    ],
    iconSize: 24,
    iconColor: '#374151',
    layout: 'horizontal',
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
