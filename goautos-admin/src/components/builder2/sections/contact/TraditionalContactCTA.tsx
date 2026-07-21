import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Icon } from '@iconify/react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface TraditionalContactCTAProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  bgColor?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
}

export const TraditionalContactCTA = ({
  title = '¿Listo para encontrar tu próximo vehículo?',
  subtitle = 'Contáctanos hoy mismo.',
  buttonText = 'Contáctanos',
  buttonLink = '/contact',
  bgColor = '',
  textColor = '',
  buttonColor = '',
  buttonTextColor = '#ffffff',
}: TraditionalContactCTAProps) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);

  const finalBg = bgColor || '#ffffff';
  const finalText = textColor || '#000000';
  const finalButtonColor = buttonColor || clientDefaults.primaryColor;

  return (
    <div
      ref={connectors.connect}
      style={{
        position: 'relative',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full'
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}
      <section style={{ backgroundColor: finalBg }}>
        <div className='max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between'>
          <h2 className='text-3xl font-extrabold tracking-tight sm:text-4xl'>
            <EditableText tag="span" value={title} nodeId={id} propName="title" className='block' style={{ color: finalText }} />
            <EditableText tag="span" value={subtitle} nodeId={id} propName="subtitle" className='block' style={{ color: finalText }} />
          </h2>
          <div className='mt-8 flex lg:mt-0 lg:flex-shrink-0'>
            <a href={buttonLink} onClick={(e) => { if (isEnabled) e.preventDefault(); }}>
              <button
                className='group hover:opacity-90 transition-colors rounded-xl px-6 inline-flex items-center justify-center text-base font-medium h-12'
                style={{ backgroundColor: finalButtonColor, color: buttonTextColor }}
              >
                <Icon icon='mdi:message-text' className='text-xl mr-2' />
                {buttonText}
                <Icon icon='mdi:arrow-right' className='text-xl ml-2 group-hover:translate-x-1 transition-transform duration-200' />
              </button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

(TraditionalContactCTA as any).craft = {
  displayName: 'TraditionalContactCTA',
  props: {
    title: '¿Listo para encontrar tu próximo vehículo?',
    subtitle: 'Contáctanos hoy mismo.',
    buttonText: 'Contáctanos',
    buttonLink: '/contact',
    bgColor: '',
    textColor: '',
    buttonColor: '',
    buttonTextColor: '#ffffff',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
