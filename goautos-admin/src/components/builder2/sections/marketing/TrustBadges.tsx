import React from 'react';
import { useNode } from '@craftjs/core';
import { EditableText, EditableArrayText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import {
  ShieldCheck,
  BadgeCheck,
  Award,
  Search,
  RefreshCcw,
  Banknote,
  Clock,
  Wrench,
  FileCheck,
  Headphones,
  Truck,
  Lock,
  Sparkles,
  Handshake,
  ThumbsUp,
} from 'lucide-react';

type TrustIconName =
  | 'shield-check'
  | 'badge-check'
  | 'award'
  | 'search'
  | 'refresh-ccw'
  | 'banknote'
  | 'clock'
  | 'wrench'
  | 'file-check'
  | 'headphones'
  | 'truck'
  | 'lock'
  | 'sparkles'
  | 'handshake'
  | 'thumbs-up';

const iconMap: Record<TrustIconName, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  'shield-check': ShieldCheck,
  'badge-check': BadgeCheck,
  award: Award,
  search: Search,
  'refresh-ccw': RefreshCcw,
  banknote: Banknote,
  clock: Clock,
  wrench: Wrench,
  'file-check': FileCheck,
  headphones: Headphones,
  truck: Truck,
  lock: Lock,
  sparkles: Sparkles,
  handshake: Handshake,
  'thumbs-up': ThumbsUp,
};

interface TrustBadgeItem {
  icon: TrustIconName;
  title: string;
  subtitle?: string;
}

interface TrustBadgesProps {
  sectionTitle?: string;
  subtitle?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  badges?: TrustBadgeItem[];
  columns?: string | number;
  cardStyle?: 'card' | 'minimal';
  iconPosition?: 'top' | 'left';
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  cardBgColor?: string;
}

const DEFAULT_BADGES: TrustBadgeItem[] = [
  {
    icon: 'shield-check',
    title: 'Garantía 12 meses',
    subtitle: 'Cobertura completa de motor y transmisión',
  },
  {
    icon: 'search',
    title: 'Inspección 150 puntos',
    subtitle: 'Cada vehículo revisado por mecánicos certificados',
  },
  {
    icon: 'refresh-ccw',
    title: 'Devolución 7 días',
    subtitle: 'Si no quedas conforme, te devolvemos tu plata',
  },
  {
    icon: 'banknote',
    title: 'Financiamiento aprobado',
    subtitle: 'En 24 horas, con o sin pie',
  },
];

export const TrustBadges = ({
  sectionTitle = '¿Por qué confiar en nosotros?',
  subtitle = 'Compromisos concretos con cada cliente',
  titleAlignment = 'center',
  badges,
  columns = 4,
  cardStyle = 'card',
  iconPosition = 'top',
  bgColor,
  textColor,
  accentColor,
  cardBgColor,
}: TrustBadgesProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);

  const finalBgColor = bgColor || clientDefaults.backgroundColor;
  const finalTextColor = textColor || clientDefaults.textColor;
  const finalAccentColor = accentColor || clientDefaults.primaryColor;
  const finalCardBgColor = cardBgColor || '#ffffff';
  const finalBadges = badges && badges.length > 0 ? badges : DEFAULT_BADGES;

  const numColumns = typeof columns === 'string' ? parseInt(columns, 10) : columns;
  const columnClass =
    {
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-2 lg:grid-cols-4',
    }[numColumns] || 'grid-cols-2 lg:grid-cols-4';

  const isCard = cardStyle === 'card';
  const isLeft = iconPosition === 'left';
  const subtitleColor = `${finalTextColor}99`;

  return (
    <div
      ref={(el: HTMLDivElement | null) => {
        if (el) connectors.connect(el);
      }}
      style={{
        backgroundColor: finalBgColor,
        color: finalTextColor,
        position: 'relative',
        border: selected ? '2px dashed #666' : '1px solid transparent',
        outline: selected ? '1px dashed #999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className='w-full py-16 md:py-20 px-4 sm:px-6 lg:px-8'
    >
      {selected && <DeleteButton nodeId={id} />}

      <div className='max-w-6xl mx-auto'>
        <div className='mb-12' style={{ textAlign: titleAlignment }}>
          <EditableText
            tag='h2'
            value={sectionTitle}
            nodeId={id}
            propName='sectionTitle'
            className='text-3xl md:text-4xl font-bold mb-3'
            style={{ color: finalTextColor }}
          />
          {subtitle && (
            <EditableText
              tag='p'
              value={subtitle}
              nodeId={id}
              propName='subtitle'
              className='text-base md:text-lg max-w-2xl'
              style={{
                color: subtitleColor,
                marginLeft: titleAlignment === 'center' ? 'auto' : 0,
                marginRight: titleAlignment === 'center' ? 'auto' : 0,
              }}
            />
          )}
        </div>

        <div className={`grid gap-6 ${columnClass}`}>
          {finalBadges.map((badge, index) => {
            const IconComponent = iconMap[badge.icon] || ShieldCheck;
            return (
              <div
                key={index}
                className={`${
                  isCard
                    ? 'p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5'
                    : 'p-2'
                } ${isLeft ? 'flex items-start gap-4' : 'flex flex-col items-center text-center'}`}
                style={
                  isCard
                    ? {
                        backgroundColor: finalCardBgColor,
                        borderColor: `${finalTextColor}14`,
                        boxShadow: `0 1px 3px ${finalTextColor}0d`,
                      }
                    : undefined
                }
              >
                <div
                  className={`flex-shrink-0 flex items-center justify-center ${
                    isLeft ? 'w-14 h-14' : 'w-16 h-16 mb-4'
                  }`}
                  style={{
                    backgroundColor: `${finalAccentColor}14`,
                    borderRadius: '50%',
                  }}
                >
                  <IconComponent
                    size={isLeft ? 26 : 30}
                    style={{ color: finalAccentColor }}
                  />
                </div>

                <div className={isLeft ? 'flex-1 min-w-0' : 'w-full'}>
                  <EditableArrayText
                    tag='h3'
                    value={badge.title}
                    nodeId={id}
                    arrayProp='badges'
                    index={index}
                    field='title'
                    className='text-base md:text-lg font-bold leading-tight mb-1.5'
                    style={{ color: finalTextColor }}
                  />
                  {badge.subtitle !== undefined && (
                    <EditableArrayText
                      tag='p'
                      value={badge.subtitle}
                      nodeId={id}
                      arrayProp='badges'
                      index={index}
                      field='subtitle'
                      className='text-sm leading-relaxed'
                      style={{ color: subtitleColor }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

TrustBadges.craft = {
  displayName: 'TrustBadges',
  props: {
    sectionTitle: '¿Por qué confiar en nosotros?',
    subtitle: 'Compromisos concretos con cada cliente',
    titleAlignment: 'center',
    badges: DEFAULT_BADGES,
    columns: 4,
    cardStyle: 'card',
    iconPosition: 'top',
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
};
