import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DealershipDialog } from './DealershipDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import LegalInfoConfig from '@/components/configuration/legal-info/LegalInfoConfig';

// Define the location structure
interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface Dealership {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  location?: Location;
  opening_hours?: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
}

// Type for raw database response
interface DbDealership {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  location?: any; // JSON from the database
  opening_hours?: any; // JSON from the database
  client_id: number;
  created_at?: string;
}

interface DealershipsConfigProps {
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

export const DealershipsConfig = ({ createDialogOpen, onCreateDialogOpenChange }: DealershipsConfigProps) => {
  const { t } = useTranslation('common');
  const { clientId } = useAuth();
  const [selectedDealership, setSelectedDealership] =
    useState<Dealership | null>(null);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isDialogOpen = createDialogOpen ?? internalDialogOpen;
  const setIsDialogOpen = onCreateDialogOpenChange ?? setInternalDialogOpen;

  const { data: dealerships, refetch } = useQuery({
    queryKey: ['dealerships', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealerships')
        .select('*')
        .eq('client_id', clientId);

      if (error) {
        console.error('Error fetching dealerships:', error);
        return [];
      }

      // Transform the raw data to ensure location is properly typed
      return (data as DbDealership[]).map((dealership) => ({
        id: dealership.id,
        name: dealership.name || '',
        address: dealership.address,
        phone: dealership.phone,
        email: dealership.email,
        location: dealership.location as Location,
        opening_hours: dealership.opening_hours ?? null,
      }));
    },
  });

  const handleDelete = async () => {
    if (!selectedDealership) return;

    try {
      const { error } = await supabase
        .from('dealerships')
        .delete()
        .eq('id', selectedDealership.id);

      if (error) throw error;

      toast({ title: t('configuration.dealerships.toasts.deleted') });
      refetch();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: t('actions.error'),
        description: t('configuration.dealerships.toasts.deleteError'),
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedDealership(null);
    }
  };

  const openGoogleMaps = (dealership: Dealership) => {
    if (dealership.location?.lat && dealership.location?.lng) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${dealership.location.lat},${dealership.location.lng}`,
        '_blank'
      );
    } else {
      toast({
        title: t('actions.error'),
        description: t('configuration.dealerships.noCoordinates'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className='space-y-4'>
      <div className='rounded-2xl overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60'>
        <Table>
          <TableHeader>
            <TableRow className='border-b border-slate-100'>
              <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                Nombre
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                {t('configuration.dealerships.table.address')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                {t('configuration.dealerships.table.phone')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3'>
                {t('configuration.dealerships.table.email')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium text-right pr-4'>{t('configuration.dealerships.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dealerships?.map((dealership) => (
              <TableRow key={dealership.id} className='hover:bg-slate-50/50 transition-colors'>
                <TableCell className='text-[13px] text-slate-900 font-medium'>{dealership.name || 'Sin nombre'}</TableCell>
                <TableCell className='text-[13px] text-slate-700'>{dealership.address}</TableCell>
                <TableCell className='text-[13px] text-slate-700'>{dealership.phone}</TableCell>
                <TableCell className='text-[13px] text-slate-700'>{dealership.email}</TableCell>
                <TableCell>
                  <TooltipProvider>
                    <div className='flex items-center justify-end gap-1'>
                      {dealership.location?.lat && dealership.location?.lng && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 hover:bg-emerald-50 hover:text-emerald-600'
                              onClick={() => openGoogleMaps(dealership)}
                            >
                              <MapPin className='h-4 w-4' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('configuration.dealerships.viewOnMaps')}</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 hover:bg-blue-50 hover:text-blue-600'
                            onClick={() => {
                              setSelectedDealership(dealership);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 hover:bg-red-50 hover:text-red-600'
                            onClick={() => {
                              setSelectedDealership(dealership);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LegalInfoConfig />

      <DealershipDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedDealership(null);
        }}
        dealership={selectedDealership || undefined}
        onSuccess={refetch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('configuration.dealerships.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('configuration.dealerships.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
