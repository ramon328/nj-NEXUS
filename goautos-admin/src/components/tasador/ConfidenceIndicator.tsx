import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence?: 'high' | 'medium' | 'low';
}

const config = {
  high: {
    icon: ShieldCheck,
    label: 'Alta confianza',
    description: '5+ publicaciones analizadas',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  medium: {
    icon: Shield,
    label: 'Confianza media',
    description: '3-4 publicaciones analizadas',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  low: {
    icon: ShieldAlert,
    label: 'Datos limitados',
    description: 'Pocas publicaciones encontradas',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
};

const ConfidenceIndicator = ({ confidence }: ConfidenceIndicatorProps) => {
  if (!confidence) return null;

  const cfg = config[confidence];
  const Icon = cfg.icon;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.border} border`}
    >
      <Icon className={`w-4 h-4 ${cfg.color}`} />
      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
};

export default ConfidenceIndicator;
