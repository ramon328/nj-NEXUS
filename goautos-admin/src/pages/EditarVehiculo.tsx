import { Skeleton } from '@/components/ui/skeleton';
import VehicleBasicInfoForm from '@/components/vehiculos/agregar/VehicleBasicInfoForm';
import VehicleMediaForm from '@/components/vehiculos/agregar/VehicleMediaForm';
import VehicleAcquisitionForm from '@/components/vehiculos/agregar/VehicleAcquisitionForm';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';
import { VehicleMedia } from '@/types/vehicleCreation';
import { uploadImage, deleteImageByUrl } from '@/utils/fileUploadUtils';
import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { processVehicleMedia } from '@/utils/vehicleDataUtils';
import DashboardLayout from '@/components/DashboardLayout';
import BackButton from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { useChileautosAutoSync } from '@/hooks/chileautos';
import posthog from '@/utils/posthog';

const mapVehicleToBasicInfoData = (
  vehicleData: any
): Partial<Vehicle> | null => {
  if (!vehicleData) return null;

  return {
    vehicle_type: vehicleData.vehicle_type || 'car',
    license_plate: vehicleData.license_plate || '',
    brand_id: vehicleData.brand_id?.toString() || '',
    model_id: vehicleData.model_id?.toString() || '',
    version_id: vehicleData.version_id?.toString() || '',
    year: vehicleData.year?.toString() || '',
    price: vehicleData.price?.toString() || '',
    discount_percentage: vehicleData.discount_percentage?.toString() || '0',
    mileage: vehicleData.mileage?.toString() || '',
    transmission: vehicleData.transmission || '',
    category_id: vehicleData.category_id?.toString() || '',
    status_id: vehicleData.status_id?.toString() || '',
    fuel_type_id: vehicleData.fuel_type_id?.toString() || '',
    color_id: vehicleData.color_id?.toString() || '',
    condition_id: vehicleData.condition_id?.toString() || '',
    dealership_id: vehicleData.dealership_id?.toString() || '',
    stock_type: vehicleData.stock_type || 'online',
    description: vehicleData.description || '',
    label: vehicleData.label || '',
    label_color: vehicleData.label_color || '',
    owners: vehicleData.owners?.toString() || '1',
    engine_number: vehicleData.engine_number || '',
    chassis_number: vehicleData.chassis_number || '',
    extras: vehicleData.extras || '',
    seller_id: vehicleData.seller_id?.toString() || '',
    keys: vehicleData.keys?.toString() || '1',
    has_lien: vehicleData.has_lien || false,
    is_billable: vehicleData.is_billable || false,
    tech_inspection_expiry: vehicleData.tech_inspection_expiry
      ? vehicleData.tech_inspection_expiry.split('T')[0]
      : '',
    circulation_permit_expiry: vehicleData.circulation_permit_expiry
      ? vehicleData.circulation_permit_expiry.split('T')[0]
      : '',
    emissions_expiry: vehicleData.emissions_expiry
      ? vehicleData.emissions_expiry.split('T')[0]
      : '',
    permit_municipality: vehicleData.permit_municipality || '',
    transfer_value: vehicleData.transfer_value?.toString() || '0',
  };
};

const EditarVehiculo = () => {
  const [, params] = useRoute<{ id: string }>('/vehiculos/editar/:id');
  const vehicleId = params?.id;
  const { clientId, user } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState('info-basica');

  const { triggerUpdateSync } = useChileautosAutoSync();

  const [initialMediaDataForForm, setInitialMediaDataForForm] =
    useState<VehicleMedia>({
      mainImage: null,
      gallery: [],
      extraDocuments: [],
    });

  const [originalExtraDocuments, setOriginalExtraDocuments] = useState<any[]>(
    []
  );

  const [acquisitionData, setAcquisitionData] = useState<any>(null);

  useEffect(() => {
    const fetchVehicleData = async () => {
      if (!vehicleId || !clientId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vehicles')
          .select(
            `
            *,
            category:category_id(name),
            status:status_id(name, color, order),
            brand:brand_id(name),
            model:model_id(name),
            fuel_type:fuel_type_id(name)
          `
          )
          .eq('id', parseInt(vehicleId))
          .eq('client_id', clientId)
          .single();

        if (error) {
          console.error('Error fetching vehicle:', error);
          toast({
            title: 'Error',
            description: 'No se pudo cargar la información del vehículo',
            variant: 'destructive',
          });
          navigate('/vehiculos');
          return;
        }

        if (data) {
          setVehicle(data as Vehicle);

          // Obtener documentos extra
          const { data: extraDocsData, error: extraDocsError } = await supabase
            .from('vehicles_extras')
            .select('*')
            .eq('vehicle_id', parseInt(vehicleId))
            .eq('type', 'document');

          if (extraDocsError) {
            console.error('Error fetching extra documents:', extraDocsError);
          }
          console.log('extraDocsData:', extraDocsData);

          setInitialMediaDataForForm({
            mainImage: data.main_image || null,
            gallery: data.gallery || [],
            extraDocuments:
              extraDocsData
                ?.map((doc) =>
                  typeof doc.docs_urls === 'string' &&
                  doc.docs_urls.trim().length > 0
                    ? { id: doc.id, url: doc.docs_urls, title: doc.title || '' }
                    : null
                )
                .filter(Boolean) || [],
          });
          setOriginalExtraDocuments(
            extraDocsData
              ?.map((doc) =>
                typeof doc.docs_urls === 'string' &&
                doc.docs_urls.trim().length > 0
                  ? { id: doc.id, url: doc.docs_urls, title: doc.title || '' }
                  : null
              )
              .filter(Boolean) || []
          );

          // Obtener datos de adquisición
          let acquisition = {};
          const parsedVehicleId = parseInt(vehicleId);
          console.log('vehicleId para adquisición:', parsedVehicleId);
          if (!isNaN(parsedVehicleId)) {
            if (!data.is_consigned) {
              console.log(
                'Buscando en vehicles_purchases para vehicle_id:',
                parsedVehicleId
              );
              const { data: purchaseData, error: purchaseError } =
                await supabase
                  .from('vehicles_purchases')
                  .select('purchase_price, customer_id, notes, purchase_date, genera_credito_fiscal')
                  .eq('vehicle_id', parsedVehicleId)
                  .single();
              if (purchaseError) {
                console.error('Error en vehicles_purchases:', purchaseError);
              }
              if (purchaseData) {
                acquisition = {
                  acquisitionType: 'purchase',
                  purchaseCustomerId: purchaseData.customer_id,
                  purchasePrice: purchaseData.purchase_price,
                  documentNotes: purchaseData.notes || '',
                  acquisitionDate: purchaseData.purchase_date ? purchaseData.purchase_date.split('T')[0] : '',
                  // Precargar el régimen de IVA real del vehículo (si no, el toggle
                  // siempre abría en "Hereda" aunque el auto fuera afecto/exento).
                  ivaExento: (data as any)?.iva_exento ?? null,
                  // IVA de compra (auto propio) para precargar el toggle al editar.
                  purchaseGeneraCreditoFiscal:
                    (purchaseData as any).genera_credito_fiscal ?? false,
                };
              }
            } else {
              console.log(
                'Buscando en vehicles_consignments para vehicle_id:',
                parsedVehicleId
              );
              const { data: consignmentData, error: consignmentError } =
                await supabase
                  .from('vehicles_consignments')
                  .select('agreed_price, suggested_price, customer_id, notes, sale_type, dealership_id, financiera, consignment_date, consignment_seller_id, metodo_consignacion, porcentaje_comision_consignacion, monto_fijo_comision_consignacion')
                  .eq('vehicle_id', parsedVehicleId)
                  .single();
              if (consignmentError) {
                console.error(
                  'Error en vehicles_consignments:',
                  consignmentError
                );
              }
              if (consignmentData) {
                acquisition = {
                  acquisitionType: 'consignment',
                  consignmentCustomerId: consignmentData.customer_id,
                  consignmentSuggestedPrice: consignmentData.suggested_price || 0,
                  consignmentAgreedPrice: consignmentData.agreed_price,
                  documentNotes: consignmentData.notes || '',
                  consignmentSaleType: consignmentData.sale_type || undefined,
                  consignmentDealershipId: consignmentData.dealership_id || undefined,
                  consignmentFinanciera: consignmentData.financiera || undefined,
                  consignmentSellerId: consignmentData.consignment_seller_id || undefined,
                  acquisitionDate: consignmentData.consignment_date ? consignmentData.consignment_date.split('T')[0] : '',
                  consignmentMetodo:
                    (consignmentData as any).metodo_consignacion ??
                    'precio_garantizado',
                  consignmentComisionPercentage:
                    (consignmentData as any).porcentaje_comision_consignacion ??
                    undefined,
                  consignmentComisionFixed:
                    (consignmentData as any).monto_fijo_comision_consignacion ??
                    undefined,
                };
              } else {
                // is_consigned=true pero sin fila en vehicles_consignments (huérfano).
                // Defaulteamos a 'consignment' para que el form abra en el tipo
                // correcto — sino el usuario re-guardaría como purchase y se
                // gatillaría DELETE en consignment + INSERT en purchase abajo,
                // perdiendo el vínculo histórico.
                acquisition = { acquisitionType: 'consignment' };
              }
            }
          } else {
            console.error('vehicleId no es un número válido:', vehicleId);
          }
          setAcquisitionData(acquisition);

          let purchasePriceData = null;
          if (!data.is_consigned) {
            const { data: purchaseData, error: purchaseError } = await supabase
              .from('vehicles_purchases')
              .select('purchase_price')
              .eq('vehicle_id', parseInt(vehicleId))
              .maybeSingle();

            if (!purchaseError && purchaseData) {
              purchasePriceData = purchaseData.purchase_price;
            }
          } else {
            const { data: consignmentData, error: consignmentError } =
              await supabase
                .from('vehicles_consignments')
                .select('agreed_price')
                .eq('vehicle_id', parseInt(vehicleId))
                .maybeSingle();

            if (!consignmentError && consignmentData) {
              purchasePriceData = consignmentData.agreed_price;
            }
          }
          if (purchasePriceData !== null) {
            setVehicle((prevVehicle) =>
              prevVehicle
                ? { ...prevVehicle, purchase_price: purchasePriceData }
                : null
            );
          }
        }
      } catch (error) {
        console.error('Error in fetchVehicleData:', error);
        toast({
          title: 'Error Crítico',
          description: 'Ocurrió un error inesperado al cargar datos.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [vehicleId, clientId, navigate]);

  const handleUpdateBasicInfo = async (
    formData: Partial<Vehicle>
  ): Promise<boolean> => {
    if (!vehicleId || !clientId || !vehicle) {
      toast({
        title: 'Error',
        description: 'Faltan datos para la actualización.',
        variant: 'destructive',
      });
      return false;
    }

    // Exclude temporary fields that are only for display purposes
    const { brand_name, model_name, ...formDataForDB } = formData;
    const updateData: Record<string, any> = { ...formDataForDB };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    try {
      const { error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', parseInt(vehicleId))
        .eq('client_id', clientId);

      if (error) {
        console.error('Error updating vehicle:', error);
        toast({
          title: 'Error al actualizar',
          description:
            error.message ||
            'No se pudo actualizar la información del vehículo.',
          variant: 'destructive',
        });
        return false;
      }

      setVehicle((prev: any) => ({ ...prev, ...formData }));

      // ChileAutos: sync if toggle is active (fire-and-forget)
      triggerUpdateSync(parseInt(vehicleId));

      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'vehicle_edited',
        properties: {
          vehicle_id: parseInt(vehicleId),
          section: 'basic_info',
        },
      });

      return true;
    } catch (error: any) {
      console.error('Error in handleUpdateBasicInfo:', error);
      toast({
        title: 'Error Crítico',
        description:
          error.message || 'Ocurrió un error inesperado al actualizar.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUpdateMedia = async (
    mediaFormData: VehicleMedia
  ): Promise<boolean> => {
    if (!vehicleId || !vehicle) {
      toast({
        title: 'Error',
        description: 'Vehículo no encontrado para actualizar multimedia.',
        variant: 'destructive',
      });
      return false;
    }

    const newMainImageUrl: string | null = vehicle.main_image || null;
    const imagesToDeleteFromStorage: string[] = [];

    let mainImageUrl = newMainImageUrl;
    let galleryUrls: string[] = vehicle.gallery || [];
    try {
      const processed = await processVehicleMedia(mediaFormData);
      mainImageUrl = processed.mainImageUrl;
      galleryUrls = processed.galleryUrls;
    } catch (error) {
      toast({
        title: 'Error al procesar imágenes',
        description:
          'No se pudieron procesar las imágenes. Intente nuevamente.',
        variant: 'destructive',
      });
      return false;
    }

    if (vehicle.main_image && vehicle.main_image !== mainImageUrl) {
      imagesToDeleteFromStorage.push(vehicle.main_image);
    }
    const originalGalleryUrls = vehicle.gallery || [];
    originalGalleryUrls.forEach((originalUrl) => {
      if (!galleryUrls.includes(originalUrl)) {
        imagesToDeleteFromStorage.push(originalUrl);
      }
    });

    try {
      const { error: dbUpdateError } = await supabase
        .from('vehicles')
        .update({ main_image: mainImageUrl, gallery: galleryUrls })
        .eq('id', parseInt(vehicleId));

      if (dbUpdateError) {
        console.error('Error updating media in DB:', dbUpdateError);
        toast({
          title: 'Error de Base de Datos',
          description: dbUpdateError.message,
          variant: 'destructive',
        });
        return false;
      }
    } catch (e: any) {
      console.error('Exception during DB update for media:', e);
      toast({
        title: 'Error Crítico DB',
        description: e.message,
        variant: 'destructive',
      });
      return false;
    }

    for (const urlToDelete of imagesToDeleteFromStorage) {
      await deleteImageByUrl(urlToDelete);
    }

    setVehicle((prev) =>
      prev
        ? {
            ...prev,
            main_image: mainImageUrl,
            gallery: galleryUrls,
          }
        : null
    );
    setInitialMediaDataForForm({
      mainImage: mainImageUrl,
      gallery: galleryUrls,
    });

    // 1. Procesar documentos extra
    const extraDocuments = mediaFormData.extraDocuments || [];
    const docsToInsert = [];

    // Detectar documentos eliminados
    const currentIds = extraDocuments
      .filter((doc: any) => doc.id)
      .map((doc: any) => doc.id);
    const deletedDocs = originalExtraDocuments.filter(
      (doc: any) => !currentIds.includes(doc.id)
    );
    for (const doc of deletedDocs) {
      await supabase.from('vehicles_extras').delete().eq('id', doc.id);
    }

    for (const doc of extraDocuments) {
      if (typeof doc === 'string') {
        docsToInsert.push({
          url: doc,
          title: '',
          description: '',
        });
      } else if (doc instanceof File) {
        const uploadedUrl = await uploadImage(doc, 'vehicles/documents');
        if (uploadedUrl) {
          docsToInsert.push({
            url: uploadedUrl,
            title: '',
            description: '',
          });
        }
      } else if (doc && doc.file instanceof File) {
        const uploadedUrl = await uploadImage(doc.file, 'vehicles/documents');
        if (uploadedUrl) {
          docsToInsert.push({
            url: uploadedUrl,
            title: doc.title || '',
            description: doc.description || '',
          });
        }
      }
    }

    // Insertar todos los nuevos documentos
    for (const doc of docsToInsert) {
      const { error } = await supabase.from('vehicles_extras').insert({
        vehicle_id: parseInt(vehicleId),
        type: 'document',
        docs_urls: doc.url,
        title: doc.title,
        description: doc.description,
      });
      if (error) {
        console.error('Error insertando en vehicles_extras:', error);
        toast({
          title: 'Error al guardar documentos extra',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }
    }

    toast({
      title: 'Multimedia Actualizada',
      description: 'Las imágenes del vehículo han sido actualizadas.',
    });

    // ChileAutos: sync if toggle is active (fire-and-forget)
    triggerUpdateSync(parseInt(vehicleId));

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'vehicle_edited',
      properties: {
        vehicle_id: parseInt(vehicleId),
        section: 'media',
      },
    });

    return true;
  };

  // Guardar adquisición (compra o consignación)
  const handleSaveAcquisition = async (acquisitionData: any) => {
    if (!vehicleId || !clientId) return false;
    const parsedVehicleId = parseInt(vehicleId);
    const isConsignedBefore = vehicle?.is_consigned;
    // Usar documentType en vez de acquisitionType
    const newType = acquisitionData.documentType;
    try {
      // 1. Insertar el nuevo documento legal y obtener su id
      const docPayload = {
        client_id: clientId,
        vehicle_id: parsedVehicleId,
        customer_id:
          newType === 'purchase'
            ? acquisitionData.purchaseCustomerId
            : acquisitionData.consignmentCustomerId,
        type: newType,
        status: acquisitionData.status || 'active',
      };
      const { data: insertedDoc, error: insDocError } = await supabase
        .from('vehicles_documents')
        .insert(docPayload)
        .select('id')
        .single();
      if (insDocError) {
        console.error('Error insertando vehicles_documents:', insDocError);
        toast({
          title: 'Error al guardar documento legal',
          description: insDocError.message,
          variant: 'destructive',
        });
        return false;
      }
      const newDocumentId = insertedDoc?.id;
      // 2. Lógica de adquisición (flujo automático de cambio de tipo)
      let success = false;
      if (isConsignedBefore && newType === 'purchase') {
        // De consignación a compra: eliminar consignación, insertar compra
        const { error: delConsignError } = await supabase
          .from('vehicles_consignments')
          .delete()
          .eq('vehicle_id', parsedVehicleId);
        const purchaseInsertPayload: any = {
          vehicle_id: parsedVehicleId,
          customer_id: acquisitionData.purchaseCustomerId,
          purchase_price: acquisitionData.purchasePrice,
          notes: acquisitionData.documentNotes
            ? acquisitionData.documentNotes
            : '',
          document_id: newDocumentId,
          genera_credito_fiscal:
            acquisitionData.purchaseGeneraCreditoFiscal ?? null,
        };
        if (acquisitionData.acquisitionDate) {
          purchaseInsertPayload.purchase_date = acquisitionData.acquisitionDate;
        }
        console.log(
          '[Adquisición] Insertando vehicles_purchases:',
          purchaseInsertPayload
        );
        const { error: insPurchaseError } = await supabase
          .from('vehicles_purchases')
          .insert(purchaseInsertPayload);
        const { error: updVehError } = await supabase
          .from('vehicles')
          .update({ is_consigned: false })
          .eq('id', parsedVehicleId);
        success = !delConsignError && !insPurchaseError && !updVehError;
      } else if (!isConsignedBefore && newType === 'consignment') {
        // De compra a consignación: eliminar compra, insertar consignación
        const { error: delPurchaseError } = await supabase
          .from('vehicles_purchases')
          .delete()
          .eq('vehicle_id', parsedVehicleId);
        const consignInsertPayload: any = {
          vehicle_id: parsedVehicleId,
          customer_id: acquisitionData.consignmentCustomerId,
          agreed_price: acquisitionData.consignmentAgreedPrice,
          document_id: newDocumentId,
          notes: acquisitionData.documentNotes
            ? acquisitionData.documentNotes
            : '',
        };
        if (acquisitionData.consignmentSuggestedPrice) {
          consignInsertPayload.suggested_price = acquisitionData.consignmentSuggestedPrice;
        }
        if (acquisitionData.consignmentSaleType) {
          consignInsertPayload.sale_type = acquisitionData.consignmentSaleType;
        }
        if (acquisitionData.consignmentDealershipId) {
          consignInsertPayload.dealership_id = acquisitionData.consignmentDealershipId;
        }
        if (acquisitionData.consignmentFinanciera) {
          consignInsertPayload.financiera = acquisitionData.consignmentFinanciera;
        }
        if (acquisitionData.acquisitionDate) {
          consignInsertPayload.consignment_date = acquisitionData.acquisitionDate;
        }
        if (acquisitionData.consignmentSellerId) {
          consignInsertPayload.consignment_seller_id = acquisitionData.consignmentSellerId;
        }
        if (acquisitionData.consignmentMetodo) {
          consignInsertPayload.metodo_consignacion = acquisitionData.consignmentMetodo;
        }
        if (acquisitionData.consignmentComisionPercentage) {
          const pct = Number(acquisitionData.consignmentComisionPercentage);
          if (Number.isFinite(pct) && pct > 0) {
            consignInsertPayload.porcentaje_comision_consignacion = pct;
          }
        }
        if (acquisitionData.consignmentComisionFixed) {
          const fix = Number(acquisitionData.consignmentComisionFixed);
          if (Number.isFinite(fix) && fix > 0) {
            consignInsertPayload.monto_fijo_comision_consignacion = fix;
          }
        }
        console.log(
          '[Adquisición] Insertando vehicles_consignments:',
          consignInsertPayload
        );
        const { error: insConsignError } = await supabase
          .from('vehicles_consignments')
          .insert(consignInsertPayload);
        const { error: updVehError } = await supabase
          .from('vehicles')
          .update({ is_consigned: true })
          .eq('id', parsedVehicleId);
        success = !delPurchaseError && !insConsignError && !updVehError;
      } else if (isConsignedBefore && newType === 'consignment') {
        // Solo actualizar consignación
        const consignUpdatePayload: any = {
          agreed_price: acquisitionData.consignmentAgreedPrice,
          document_id: newDocumentId,
          notes: acquisitionData.documentNotes
            ? acquisitionData.documentNotes
            : '',
        };
        if (
          acquisitionData.consignmentCustomerId !== undefined &&
          acquisitionData.consignmentCustomerId !== null
        ) {
          consignUpdatePayload.customer_id = acquisitionData.consignmentCustomerId;
        }
        if (acquisitionData.consignmentSuggestedPrice !== undefined) {
          consignUpdatePayload.suggested_price = acquisitionData.consignmentSuggestedPrice;
        }
        if (acquisitionData.consignmentSaleType !== undefined) {
          consignUpdatePayload.sale_type = acquisitionData.consignmentSaleType || null;
        }
        if (acquisitionData.consignmentDealershipId !== undefined) {
          consignUpdatePayload.dealership_id = acquisitionData.consignmentDealershipId || null;
        }
        if (acquisitionData.consignmentFinanciera !== undefined) {
          consignUpdatePayload.financiera = acquisitionData.consignmentFinanciera || null;
        }
        if (acquisitionData.acquisitionDate !== undefined) {
          consignUpdatePayload.consignment_date = acquisitionData.acquisitionDate || null;
        }
        if (acquisitionData.consignmentSellerId !== undefined) {
          consignUpdatePayload.consignment_seller_id = acquisitionData.consignmentSellerId || null;
        }
        // Método de consignación + parámetros
        if (acquisitionData.consignmentMetodo) {
          consignUpdatePayload.metodo_consignacion = acquisitionData.consignmentMetodo;
        }
        if (acquisitionData.consignmentComisionPercentage !== undefined) {
          const pct = Number(acquisitionData.consignmentComisionPercentage);
          consignUpdatePayload.porcentaje_comision_consignacion =
            Number.isFinite(pct) && pct > 0 ? pct : null;
        }
        if (acquisitionData.consignmentComisionFixed !== undefined) {
          const fix = Number(acquisitionData.consignmentComisionFixed);
          consignUpdatePayload.monto_fijo_comision_consignacion =
            Number.isFinite(fix) && fix > 0 ? fix : null;
        }
        // Verificar si ya existe una fila de consignación para este vehículo.
        // Si no existe (caso: vehículo subido sin completar la adquisición),
        // hay que insertar en vez de actualizar — un UPDATE silenciosamente
        // matchea 0 filas y no guarda nada.
        const { data: existingConsign } = await supabase
          .from('vehicles_consignments')
          .select('vehicle_id')
          .eq('vehicle_id', parsedVehicleId)
          .maybeSingle();

        let updConsignError: any = null;
        if (existingConsign) {
          console.log(
            '[Adquisición] Actualizando vehicles_consignments:',
            consignUpdatePayload
          );
          const { error } = await supabase
            .from('vehicles_consignments')
            .update(consignUpdatePayload)
            .eq('vehicle_id', parsedVehicleId);
          updConsignError = error;
        } else {
          const consignInsertPayload = {
            ...consignUpdatePayload,
            vehicle_id: parsedVehicleId,
          };
          console.log(
            '[Adquisición] Insertando vehicles_consignments (no existía fila):',
            consignInsertPayload
          );
          const { error } = await supabase
            .from('vehicles_consignments')
            .insert(consignInsertPayload);
          updConsignError = error;
          if (!error) {
            await supabase
              .from('vehicles')
              .update({ is_consigned: true })
              .eq('id', parsedVehicleId);
          }
        }
        if (updConsignError) {
          console.error('Error guardando vehicles_consignments:', updConsignError);
          toast({
            title: 'Error al guardar la ficha del cliente',
            description: updConsignError.message,
            variant: 'destructive',
          });
        }
        success = !updConsignError;
      } else if (!isConsignedBefore && newType === 'purchase') {
        // Solo actualizar compra
        const purchaseUpdatePayload: any = {
          purchase_price: acquisitionData.purchasePrice,
          notes: acquisitionData.documentNotes
            ? acquisitionData.documentNotes
            : '',
          document_id: newDocumentId,
          genera_credito_fiscal:
            acquisitionData.purchaseGeneraCreditoFiscal ?? null,
        };
        if (
          acquisitionData.purchaseCustomerId !== undefined &&
          acquisitionData.purchaseCustomerId !== null
        ) {
          purchaseUpdatePayload.customer_id = acquisitionData.purchaseCustomerId;
        }
        if (acquisitionData.acquisitionDate !== undefined) {
          purchaseUpdatePayload.purchase_date = acquisitionData.acquisitionDate || null;
        }
        // Mismo patrón que consignación: si no existe fila, insertar.
        const { data: existingPurchase } = await supabase
          .from('vehicles_purchases')
          .select('vehicle_id')
          .eq('vehicle_id', parsedVehicleId)
          .maybeSingle();

        let updPurchaseError: any = null;
        if (existingPurchase) {
          console.log(
            '[Adquisición] Actualizando vehicles_purchases:',
            purchaseUpdatePayload
          );
          const { error } = await supabase
            .from('vehicles_purchases')
            .update(purchaseUpdatePayload)
            .eq('vehicle_id', parsedVehicleId);
          updPurchaseError = error;
        } else {
          const purchaseInsertPayload = {
            ...purchaseUpdatePayload,
            vehicle_id: parsedVehicleId,
          };
          console.log(
            '[Adquisición] Insertando vehicles_purchases (no existía fila):',
            purchaseInsertPayload
          );
          const { error } = await supabase
            .from('vehicles_purchases')
            .insert(purchaseInsertPayload);
          updPurchaseError = error;
          if (!error) {
            await supabase
              .from('vehicles')
              .update({ is_consigned: false })
              .eq('id', parsedVehicleId);
          }
        }
        if (updPurchaseError) {
          console.error('Error guardando vehicles_purchases:', updPurchaseError);
          toast({
            title: 'Error al guardar la ficha del cliente',
            description: updPurchaseError.message,
            variant: 'destructive',
          });
        }
        success = !updPurchaseError;
      }
      // Persistir el régimen de IVA elegido en la pestaña Adquisición (solo compra;
      // en consignación el régimen es 'consignación' por is_consigned). Antes el
      // cambio del toggle se descartaba.
      if (success && newType === 'purchase') {
        await supabase
          .from('vehicles')
          .update({ iva_exento: (acquisitionData as any).ivaExento ?? null })
          .eq('id', parsedVehicleId);
      }
      // 3. Feedback y refresco
      if (success) {
        toast({
          title: 'Adquisición actualizada',
          description:
            'Los datos de adquisición y documento han sido guardados.',
        });
        setVehicle((prev) =>
          prev ? { ...prev, is_consigned: newType === 'consignment' } : prev
        );
        await fetchAcquisitionData(parsedVehicleId, newType === 'consignment');
        return true;
      } else {
        toast({
          title: 'Sin cambios',
          description: 'No se detectaron cambios en la adquisición.',
        });
        return false;
      }
    } catch (error: any) {
      toast({
        title: 'Error al guardar adquisición',
        description: error.message || 'Ocurrió un error inesperado.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Refrescar datos de adquisición después de guardar
  const fetchAcquisitionData = async (vehId: number, isConsigned: boolean) => {
    let acquisition = {};
    if (!isNaN(vehId)) {
      if (!isConsigned) {
        const { data: purchaseData } = await supabase
          .from('vehicles_purchases')
          .select('purchase_price, customer_id, notes, purchase_date')
          .eq('vehicle_id', vehId)
          .single();
        if (purchaseData) {
          acquisition = {
            acquisitionType: 'purchase',
            purchaseCustomerId: purchaseData.customer_id,
            purchasePrice: purchaseData.purchase_price,
            documentNotes: purchaseData.notes || '',
            acquisitionDate: purchaseData.purchase_date ? purchaseData.purchase_date.split('T')[0] : '',
          };
        }
      } else {
        const { data: consignmentData } = await supabase
          .from('vehicles_consignments')
          .select('agreed_price, suggested_price, customer_id, notes, sale_type, dealership_id, financiera, consignment_date, consignment_seller_id')
          .eq('vehicle_id', vehId)
          .single();
        if (consignmentData) {
          acquisition = {
            acquisitionType: 'consignment',
            consignmentCustomerId: consignmentData.customer_id,
            consignmentSuggestedPrice: consignmentData.suggested_price || 0,
            consignmentAgreedPrice: consignmentData.agreed_price,
            documentNotes: consignmentData.notes || '',
            consignmentSaleType: consignmentData.sale_type || undefined,
            consignmentDealershipId: consignmentData.dealership_id || undefined,
            consignmentFinanciera: consignmentData.financiera || undefined,
            consignmentSellerId: consignmentData.consignment_seller_id || undefined,
            acquisitionDate: consignmentData.consignment_date ? consignmentData.consignment_date.split('T')[0] : '',
          };
        }
      }
    }
    setAcquisitionData(acquisition);
  };

  return (
    <DashboardLayout>
      <div className='w-full pb-8'>
        <div className='p-4 md:p-6 space-y-6 max-w-full'>
          <div>
            <BackButton />
            <h1 className='text-xl md:text-2xl font-semibold tracking-tight'>
              Editar {vehicle?.brand?.name} {vehicle?.model?.name} {vehicle?.version_name ? vehicle.version_name : ''} {vehicle?.year || ''}
            </h1>
            <p className='text-sm md:text-base text-muted-foreground'>
              Actualiza la información del vehículo.
            </p>
          </div>

          {loading ? (
            <div className='space-y-4'>
              <Skeleton className='h-8 w-1/3' />
              <Skeleton className='h-32 w-full' />
              <Skeleton className='h-8 w-1/2' />
              <Skeleton className='h-32 w-full' />
            </div>
          ) : vehicle ? (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='w-full'
            >
              <TabsList className='grid w-full grid-cols-3 mb-6 md:mb-8'>
                <TabsTrigger value='info-basica' className='text-xs md:text-sm'>
                  Información Básica
                </TabsTrigger>
                <TabsTrigger value='adquisicion' className='text-xs md:text-sm'>
                  Adquisición
                </TabsTrigger>

                <TabsTrigger value='multimedia' className='text-xs md:text-sm'>
                  Multimedia
                </TabsTrigger>
              </TabsList>

              <TabsContent value='info-basica'>
                <div className='md:mt-[2vh] mt-2'>
                  <VehicleBasicInfoForm
                    initialData={{
                      basicInfo: mapVehicleToBasicInfoData(vehicle),
                    }}
                    onSave={handleUpdateBasicInfo}
                    onNext={() => {
                      /* Intentionally no-op or minimal action */
                    }}
                    isEditMode={true}
                    showNavigationButtons={false}
                    submitButtonText='Guardar Cambios'
                    onCancel={() => navigate('/vehiculos')}
                  />
                </div>
              </TabsContent>
              <TabsContent value='adquisicion'>
                <div className='md:mt-[2vh] mt-2'>
                  {acquisitionData ? (
                    <VehicleAcquisitionForm
                      initialData={{ acquisition: acquisitionData }}
                      onSave={async (data) => {
                        const result = await handleSaveAcquisition(data);
                        return result;
                      }}
                      onNext={() => setActiveTab('multimedia')}
                      onPrevious={() => setActiveTab('info-basica')}
                      isEditMode={true}
                    />
                  ) : (
                    <div className='text-center text-muted-foreground py-8'>
                      Cargando información de adquisición...
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value='multimedia'>
                <div className='md:mt-[2vh] mt-2'>
                  <VehicleMediaForm
                    initialData={{ media: initialMediaDataForForm as any }}
                    onSave={handleUpdateMedia}
                    onNext={() => {
                      toast({
                        title: 'Multimedia Guardada',
                        description:
                          'Los cambios de multimedia han sido guardados.',
                      });
                    }}
                    onPrevious={() => setActiveTab('info-basica')}
                    isEditMode={true}
                    submitButtonText='Guardar Cambios de Multimedia'
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className='rounded-md border p-8 text-center'>
              <p className='text-muted-foreground'>
                No se encontró el vehículo solicitado.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditarVehiculo;
