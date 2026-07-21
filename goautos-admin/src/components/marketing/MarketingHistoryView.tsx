import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Mail, Car, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MarketingEmailHistory } from '@/types/marketing-emails-history';
import { useI18n } from '@/hooks/useI18n';

const MarketingHistoryView: React.FC = () => {
  const { client } = useAuth();
  const { tCommon } = useI18n();
  const [history, setHistory] = useState<MarketingEmailHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (client?.id) {
      fetchHistory();
    }
  }, [client?.id]);

  const fetchHistory = async () => {
    if (!client?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_emails_history')
        .select(
          `
          *,
          vehicle:vehicles(
            id,
            brand:brands(name),
            model:models(name),
            year,
            price,
            main_image
          )
        `
        )
        .eq('client_id', client.id)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
        toast.error(tCommon('marketing.history.loadError'));
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error(tCommon('marketing.history.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin' />
        <span className='ml-2 text-gray-600'>
          {tCommon('marketing.history.loading')}
        </span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className='py-12'>
          <div className='text-center text-gray-500'>
            <Mail className='h-12 w-12 mx-auto mb-4 opacity-50' />
            <h3 className='text-lg font-medium mb-2'>
              {tCommon('marketing.history.emptyTitle')}
            </h3>
            <p className='text-sm'>
              {tCommon('marketing.history.emptySubtitle')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Stats Summary */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-2'>
              <Mail className='h-5 w-5 text-gray-600' />
              <div className='pl-2'>
                <p className='text-sm text-gray-600'>
                  {tCommon('marketing.history.totalCampaigns')}
                </p>
                <p className='text-2xl font-bold'>{history.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-2'>
              <Users className='h-5 w-5 text-gray-600' />
              <div className='pl-2'>
                <p className='text-sm text-gray-600'>
                  {tCommon('marketing.history.totalRecipients')}
                </p>
                <p className='text-2xl font-bold'>
                  {history.reduce(
                    (sum, item) => sum + item.total_recipients,
                    0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-2'>
              <Car className='h-5 w-5 text-gray-600' />
              <div className='pl-2'>
                <p className='text-sm text-gray-600'>
                  {tCommon('marketing.history.promotedVehicles')}
                </p>
                <p className='text-2xl font-bold'>
                  {new Set(history.map((item) => item.vehicle_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Mail className='h-5 w-5 mr-2' />
            {tCommon('marketing.history.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon('marketing.history.headers.date')}</TableHead>
                  <TableHead>{tCommon('marketing.history.headers.vehicle')}</TableHead>
                  <TableHead>{tCommon('marketing.history.headers.subject')}</TableHead>
                  <TableHead>{tCommon('marketing.history.headers.recipients')}</TableHead>
                  <TableHead>{tCommon('marketing.history.headers.filters')}</TableHead>
                  <TableHead>{tCommon('marketing.history.headers.sender')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className='flex items-center space-x-2'>
                        <Calendar className='h-4 w-4 text-gray-400' />
                        <span className='text-sm'>
                          {formatDate(item.sent_at)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className='flex items-center space-x-3'>
                        {item.vehicle?.main_image && (
                          <img
                            src={item.vehicle.main_image}
                            alt='Vehicle'
                            className='w-12 h-8 object-cover rounded border'
                          />
                        )}
                        <div>
                          <p className='font-medium text-sm'>
                            {item.vehicle?.brand?.name}{' '}
                            {item.vehicle?.model?.name}
                          </p>
                          <p className='text-xs text-gray-600'>
                            {item.vehicle?.year} •{' '}
                            {formatPrice(item.vehicle?.price || 0)}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <p className='font-medium text-sm max-w-xs truncate'>
                        {item.subject}
                      </p>
                    </TableCell>

                    <TableCell>
                      <Badge variant='secondary'>
                        <Users className='h-3 w-3 mr-1' />
                        {item.total_recipients}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className='space-y-1'>
                        {item.filters_applied?.similarity && (
                          <Badge variant='outline' className='text-xs'>
                            {tCommon('marketing.history.labels.similarity')}{' '}
                            {Math.round(item.filters_applied.similarity * 100)}%
                          </Badge>
                        )}
                        {item.filters_applied?.transaction_type && (
                          <Badge variant='outline' className='text-xs'>
                            {item.filters_applied.transaction_type === 'compra'
                              ? tCommon('marketing.history.labels.buyers')
                              : tCommon('marketing.history.labels.sellers')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className='text-sm font-medium'>{item.from_name}</p>
                        <p className='text-xs text-gray-600'>
                          {item.from_email}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingHistoryView;
