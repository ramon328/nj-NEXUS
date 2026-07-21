import React from 'react';
import { Card } from '@/components/ui/card';
import { Users, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface MarketingStatsCardsProps {
  selectedCustomersCount: number;
  totalCustomersCount: number;
  isEmailCampaignEnabled: boolean;
  onEmailCampaignToggle: (checked: boolean) => void;
  hasSelectedCustomers: boolean;
}

const MarketingStatsCards = ({
  selectedCustomersCount,
  totalCustomersCount,
  isEmailCampaignEnabled,
  onEmailCampaignToggle,
  hasSelectedCustomers,
}: MarketingStatsCardsProps) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <Card className='p-6'>
        <div className='flex items-center gap-2 mb-4'>
          <Users className='h-5 w-5 text-muted-foreground' />
          <h3 className='text-lg font-medium'>Clientes Potenciales</h3>
        </div>
        <p className='text-3xl font-semibold mb-2'>
          {selectedCustomersCount} / {totalCustomersCount}
        </p>
        <p className='text-sm text-muted-foreground'>
          Clientes seleccionados para campaña
        </p>
      </Card>

      <Card className='p-6'>
        <div className='flex items-center gap-2 mb-4'>
          <Mail className='h-5 w-5 text-muted-foreground' />
          <h3 className='text-lg font-medium'>Campaña de Email</h3>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>
            {isEmailCampaignEnabled ? 'Activada' : 'Desactivada'}
          </span>
          <Switch
            checked={isEmailCampaignEnabled}
            onCheckedChange={onEmailCampaignToggle}
            disabled={!hasSelectedCustomers}
          />
        </div>
        <p className='text-sm text-muted-foreground mt-2'>
          {!hasSelectedCustomers
            ? 'Seleccione clientes para activar'
            : isEmailCampaignEnabled
            ? 'Se notificará a los clientes seleccionados'
            : 'Active para notificar a los clientes'}
        </p>
      </Card>
    </div>
  );
};

export default MarketingStatsCards;
