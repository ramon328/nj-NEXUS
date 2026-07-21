import { supabase } from '@/integrations/supabase/client';
import { VehicleCreationData } from '@/types/vehicleCreation';
import { createVehicleDocument } from './vehicleDocumentService';
import { createConsignment, ConsignmentBankingInfo } from './vehicleConsignmentService';
import { createPurchase, PurchaseBankingInfo } from './vehiclePurchaseService';
import { uploadImage } from '@/utils/fileUploadUtils';
import Compressor from 'compressorjs';
import { getChileautosIntegration, autoPublishToChileautos } from './chileautosService';
import posthog from '@/utils/posthog';

export interface DuplicateVehicleInfo {
  id: number;
  license_plate: string;
  brand_name: string | null;
  model_name: string | null;
  year: number | null;
  status_name: string | null;
  main_image: string | null;
  dealership_name: string | null;
  /**
   * true cuando TODAS las coincidencias de la patente están en estado Vendido:
   * es una recompra (el auto se vendió y volvió a entrar), así que la creación
   * se permite y el duplicado es solo informativo.
   */
  sold_only: boolean;
}

// Mismo criterio laxo que get_sold_status_id en la BD: los clientes pueden
// renombrar sus estados, por eso se matchea por nombre y no por id.
export const isSoldStatusName = (name: string | null | undefined): boolean =>
  !!name && /vendido|sold/i.test(name);

export const checkDuplicateVehicle = async (
  licensePlate: string,
  clientId: number
): Promise<DuplicateVehicleInfo | null> => {
  if (!licensePlate?.trim()) return null;

  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      id,
      license_plate,
      year,
      main_image,
      brands ( name ),
      models ( name ),
      clients_vehicles_states ( name ),
      dealerships ( name )
    `)
    .eq('client_id', clientId)
    .ilike('license_plate', licensePlate.trim())
    .order('id', { ascending: false });

  if (error || !data || data.length === 0) return null;

  // Puede haber más de una fila con la misma patente (recompras previas).
  // La que manda es una activa (no vendida) si existe: esa bloquea la
  // creación. Si todas están vendidas, se devuelve la más reciente solo
  // para informar.
  const active = data.find(
    (v) => !isSoldStatusName((v as any).clients_vehicles_states?.name)
  );
  const match = active ?? data[0];

  return {
    id: match.id,
    license_plate: match.license_plate,
    brand_name: (match as any).brands?.name ?? null,
    model_name: (match as any).models?.name ?? null,
    year: match.year,
    status_name: (match as any).clients_vehicles_states?.name ?? null,
    main_image: match.main_image,
    dealership_name: (match as any).dealerships?.name ?? null,
    sold_only: !active,
  };
};

export const createVehicle = async (
  vehicleData: VehicleCreationData,
  user: any
): Promise<number | null> => {
  try {
    // Convert vehicle data to the format expected by the database
    const { basicInfo, acquisition, sales, media } = vehicleData;

    // Process the main image and gallery before creating the vehicle
    let mainImageUrl = null;
    let galleryUrls: string[] = [];

    const compressionOptions = {
      quality: 0.75,
      maxWidth: 1920,
      maxHeight: 1080,
      mimeType: 'image/jpeg',
    };

    const convertBlobToFile = (blob: Blob, originalFile: File): File => {
      return new File([blob], originalFile.name, {
        type: blob.type,
        lastModified: originalFile.lastModified,
      });
    };

    // Upload main image if it exists
    if (media.mainImage) {
      if (media.mainImage instanceof File) {
        try {
          const originalMainImageFile = media.mainImage;
          const compressedResult = await new Promise<File | Blob>(
            (resolve, reject) => {
              new Compressor(originalMainImageFile, {
                ...compressionOptions,
                success: resolve,
                error: reject,
              });
            }
          );
          const fileToUpload =
            compressedResult instanceof File
              ? compressedResult
              : convertBlobToFile(compressedResult, originalMainImageFile);
          const mainImagePath = await uploadImage(
            fileToUpload,
            `vehicles/main`
          );
          if (mainImagePath) {
            mainImageUrl = mainImagePath;
          }
        } catch (error) {
          console.error('Error compressing main image:', error);
          // Fallback: try uploading original if compression fails?
          // Or handle error as appropriate
        }
      } else if (typeof media.mainImage === 'string') {
        mainImageUrl = media.mainImage;
      }
    }

    // Upload gallery images if they exist
    if (media.gallery && media.gallery.length > 0) {
      const uploadPromises = media.gallery.map(async (fileOrUrl) => {
        if (fileOrUrl instanceof File) {
          try {
            const originalGalleryFile = fileOrUrl;
            const compressedResult = await new Promise<File | Blob>(
              (resolve, reject) => {
                new Compressor(originalGalleryFile, {
                  ...compressionOptions,
                  success: resolve,
                  error: reject,
                });
              }
            );
            const fileToUpload =
              compressedResult instanceof File
                ? compressedResult
                : convertBlobToFile(compressedResult, originalGalleryFile);
            return uploadImage(fileToUpload, `vehicles/gallery`);
          } catch (error) {
            console.error('Error compressing gallery image:', error);
            // Fallback: try uploading original if compression fails?
            return null;
          }
        } else if (typeof fileOrUrl === 'string') {
          return fileOrUrl;
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);
      galleryUrls = results.filter((url): url is string => url !== null);
    }

    // Procesar y subir documentos extra
    let documentUrl: string | null = null;
    let title = '';
    let description = '';
    let type = 'document'; // valor por defecto

    const extraDocs = media.extraDocuments as unknown;
    const pickFirst = (value: unknown): unknown => {
      if (Array.isArray(value)) return value[0] ?? null;
      return value;
    };

    const firstDoc = pickFirst(extraDocs);

    // Si vienen metadatos, intentar leerlos (no crítico si no existen)
    if (firstDoc && typeof firstDoc === 'object' && 'title' in (firstDoc as any)) {
      title = ((firstDoc as any).title as string) || '';
    }
    if (firstDoc && typeof firstDoc === 'object' && 'description' in (firstDoc as any)) {
      description = ((firstDoc as any).description as string) || '';
    }
    if (firstDoc && typeof firstDoc === 'object' && 'type' in (firstDoc as any)) {
      type = ((firstDoc as any).type as string) || 'document';
    }

    // Resolver URL del documento considerando distintos formatos:
    // - Objeto con { file: File | string }
    // - File directamente
    // - string (URL) directamente
    if (firstDoc) {
      // Caso objeto con propiedad file
      if (typeof firstDoc === 'object' && 'file' in (firstDoc as any)) {
        const fileOrUrl = (firstDoc as any).file;
        if (fileOrUrl instanceof File) {
          documentUrl = await uploadImage(fileOrUrl, 'vehicles/documents');
        } else if (typeof fileOrUrl === 'string') {
          documentUrl = fileOrUrl;
        }
      } else if (firstDoc instanceof File) {
        // Caso File directo
        documentUrl = await uploadImage(firstDoc, 'vehicles/documents');
      } else if (typeof firstDoc === 'string') {
        // Caso URL directa
        documentUrl = firstDoc;
      }
    }

    // We need to get the numeric seller_id based on the auth_id (UUID)
    const sellerId = sales.sellerId || null;
    const dealershipId = sales.dealershipId || null;

    // Create the vehicle first to get the vehicle ID
    // Exclude temporary fields that are only for display purposes
    const { brand_name, model_name, ...basicInfoForDB } = basicInfo;

    // Get pricing fields from sales (preferred) or fallback to basicInfo
    const price = sales.price ?? basicInfoForDB.price;
    const statusId = sales.statusId ?? basicInfoForDB.status_id;
    const discountPercentage = sales.discountPercentage ?? basicInfoForDB.discount_percentage;

    const vehiclePayload = {
      ...basicInfoForDB,
      // Override with sales values
      price,
      status_id: statusId,
      discount_percentage: discountPercentage,
      client_id: user.clientId,
      is_consigned: acquisition.isConsigned,
      is_online_consignment: acquisition.isOnlineConsignment ?? false,
      // Régimen de IVA fijado en la entrada (R2). null = hereda el default del cliente.
      iva_exento: acquisition.ivaExento ?? null,
      seller_id: sellerId, // Use the seller_id selected in the sales form
      dealership_id: dealershipId, // Use the dealership_id selected in the sales form
      min_price: sales.minPrice,
      main_image: mainImageUrl,
      gallery: galleryUrls.length > 0 ? galleryUrls : null,
      // Explícito: el listado de inventario filtra por show_in_stock=true. Sin
      // setearlo, un auto recién creado podía quedar invisible ("desapareció" en
      // onboarding, reportado por VDT) si el default de la columna no era true.
      show_in_stock: true,
    };

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .insert(vehiclePayload)
      .select('id')
      .single();

    if (vehicleError) {
      console.error('Error adding vehicle:', vehicleError);
      throw vehicleError;
    }

    if (!vehicle || !vehicle.id) {
      console.error('Vehicle ID not found after creation');
      throw new Error('Vehicle ID not found after creation');
    }

    const vehicleId = vehicle.id;

    // Create document for the vehicle (purchase or consignment)
    const documentType = acquisition.isConsigned ? 'consignment' : 'purchase';
    const documentId = await createVehicleDocument(
      vehicleId,
      documentType,
      user.clientId,
      acquisition.isConsigned
        ? acquisition.consignmentCustomerId
        : acquisition.purchaseCustomerId
    );

    console.log('Created vehicle document with ID:', documentId);

    // Create purchase or consignment record.
    // Si falla, hacemos rollback del vehicle creado (CASCADE limpia documents)
    // para no dejar el cliente "huérfano" — el vínculo customer↔vehicle vive
    // en vehicles_consignments / vehicles_purchases, no en vehicles.
    try {
      if (acquisition.isConsigned) {
        // Prepare banking info if provided
        const bankingInfo: ConsignmentBankingInfo | undefined =
          acquisition.consignmentBankName ||
          acquisition.consignmentAccountNumber ||
          acquisition.consignmentAccountHolderName
            ? {
                bankName: acquisition.consignmentBankName,
                accountType: acquisition.consignmentAccountType,
                accountNumber: acquisition.consignmentAccountNumber,
                accountHolderName: acquisition.consignmentAccountHolderName,
                accountHolderRut: acquisition.consignmentAccountHolderRut,
              }
            : undefined;

        await createConsignment(
          vehicleId,
          acquisition.consignmentCustomerId,
          acquisition.consignmentAgreedPrice ?? 0,
          documentId || undefined,
          acquisition.documentNotes,
          acquisition.consignmentSuggestedPrice,
          bankingInfo,
          acquisition.consignmentSaleType,
          acquisition.consignmentDealershipId,
          acquisition.consignmentFinanciera,
          acquisition.acquisitionDate,
          acquisition.consignmentSellerId ?? undefined,
          {
            metodo: acquisition.consignmentMetodo,
            porcentaje: acquisition.consignmentComisionPercentage,
            montoFijo: acquisition.consignmentComisionFixed,
          }
        );
      } else {
        // Prepare banking info if provided
        const purchaseBankingInfo: PurchaseBankingInfo | undefined =
          acquisition.purchaseBankName ||
          acquisition.purchaseAccountNumber ||
          acquisition.purchaseAccountHolderName
            ? {
                bankName: acquisition.purchaseBankName,
                accountType: acquisition.purchaseAccountType,
                accountNumber: acquisition.purchaseAccountNumber,
                accountHolderName: acquisition.purchaseAccountHolderName,
                accountHolderRut: acquisition.purchaseAccountHolderRut,
              }
            : undefined;

        await createPurchase(
          vehicleId,
          acquisition.purchasePrice || 0,
          acquisition.purchaseCustomerId,
          acquisition.documentNotes,
          purchaseBankingInfo,
          documentId || undefined,
          acquisition.acquisitionDate,
          acquisition.purchaseGeneraCreditoFiscal
        );
      }
    } catch (acquisitionError) {
      console.error('Error creating acquisition record, rolling back vehicle:', acquisitionError);
      await supabase.from('vehicles').delete().eq('id', vehicleId);
      throw acquisitionError;
    }

    // Insertar documentos extra (múltiples) en vehicles_extras
    // Normalizar posibles formatos de entrada a un arreglo
    const rawExtraDocs = media.extraDocuments as unknown;
    const normalizedDocs: unknown[] = Array.isArray(rawExtraDocs)
      ? rawExtraDocs
      : rawExtraDocs
      ? [rawExtraDocs]
      : [];

    if (normalizedDocs.length > 0) {
      const rowsToInsert: {
        vehicle_id: number;
        title: string;
        description: string;
        type: string;
        docs_urls: string;
      }[] = [];

      for (const item of normalizedDocs) {
        let itemTitle = '';
        let itemDescription = '';
        let itemType = 'document';
        let url: string | null = null;

        if (item && typeof item === 'object' && 'title' in (item as any)) {
          itemTitle = ((item as any).title as string) || '';
        }
        if (item && typeof item === 'object' && 'description' in (item as any)) {
          itemDescription = ((item as any).description as string) || '';
        }
        if (item && typeof item === 'object' && 'type' in (item as any)) {
          itemType = ((item as any).type as string) || 'document';
        }

        if (item) {
          if (typeof item === 'object' && 'file' in (item as any)) {
            const fileOrUrl = (item as any).file;
            if (fileOrUrl instanceof File) {
              url = await uploadImage(fileOrUrl, 'vehicles/documents');
            } else if (typeof fileOrUrl === 'string') {
              url = fileOrUrl;
            }
          } else if (item instanceof File) {
            url = await uploadImage(item, 'vehicles/documents');
          } else if (typeof item === 'string') {
            url = item;
          }
        }

        if (url) {
          rowsToInsert.push({
            vehicle_id: vehicleId,
            title: itemTitle,
            description: itemDescription,
            type: itemType,
            docs_urls: url,
          });
        }
      }

      if (rowsToInsert.length > 0) {
        const { error } = await supabase.from('vehicles_extras').insert(rowsToInsert);
        if (error) {
          console.error('Error insertando documentos extra en vehicles_extras:', error);
          throw error;
        }
      }
    }

    // ChileAutos: auto-publish if sync_on_publish is enabled (fire-and-forget)
    try {
      const caIntegration = await getChileautosIntegration(user.clientId);
      if (caIntegration?.sync_on_publish && caIntegration.status === 'active') {
        autoPublishToChileautos([vehicleId], user.clientId).then((result) => {
          if (result.summary.published > 0) {
            console.log('[ChileAutos] Vehicle auto-published successfully');
          } else if (result.summary.needsManualSelection > 0) {
            console.log('[ChileAutos] Auto-publish: vehicle needs manual brand/model selection');
          } else {
            console.warn('[ChileAutos] Auto-publish failed:', result);
          }
        }).catch((err) => {
          console.warn('[ChileAutos] Error during auto-publish:', err);
        });
      }
    } catch (caError) {
      console.warn('[ChileAutos] Error checking sync_on_publish:', caError);
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'vehicle_created',
      properties: {
        vehicle_id: vehicleId,
        client_id: user?.clientId,
        is_consigned: acquisition.isConsigned,
        brand_id: basicInfo.brand_id,
        model_id: basicInfo.model_id,
        year: basicInfo.year,
      },
    });

    return vehicleId;
  } catch (error) {
    posthog.captureException(error);
    console.error('Error in createVehicle:', error);
    throw error;
  }
};
// Nueva función para insertar en vehicles_extras
export const insertVehicleExtra = async ({
  vehicle_id,
  title,
  description,
  type,
  docs_urls,
  assumed_by,
}: {
  vehicle_id: number;
  title: string;
  description: string;
  type: string;
  docs_urls: string;
  assumed_by?: 'dealership' | 'customer' | 'consignor' | null;
}) => {
  const insertData: Record<string, any> = { vehicle_id, title, description, type, docs_urls };
  if (assumed_by) {
    insertData.assumed_by = assumed_by;
  }
  const { data, error } = await supabase
    .from('vehicles_extras')
    .insert([insertData])
    .select();
  if (error) {
    console.error('Error insertando en vehicles_extras:', error);
    throw error;
  }
  return data;
};
