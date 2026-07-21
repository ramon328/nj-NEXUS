
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500">Activa</Badge>;
    case 'completed':
      return <Badge className="bg-blue-500">Completada</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-500">Cancelada</Badge>;
    case 'expired':
      return <Badge className="bg-yellow-500">Vencida</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default StatusBadge;
