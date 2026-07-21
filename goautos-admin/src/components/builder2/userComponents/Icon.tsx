import React from 'react';
import { useNode } from '@craftjs/core';
import {
  Star,
  Heart,
  Check,
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  Car,
  DollarSign,
  Users,
  Settings,
  Home,
  Award,
  Zap,
  ThumbsUp,
} from 'lucide-react';

interface IconProps {
  name?: string;
  size?: number;
  color?: string;
}

const iconMap: Record<string, React.FC<{ size: number; color: string }>> = {
  star: ({ size, color }) => <Star size={size} color={color} />,
  heart: ({ size, color }) => <Heart size={size} color={color} />,
  check: ({ size, color }) => <Check size={size} color={color} />,
  phone: ({ size, color }) => <Phone size={size} color={color} />,
  mail: ({ size, color }) => <Mail size={size} color={color} />,
  'map-pin': ({ size, color }) => <MapPin size={size} color={color} />,
  clock: ({ size, color }) => <Clock size={size} color={color} />,
  shield: ({ size, color }) => <Shield size={size} color={color} />,
  car: ({ size, color }) => <Car size={size} color={color} />,
  dollar: ({ size, color }) => <DollarSign size={size} color={color} />,
  users: ({ size, color }) => <Users size={size} color={color} />,
  settings: ({ size, color }) => <Settings size={size} color={color} />,
  home: ({ size, color }) => <Home size={size} color={color} />,
  award: ({ size, color }) => <Award size={size} color={color} />,
  zap: ({ size, color }) => <Zap size={size} color={color} />,
  'thumbs-up': ({ size, color }) => <ThumbsUp size={size} color={color} />,
};

export const Icon = ({
  name = 'star',
  size = 24,
  color = '#374151',
}: IconProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const IconComponent = iconMap[name] || iconMap.star;

  return (
    <div
      ref={connectors.connect}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
        padding: '4px',
      }}
    >
      <IconComponent size={size} color={color} />
    </div>
  );
};

(Icon as any).craft = {
  displayName: 'Icon',
  props: {
    name: 'star',
    size: 24,
    color: '#374151',
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
