import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText, EditableArrayText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import {
  IconCheck,
  IconCurrencyDollar,
  IconUserCircle,
  IconCar,
  IconStar,
  IconShield,
  IconHome,
  IconClock,
  IconSettings,
  IconPhone,
  IconMail,
  IconMap,
} from '@tabler/icons-react';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
  cardBgColor: string;
  cardTextColor: string;
  descriptionColor: string;
  cardStyle: string;
  iconColor: string;
  nodeId: string;
  index: number;
}

const FeatureCard = ({
  icon,
  title,
  description,
  link,
  cardBgColor,
  cardTextColor,
  descriptionColor,
  cardStyle,
  iconColor,
  nodeId,
  index,
}: FeatureCardProps) => {
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const handleClick = () => {
    if (isEnabled || !link) return;

    // Phone/WhatsApp detection
    const phoneRegex = /^(\+?[\d\s\-\(\)]+)$/;
    if (phoneRegex.test(link.trim())) {
      const clean = link.replace(/[\s\-\(\)]/g, '');
      const num = clean.startsWith('+') ? clean : clean.startsWith('56') ? `+${clean}` : `+56${clean}`;
      window.open(`https://wa.me/${num}`, '_blank');
      return;
    }

    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
    } else if (link.startsWith('#')) {
      document.querySelector(link)?.scrollIntoView({ behavior: 'smooth' });
    } else if (link.startsWith('/')) {
      window.location.href = link;
    } else {
      window.open(`https://${link}`, '_blank');
    }
  };

  const getCardClasses = () => {
    const base = 'rounded-xl p-8 flex flex-col items-center text-center transition-all duration-300';
    switch (cardStyle) {
      case 'elevated':
        return `${base} shadow-md hover:shadow-xl hover:-translate-y-1`;
      case 'bordered':
        return `${base} border border-gray-200 hover:border-gray-300 hover:shadow-lg hover:-translate-y-1`;
      case 'glass':
        return `${base} backdrop-blur-sm border border-white/20 hover:shadow-lg hover:-translate-y-1`;
      case 'flat':
      default:
        return `${base} hover:shadow-lg hover:-translate-y-1`;
    }
  };

  return (
    <div
      className={getCardClasses()}
      style={{ backgroundColor: cardBgColor, cursor: link && !isEnabled ? 'pointer' : undefined }}
      onClick={link && !isEnabled ? handleClick : undefined}
    >
      <div
        className='mb-5 w-16 h-16 rounded-2xl flex items-center justify-center'
        style={{ backgroundColor: `${iconColor}12` }}
      >
        {icon}
      </div>
      <EditableArrayText tag="h3" value={title} nodeId={nodeId} arrayProp="features" index={index} field="title" className='text-xl font-semibold mb-3' style={{ color: cardTextColor }} />
      <EditableArrayText tag="p" value={description} nodeId={nodeId} arrayProp="features" index={index} field="description" className='text-sm leading-relaxed' style={{ color: descriptionColor }} />
    </div>
  );
};

interface WhyChooseUsProps {
  sectionTitle?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  features?: {
    icon: string;
    title: string;
    description: string;
    link?: string;
  }[];
  bgColor?: string;
  textColor?: string;
  cardBgColor?: string;
  cardTextColor?: string;
  iconColor?: string;
  descriptionColor?: string;
  cardStyle?: 'flat' | 'elevated' | 'bordered' | 'glass';
  columns?: 2 | 3 | 4;
}

export const WhyChooseUs = ({
  sectionTitle = '¿Por qué elegirnos?',
  titleAlignment = 'center',
  features = [
    {
      icon: 'check',
      title: 'Autos inspeccionados y garantizados',
      description: 'Cada vehículo pasa por un riguroso proceso de inspección para garantizar tu seguridad y tranquilidad.',
      link: '#garantia',
    },
    {
      icon: 'dollar',
      title: 'Financiamiento a tu medida',
      description: 'Planes de financiamiento flexibles diseñados para adaptarse a tus necesidades y presupuesto.',
      link: '#financiamiento',
    },
    {
      icon: 'user',
      title: 'Atención personalizada',
      description: 'Un asesor dedicado te acompaña en cada paso del proceso de compra.',
      link: '#contacto',
    },
  ],
  bgColor = '#ffffff',
  textColor = '#111827',
  cardBgColor = '#f9fafb',
  cardTextColor = '#111827',
  iconColor,
  descriptionColor = '#6b7280',
  cardStyle = 'bordered',
  columns = 3,
}: WhyChooseUsProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalIconColor = iconColor || clientDefaults.primaryColor;

  const getIcon = (iconType: string, size = 32) => {
    const iconProps = { size, style: { color: finalIconColor } };

    switch (iconType) {
      case 'check': return <IconCheck {...iconProps} />;
      case 'dollar': return <IconCurrencyDollar {...iconProps} />;
      case 'user': return <IconUserCircle {...iconProps} />;
      case 'car': return <IconCar {...iconProps} />;
      case 'star': return <IconStar {...iconProps} />;
      case 'shield': return <IconShield {...iconProps} />;
      case 'home': return <IconHome {...iconProps} />;
      case 'clock': return <IconClock {...iconProps} />;
      case 'settings': return <IconSettings {...iconProps} />;
      case 'phone': return <IconPhone {...iconProps} />;
      case 'mail': return <IconMail {...iconProps} />;
      case 'map': return <IconMap {...iconProps} />;
      default: return <IconCheck {...iconProps} />;
    }
  };

  const columnClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div
      ref={connectors.connect}
      style={{
        background: bgColor,
        color: textColor,
        padding: '80px 20px',
        position: 'relative',
        border: selected ? '2px dashed #666666' : '1px solid transparent',
        outline: selected ? '1px dashed #999999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className='w-full'
    >
      {selected && <DeleteButton nodeId={id} />}
      <div className='max-w-6xl mx-auto'>
        <div className='text-center mb-14'>
          <p className='text-sm font-semibold uppercase tracking-widest mb-3' style={{ color: finalIconColor }}>
            Nuestras ventajas
          </p>
          <EditableText tag="h2" value={sectionTitle} nodeId={id} propName="sectionTitle"
            className='text-3xl md:text-4xl lg:text-5xl font-bold'
            style={{ color: textColor, textAlign: titleAlignment }}
          />
        </div>

        <div className={`grid gap-6 ${columnClass}`}>
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={getIcon(feature.icon)}
              title={feature.title}
              description={feature.description}
              link={feature.link}
              cardBgColor={cardBgColor}
              cardTextColor={cardTextColor}
              descriptionColor={descriptionColor}
              cardStyle={cardStyle}
              iconColor={finalIconColor}
              nodeId={id}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const clientDefaults = getPersonalizedDefaults(null);

WhyChooseUs.craft = {
  displayName: 'WhyChooseUs',
  props: {
    sectionTitle: `¿Por qué elegir ${clientDefaults.companyName}?`,
    titleAlignment: 'center',
    features: [
      {
        icon: 'check',
        title: 'Autos inspeccionados y garantizados',
        description: 'Cada vehículo pasa por un riguroso proceso de inspección para garantizar tu seguridad y tranquilidad.',
        link: '#garantia',
      },
      {
        icon: 'dollar',
        title: 'Financiamiento a tu medida',
        description: 'Planes de financiamiento flexibles diseñados para adaptarse a tus necesidades y presupuesto.',
        link: '#financiamiento',
      },
      {
        icon: 'user',
        title: 'Atención personalizada',
        description: 'Un asesor dedicado te acompaña en cada paso del proceso de compra.',
        link: '#contacto',
      },
    ],
    bgColor: '#ffffff',
    textColor: '#111827',
    cardBgColor: '#f9fafb',
    cardTextColor: '#111827',
    iconColor: clientDefaults.primaryColor,
    descriptionColor: '#6b7280',
    cardStyle: 'bordered',
    columns: 3,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
};
