import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { Search } from 'lucide-react';

interface HeroWelcomeProps {
  title?: string;
  highlightedText?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  bgColor?: string;
  textColor?: string;
  highlightColor?: string;
}

export const HeroWelcome = ({
  title = 'Encuentra tu próximo vehículo en',
  highlightedText,
  subtitle = 'Describe el vehículo de tus sueños y deja que nuestra IA encuentre las mejores opciones para ti.',
  searchPlaceholder = 'Toyota Corolla blanco',
  bgColor = '#ffffff',
  textColor = '#111827',
  highlightColor,
}: HeroWelcomeProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalHighlightColor = highlightColor || clientDefaults.primaryColor;
  // '' = el usuario lo borró a propósito → respetarlo. undefined = nunca se tocó → usar nombre de la empresa.
  const finalHighlightedText = highlightedText ?? clientDefaults.companyName;

  // Detect dark bg for search bar color
  const isDarkBg = (() => {
    const c = (bgColor || '#ffffff').replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.4;
  })();
  const searchBarBg = isDarkBg ? '#1c1c1c' : '#f1f5f9';
  const searchBarPlaceholder = isDarkBg ? '#737373' : '#9ca3af';

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  return (
    <div
      ref={connectors.connect}
      style={{
        background: bgColor,
        position: 'relative',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full'
    >
      {selected && isEnabled && <DeleteButton />}
      <div className='relative isolate overflow-hidden'>
        <div className='mx-auto max-w-7xl px-6 py-24 sm:pt-32 lg:px-8'>
          <div className='text-center'>
            <h1
              className='text-5xl font-bold tracking-tight sm:text-6xl max-w-3xl mx-auto'
              style={{ color: textColor, lineHeight: '1.1' }}
            >
              <EditableText tag="span" value={title} nodeId={id} propName="title" style={{ color: textColor }} />{' '}
              <EditableText tag="span" value={finalHighlightedText} nodeId={id} propName="highlightedText" style={{ color: finalHighlightColor }} />
            </h1>

            <EditableText
              tag="p"
              value={subtitle}
              nodeId={id}
              propName="subtitle"
              className='mt-6 text-xl leading-8 max-w-2xl mx-auto'
              style={{ color: textColor, opacity: 0.7 }}
            />

            {/* Search bar (decorative in builder, functional on website) */}
            <div className='mt-10 max-w-3xl mx-auto'>
              <div className='relative'>
                <div
                  className='flex items-center w-full rounded-xl shadow-lg h-14 px-4'
                  style={{ backgroundColor: searchBarBg }}
                >
                  <Search size={18} style={{ color: finalHighlightColor }} className='ml-1 flex-shrink-0' />
                  <span className='ml-3 text-base select-none' style={{ color: searchBarPlaceholder }}>
                    {searchPlaceholder}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

(HeroWelcome as any).craft = {
  displayName: 'HeroWelcome',
  props: {
    title: 'Encuentra tu próximo vehículo en',
    // highlightedText sin default (undefined) → al arrastrarlo muestra el nombre de la empresa,
    // pero una vez que el usuario lo borra ('') se respeta y queda vacío.
    subtitle: 'Describe el vehículo de tus sueños y deja que nuestra IA encuentre las mejores opciones para ti.',
    searchPlaceholder: 'Toyota Corolla blanco',
    bgColor: '#ffffff',
    textColor: '#111827',
    highlightColor: '',
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};
