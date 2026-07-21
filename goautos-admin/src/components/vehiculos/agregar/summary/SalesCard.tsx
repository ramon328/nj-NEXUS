
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@/types/user';
import { VehicleSales } from '@/types/vehicleCreation';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface SalesCardProps {
  sales: VehicleSales;
}

const SalesCard = ({ sales }: SalesCardProps) => {
  const { userRole, clientId } = useAuth();
  const { t } = useTranslation('common');
  const { users } = useUsers(userRole, clientId?.toString());
  const [seller, setSeller] = useState<User | null>(null);

  useEffect(() => {
    if (sales.sellerId && users.length > 0) {
      const foundSeller = users.find(u => u.id === sales.sellerId);
      if (foundSeller) {
        setSeller(foundSeller);
      }
    }
  }, [sales.sellerId, users]);

  const formatPrice = (price: number | null) => {
    if (!price) return t('addVehicle.common.notDefined');
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('addVehicle.sales.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{t('addVehicle.sales.assignedSellerShort')}</h3>
          <p className="mt-1">
            {seller 
              ? `${seller.first_name} ${seller.last_name}` 
              : t('addVehicle.sales.notAssigned')}
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">{t('addVehicle.sales.minPrice')}</h3>
          <p className="mt-1 font-medium">
            {formatPrice(sales.minPrice)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesCard;
