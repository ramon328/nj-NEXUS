import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, Car, Link2, ExternalLink, Check, Loader2 } from 'lucide-react';

interface MeliPublication {
  meli_item_id: string;
  title: string;
  price: number;
  currency_id: string;
  status: string;
  permalink: string;
  thumbnail: string;
  listing_type_id: string;
  category_id: string;
  date_created: string;
}

interface ImportMercadoLibreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integrationId: number;
  clientId: number;
  onSuccess: () => void;
}

const ImportMercadoLibreDialog: React.FC<ImportMercadoLibreDialogProps> = ({
  isOpen,
  onClose,
  integrationId,
  clientId,
  onSuccess,
}) => {
  const [selectedLinks, setSelectedLinks] = useState<Record<string, number>>({});
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const [selectingFor, setSelectingFor] = useState<string | null>(null);
  const [linkedItems, setLinkedItems] = useState<Set<string>>(new Set());

  // Fetch unlinked ML publications
  const { data: publications, isLoading: loadingPubs } = useQuery({
    queryKey: ['ml-import-publications', integrationId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'import-mercadolibre-publications',
        { body: { integrationId } }
      );
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      // Fallos parciales de la API de ML: avisamos que la lista puede venir
      // incompleta en vez de mostrar "todas vinculadas" silenciosamente.
      if (data.partialError) {
        toast({
          title: 'Algunos avisos no se pudieron cargar',
          description: `${data.partialError} Vuelve a intentar en unos minutos si falta alguno.`,
          variant: 'destructive',
          duration: 7000,
        });
      }
      return data.publications as MeliPublication[];
    },
    enabled: isOpen && !!integrationId,
  });

  // Fetch client vehicles
  const { data: vehicles } = useQuery({
    queryKey: ['ml-import-vehicles', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id, year, price, mileage, main_image,
          brand:brand_id(name),
          model:model_id(name),
          status:status_id(name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!clientId,
  });

  const filteredVehicles = (vehicles || []).filter((v: any) => {
    const statusName = v.status?.name?.toLowerCase() || '';
    if (statusName.includes('vendido') || statusName.includes('sold')) return false;
    if (!vehicleSearch) return true;
    const term = vehicleSearch.toLowerCase();
    const brand = v.brand?.name?.toLowerCase() || '';
    const model = v.model?.name?.toLowerCase() || '';
    const year = v.year?.toString() || '';
    return brand.includes(term) || model.includes(term) || year.includes(term);
  });

  const handleLink = async (pub: MeliPublication, vehicleId: number) => {
    setLinkingItemId(pub.meli_item_id);
    try {
      const { error } = await supabase.from('meli_post').insert({
        vehicle_id: vehicleId,
        user_id: clientId,
        title: pub.title,
        price: pub.price,
        meli_item_id: pub.meli_item_id,
        url_post: pub.permalink,
        status: pub.status,
        type_post: pub.listing_type_id,
        category_id: null,
      });

      if (error) throw error;

      setLinkedItems((prev) => new Set(prev).add(pub.meli_item_id));
      setSelectedLinks((prev) => ({ ...prev, [pub.meli_item_id]: vehicleId }));
      setSelectingFor(null);
      setVehicleSearch('');

      toast({
        title: 'Publicación vinculada',
        description: `"${pub.title}" vinculada exitosamente.`,
      });
    } catch (err: any) {
      console.error('Error linking publication:', err);
      toast({
        title: 'Error al vincular',
        description: err.message || 'No se pudo vincular la publicación.',
        variant: 'destructive',
      });
    } finally {
      setLinkingItemId(null);
    }
  };

  const handleClose = () => {
    if (linkedItems.size > 0) {
      onSuccess();
    }
    setSelectingFor(null);
    setVehicleSearch('');
    setLinkedItems(new Set());
    setSelectedLinks({});
    onClose();
  };

  const getListingTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      free: { label: 'Free', color: 'bg-green-100 text-green-800' },
      silver: { label: 'Silver', color: 'bg-gray-100 text-gray-800' },
      gold: { label: 'Gold', color: 'bg-yellow-100 text-yellow-800' },
      gold_premium: { label: 'Gold Premium', color: 'bg-purple-100 text-purple-800' },
    };
    const info = types[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const unlinkedPubs = (publications || []).filter(
    (p) => !linkedItems.has(p.meli_item_id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Importar publicaciones de MercadoLibre
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Vincula tus publicaciones existentes en MercadoLibre con vehículos de tu inventario.
          </p>
        </DialogHeader>

        {loadingPubs ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Buscando publicaciones en MercadoLibre...
          </div>
        ) : !publications || publications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Todas tus publicaciones ya están vinculadas.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {linkedItems.size > 0 && (
              <div className="text-sm text-green-600 font-medium">
                {linkedItems.size} publicación(es) vinculada(s)
              </div>
            )}

            {unlinkedPubs.map((pub) => (
              <div
                key={pub.meli_item_id}
                className="border rounded-lg p-3 space-y-3"
              >
                {/* Publication info */}
                <div className="flex items-start gap-3">
                  {pub.thumbnail && (
                    <img
                      src={pub.thumbnail}
                      alt={pub.title}
                      className="w-16 h-16 rounded-md object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pub.title}</p>
                    <p className="text-sm text-gray-500">
                      ${pub.price?.toLocaleString('es-CL')} {pub.currency_id}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getListingTypeBadge(pub.listing_type_id)}
                      <Badge className={pub.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                        {pub.status === 'active' ? 'Activa' : pub.status === 'paused' ? 'Pausada' : pub.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={pub.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {selectingFor !== pub.meli_item_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectingFor(pub.meli_item_id);
                          setVehicleSearch('');
                        }}
                        disabled={linkingItemId !== null}
                      >
                        <Link2 className="h-4 w-4 mr-1.5" />
                        Vincular
                      </Button>
                    )}
                  </div>
                </div>

                {/* Vehicle selector - shown when linking this publication */}
                {selectingFor === pub.meli_item_id && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar vehículo por marca, modelo o año..."
                        value={vehicleSearch}
                        onChange={(e) => setVehicleSearch(e.target.value)}
                        className="pl-9 h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                      {filteredVehicles.slice(0, 12).map((v: any) => (
                        <button
                          key={v.id}
                          onClick={() => handleLink(pub, v.id)}
                          disabled={linkingItemId !== null}
                          className="flex items-center gap-2 p-2 rounded-lg border hover:border-yellow-400 hover:bg-yellow-50 transition-all text-left disabled:opacity-50"
                        >
                          {v.main_image ? (
                            <img src={v.main_image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
                              <Car className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {v.brand?.name} {v.model?.name} {v.year}
                            </p>
                            {v.price && (
                              <p className="text-[10px] text-gray-500">
                                ${Number(v.price).toLocaleString('es-CL')}
                              </p>
                            )}
                          </div>
                          {linkingItemId === pub.meli_item_id && (
                            <Loader2 className="h-3 w-3 animate-spin ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectingFor(null);
                        setVehicleSearch('');
                      }}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportMercadoLibreDialog;
