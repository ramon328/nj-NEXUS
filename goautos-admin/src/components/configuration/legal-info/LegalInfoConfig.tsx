import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Edit2, Trash2, Building2, Globe, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LegalInfo {
  id?: number;
  company_name: string;
  rut: string;
  legal_representative: string;
  legal_address: string;
  client_id?: number;
  dealership_id?: number | null;
}

interface Dealership {
  id: number;
  name: string;
  address?: string;
}

export const LegalInfoConfig = () => {
  const { toast } = useToast();
  const { client } = useAuth();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [legalInfoList, setLegalInfoList] = useState<LegalInfo[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLegalInfo, setEditingLegalInfo] = useState<LegalInfo | null>(null);
  const [formData, setFormData] = useState<LegalInfo>({
    company_name: '',
    rut: '',
    legal_representative: '',
    legal_address: '',
    dealership_id: null,
  });

  useEffect(() => {
    if (client?.id) {
      loadData();
    }
  }, [client]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all legal_info for this client
      const { data: legalData, error: legalError } = await supabase
        .from('legal_info')
        .select('*')
        .eq('client_id', client?.id)
        .order('dealership_id', { ascending: true, nullsFirst: true });

      if (legalError) throw legalError;

      // Load all dealerships for this client
      const { data: dealershipData, error: dealershipError } = await supabase
        .from('dealerships')
        .select('id, name, address')
        .eq('client_id', client?.id)
        .order('name');

      if (dealershipError) throw dealershipError;

      setLegalInfoList(legalData || []);
      setDealerships(dealershipData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: t('actions.error'),
        description: 'Error al cargar información legal',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (legalInfo?: LegalInfo) => {
    if (legalInfo) {
      setEditingLegalInfo(legalInfo);
      setFormData(legalInfo);
    } else {
      setEditingLegalInfo(null);
      setFormData({
        company_name: '',
        rut: '',
        legal_representative: '',
        legal_address: '',
        dealership_id: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDealershipChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      dealership_id: value === 'general' ? null : parseInt(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.id) return;

    try {
      setSaving(true);

      const legalData = {
        ...formData,
        client_id: client.id,
      };

      if (editingLegalInfo?.id) {
        // Update existing
        const { error } = await supabase
          .from('legal_info')
          .update({
            company_name: legalData.company_name,
            rut: legalData.rut,
            legal_representative: legalData.legal_representative,
            legal_address: legalData.legal_address,
            dealership_id: legalData.dealership_id,
          })
          .eq('id', editingLegalInfo.id);

        if (error) throw error;
      } else {
        // Create new - exclude id field
        const { id, ...insertData } = legalData;
        const { error } = await supabase.from('legal_info').insert(insertData);

        if (error) throw error;
      }

      toast({
        title: 'Éxito',
        description: editingLegalInfo
          ? 'Información legal actualizada correctamente'
          : 'Información legal creada correctamente',
      });

      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving legal info:', error);
      toast({
        title: t('actions.error'),
        description: error.message || 'Error al guardar información legal',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta información legal?')) return;

    try {
      const { error } = await supabase.from('legal_info').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Información legal eliminada correctamente',
      });

      loadData();
    } catch (error: any) {
      console.error('Error deleting legal info:', error);
      toast({
        title: t('actions.error'),
        description: 'Error al eliminar información legal',
        variant: 'destructive',
      });
    }
  };

  const getDealershipName = (dealershipId: number | null | undefined) => {
    if (!dealershipId) return 'General (Todo el cliente)';
    const dealership = dealerships.find((d) => d.id === dealershipId);
    return dealership?.name || `Sucursal ID: ${dealershipId}`;
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-[17px] font-semibold text-slate-900 tracking-tight'>Información Legal</h2>
          <p className='text-[13px] text-slate-500'>
            Gestiona la información legal para tu empresa y sucursales
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className='h-9 rounded-xl text-[13px] font-medium' onClick={() => handleOpenDialog()}>
              <Plus className='w-4 h-4 mr-2' />
              Agregar Información Legal
            </Button>
          </DialogTrigger>
          <DialogContent className='max-w-2xl rounded-2xl'>
            <DialogHeader>
              <DialogTitle>
                {editingLegalInfo ? 'Editar' : 'Agregar'} Información Legal
              </DialogTitle>
              <DialogDescription>
                {editingLegalInfo
                  ? 'Actualiza los datos legales'
                  : 'Crea nueva información legal para tu empresa o una sucursal específica'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='dealership_select'>Aplicar a</Label>
                <Select
                  value={
                    formData.dealership_id === null
                      ? 'general'
                      : String(formData.dealership_id)
                  }
                  onValueChange={handleDealershipChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Seleccionar alcance' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='general'>
                      <div className='flex items-center'>
                        <Globe className='w-4 h-4 mr-2' />
                        General (Todo el cliente)
                      </div>
                    </SelectItem>
                    {dealerships.map((dealership) => (
                      <SelectItem key={dealership.id} value={String(dealership.id)}>
                        <div className='flex items-center'>
                          <Building2 className='w-4 h-4 mr-2' />
                          {dealership.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className='text-xs text-muted-foreground'>
                  Si seleccionas una sucursal específica, esta información legal solo se
                  aplicará a los documentos de vehículos de esa sucursal.
                </p>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='company_name'>Razón Social</Label>
                <Input
                  id='company_name'
                  name='company_name'
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder='Ej: Automotora Los Ángeles SpA'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='rut'>RUT</Label>
                <Input
                  id='rut'
                  name='rut'
                  value={formData.rut}
                  onChange={handleChange}
                  placeholder='Ej: 76.123.456-7'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='legal_representative'>Representante Legal</Label>
                <Input
                  id='legal_representative'
                  name='legal_representative'
                  value={formData.legal_representative}
                  onChange={handleChange}
                  placeholder='Ej: Juan Pérez García'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='legal_address'>Dirección Legal</Label>
                <Input
                  id='legal_address'
                  name='legal_address'
                  value={formData.legal_address}
                  onChange={handleChange}
                  placeholder="Ej: Av. Libertador Bernardo O'Higgins 123, Santiago"
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  className='h-9 rounded-xl text-[13px]'
                  onClick={() => setIsDialogOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type='submit' className='h-9 rounded-xl text-[13px]' disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className='flex justify-center items-center py-12'>
          <Loader2 className='w-6 h-6 animate-spin text-slate-400' />
        </div>
      ) : legalInfoList.length === 0 ? (
        <Card className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
          <CardContent className='py-16 flex flex-col items-center text-center'>
            <div className='w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center mb-5'>
              <Scale className='w-7 h-7 text-slate-400' />
            </div>
            <p className='text-[15px] font-semibold text-slate-900 mb-1'>
              No hay información legal configurada
            </p>
            <p className='text-[13px] text-slate-400 mb-5'>
              Agrega tu primera información legal para comenzar
            </p>
            <Button className='h-9 rounded-xl text-[13px] font-medium' onClick={() => handleOpenDialog()}>
              <Plus className='w-4 h-4 mr-2' />
              Agregar Información Legal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4'>
          {legalInfoList.map((legalInfo) => (
            <Card key={legalInfo.id} className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
              <CardHeader>
                <div className='flex justify-between items-start'>
                  <div className='flex items-center gap-2'>
                    {legalInfo.dealership_id ? (
                      <Building2 className='w-5 h-5 text-primary' />
                    ) : (
                      <Globe className='w-5 h-5 text-primary' />
                    )}
                    <div>
                      <CardTitle className='text-[15px] font-semibold text-slate-900'>
                        {legalInfo.company_name}
                      </CardTitle>
                      <CardDescription>
                        {getDealershipName(legalInfo.dealership_id)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleOpenDialog(legalInfo)}
                    >
                      <Edit2 className='w-4 h-4' />
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => handleDelete(legalInfo.id!)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <dt className='text-[12px] uppercase tracking-wider text-slate-400 font-medium'>RUT</dt>
                    <dd className='text-[13px] text-slate-700'>{legalInfo.rut}</dd>
                  </div>
                  <div>
                    <dt className='text-[12px] uppercase tracking-wider text-slate-400 font-medium'>
                      Representante Legal
                    </dt>
                    <dd className='text-[13px] text-slate-700'>{legalInfo.legal_representative}</dd>
                  </div>
                  <div className='col-span-2'>
                    <dt className='text-[12px] uppercase tracking-wider text-slate-400 font-medium'>
                      Dirección Legal
                    </dt>
                    <dd className='text-[13px] text-slate-700'>{legalInfo.legal_address}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LegalInfoConfig;
