import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Icon } from '@iconify/react';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';

const defaultItems = [
  {
    id: '1',
    title: 'Garantía',
    description: 'Todos nuestros vehículos cuentan con garantía',
    icon: 'mdi:shield-check',
  },
  {
    id: '2',
    title: 'Financiamiento',
    description: 'Opciones de financiamiento flexibles',
    icon: 'mdi:cash-multiple',
  },
  {
    id: '3',
    title: 'Calidad',
    description: 'Vehículos seleccionados y certificados',
    icon: 'mdi:certificate',
  },
];

interface WhyUsItem {
  title: string;
  description: string;
  icon: string;
}

interface TraditionalWhyUsProps {
  title?: string;
  subtitle?: string;
  bgColor?: string;
  textColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  cardBgColor?: string;
  items?: WhyUsItem[];
}

export const TraditionalWhyUs = ({
  title = '¿Por qué elegirnos?',
  subtitle = 'Descubre por qué nuestros clientes confían en nosotros',
  bgColor = '',
  textColor = '',
  subtitleColor = '',
  accentColor = '',
  cardBgColor = '',
  items,
}: TraditionalWhyUsProps) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);

  const finalAccent = accentColor || clientDefaults.primaryColor;
  const finalBg = bgColor || '#f8fafc';
  const finalText = textColor || '#111827';
  const finalSubtitle = subtitleColor || '#4b5563';
  const finalCardBg = cardBgColor || '#ffffff';
  const displayItems = items || defaultItems;

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
      <section style={{ backgroundColor: finalBg }} className='py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <EditableText
            tag="h2"
            value={title}
            nodeId={id}
            propName="title"
            className='text-3xl font-bold text-center mb-4'
            style={{ color: finalText }}
          />
          <EditableText
            tag="p"
            value={subtitle}
            nodeId={id}
            propName="subtitle"
            className='text-center mb-12 max-w-3xl mx-auto'
            style={{ color: finalSubtitle }}
          />
          <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3'>
            {displayItems.map((feature, i) => (
              <div
                key={i}
                className='text-center p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200'
                style={{ backgroundColor: finalCardBg }}
              >
                <div className='flex justify-center mb-4'>
                  <Icon
                    icon={feature.icon}
                    className='w-12 h-12'
                    style={{ color: finalAccent }}
                  />
                </div>
                <h3 className='text-lg font-medium' style={{ color: finalText }}>
                  {feature.title}
                </h3>
                <p className='mt-2 text-base' style={{ color: finalSubtitle }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

(TraditionalWhyUs as any).craft = {
  displayName: 'TraditionalWhyUs',
  props: {
    title: '¿Por qué elegirnos?',
    subtitle: 'Descubre por qué nuestros clientes confían en nosotros',
    bgColor: '',
    textColor: '',
    subtitleColor: '',
    accentColor: '',
    cardBgColor: '',
    items: [
      { title: 'Garantía', description: 'Todos nuestros vehículos cuentan con garantía', icon: 'mdi:shield-check' },
      { title: 'Financiamiento', description: 'Opciones de financiamiento flexibles', icon: 'mdi:cash-multiple' },
      { title: 'Calidad', description: 'Vehículos seleccionados y certificados', icon: 'mdi:certificate' },
    ],
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
