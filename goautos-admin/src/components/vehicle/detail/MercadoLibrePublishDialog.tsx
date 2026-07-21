import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, Check, Lock } from 'lucide-react';

interface ListingType {
  id: 'free' | 'silver' | 'gold' | 'gold_premium';
  name: string;
  description: string;
  maxPublications: number;
  currentCount: number;
  available: boolean;
}

interface MercadoLibrePublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (listingType: string) => void;
  vehicleId: number;
  isPublishing: boolean;
}

export function MercadoLibrePublishDialog({
  isOpen,
  onClose,
  onConfirm,
  vehicleId,
  isPublishing,
}: MercadoLibrePublishDialogProps) {
  // clientId de la automotora que se está viendo (respeta el tenant-override de
  // superadmin). Antes se re-derivaba por auth.getUser()→users.client_id, lo que
  // dejaba el modal EN BLANCO para superadmins (client_id null) o contaba los
  // cupos del cliente equivocado al impersonar.
  const { clientId } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('free');
  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPublicationCounts();
    }
  }, [isOpen, clientId]);

  const buildListingTypes = (counts: {
    free: number;
    silver: number;
    gold: number;
    gold_premium: number;
  }) => {
    const types: ListingType[] = [
      {
        id: 'free',
        name: 'Publicación Gratuita',
        description: counts.free >= 1
          ? 'Ya tienes 1 publicación gratuita activa. Elimínala para publicar otra.'
          : 'Límite: 1 publicación activa',
        maxPublications: 1,
        currentCount: counts.free,
        available: counts.free < 1,
      },
      {
        id: 'silver',
        name: 'Silver',
        description: 'Publicación de pago básica. Si no tienes plan, deberás pagar en MercadoLibre.',
        maxPublications: -1, // unlimited
        currentCount: counts.silver,
        available: true,
      },
      {
        id: 'gold',
        name: 'Gold',
        description: 'Publicación destacada. Si no tienes plan, deberás pagar en MercadoLibre.',
        maxPublications: -1, // unlimited
        currentCount: counts.gold,
        available: true,
      },
      {
        id: 'gold_premium',
        name: 'Gold Premium',
        description: 'Máxima visibilidad. Si no tienes plan, deberás pagar en MercadoLibre.',
        maxPublications: -1, // unlimited
        currentCount: counts.gold_premium,
        available: true,
      },
    ];

    setListingTypes(types);

    // Selección por defecto: el primer tipo disponible.
    const firstAvailable = types.find((t) => t.available);
    if (firstAvailable) {
      setSelectedType(firstAvailable.id);
    }
  };

  const fetchPublicationCounts = async () => {
    setLoading(true);
    try {
      if (!clientId) {
        // Sin cliente en contexto no hay cupos que contar, pero igual mostramos
        // los tipos (armados abajo con conteo 0) para no dejar el modal vacío.
        buildListingTypes({ free: 0, silver: 0, gold: 0, gold_premium: 0 });
        setLoading(false);
        return;
      }

      // Get all vehicles for this client
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId);

      console.log('Client vehicles:', vehicles);

      const vehicleIds = vehicles?.map(v => v.id) || [];

      // Count active publications by type for vehicles from this client
      const { data: publications, error: pubError } = await supabase
        .from('meli_post')
        .select('type_post, status, vehicle_id')
        .in('vehicle_id', vehicleIds.length > 0 ? vehicleIds : [-1])
        .in('status', ['active', 'payment_required', 'under_review']);

      console.log('MercadoLibre publications:', publications);

      if (pubError) {
        console.error('Error fetching publications:', pubError);
      }

      // Count each type (only active publications)
      const counts = { free: 0, silver: 0, gold: 0, gold_premium: 0 };

      publications?.forEach((pub) => {
        // If type_post is null, assume it's a free publication (legacy data)
        const type = (pub.type_post || 'free') as keyof typeof counts;
        if (type && counts[type] !== undefined) {
          counts[type]++;
        }
      });

      buildListingTypes(counts);
    } catch (error) {
      console.error('Error fetching publication counts:', error);
      // Ante cualquier fallo NO dejamos el modal en blanco: mostramos los tipos
      // con conteo 0 (el límite de la gratuita lo reforzará igual el backend).
      buildListingTypes({ free: 0, silver: 0, gold: 0, gold_premium: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedType);
  };

  const selectedListingType = listingTypes.find((t) => t.id === selectedType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publicar en MercadoLibre</DialogTitle>
          <DialogDescription>
            Selecciona el tipo de publicación para tu vehículo
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={selectedType} onValueChange={setSelectedType}>
              {listingTypes.map((type) => (
                <div
                  key={type.id}
                  className={`flex items-start space-x-3 rounded-lg border p-4 ${
                    !type.available
                      ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-gray-50'
                  } ${selectedType === type.id ? 'border-primary bg-primary/5' : ''}`}
                >
                  <RadioGroupItem
                    value={type.id}
                    id={type.id}
                    disabled={!type.available || isPublishing}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={type.id}
                      className={`flex items-center gap-2 font-semibold ${
                        !type.available ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      {type.name}
                      {!type.available && <Lock className="h-4 w-4 text-gray-400" />}
                      {type.available && selectedType === type.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {type.maxPublications > 0 && (
                        <span>
                          Usadas: {type.currentCount} / {type.maxPublications}
                        </span>
                      )}
                      {type.maxPublications < 0 && (
                        <span>Publicaciones activas: {type.currentCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {selectedListingType && selectedListingType.id !== 'free' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tipo de publicación: <strong>{selectedListingType.name}</strong>.
                  Si no tienes este plan contratado en MercadoLibre,
                  deberás completar el pago allí para activar la publicación.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPublishing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              loading ||
              isPublishing ||
              !listingTypes.find((t) => t.id === selectedType)?.available
            }
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              'Publicar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
