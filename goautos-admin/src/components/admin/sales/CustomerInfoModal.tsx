import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Phone, User, MapPin, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CustomerInfoModalProps {
  customerId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CustomerDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  rut?: string;
  address?: string;
}

export const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({
  customerId,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation('dashboard');
  const { clientId } = useAuth();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId || !isOpen || !clientId) {
      setCustomer(null);
      return;
    }

    const fetchCustomerDetails = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('customers')
          .select('first_name, last_name, email, phone, rut, address')
          .eq('id', customerId)
          .eq('client_id', clientId)
          .single();

        if (error) {
          console.error('Error fetching customer details:', error);
          return;
        }

        setCustomer(data);
      } catch (error) {
        console.error('Error in fetchCustomerDetails:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [customerId, isOpen, clientId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('salesSummary.customerInfo')}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        ) : customer ? (
          <div className="space-y-4">
            {/* Nombre */}
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t('salesSummary.name')}
                </p>
                <p className="text-base">
                  {customer.first_name} {customer.last_name}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Mail className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t('salesSummary.email')}
                </p>
                <p className="text-base break-all">{customer.email}</p>
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Phone className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {t('salesSummary.phone')}
                </p>
                <p className="text-base">{customer.phone}</p>
              </div>
            </div>

            {/* RUT */}
            {customer.rut && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {t('salesSummary.rut')}
                  </p>
                  <p className="text-base">{customer.rut}</p>
                </div>
              </div>
            )}

            {/* Dirección */}
            {customer.address && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <MapPin className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {t('salesSummary.address')}
                  </p>
                  <p className="text-base">{customer.address}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {t('salesSummary.noCustomerData')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
