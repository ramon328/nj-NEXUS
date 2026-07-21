import React, { useState, useEffect } from 'react';
import { useDocuments } from './documents/useDocuments';
import DocumentsList from './documents/DocumentsList';
import ExtraDocumentsList from './documents/ExtraDocumentsList';
import DocumentUploadModal from './documents/DocumentUploadModal';
import { SpecSheetTemplateDialog } from './SpecSheetTemplateDialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertCircle, FileCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';
import { useAuth } from '@/contexts/AuthContext';
import AlertCard from '@/components/ui/AlertCard';
import { useI18n } from '@/hooks/useI18n';

type VehicleDocumentsProps = {
  vehicleId: number;
  vehicle: Vehicle;
};

const VehicleDocuments = ({ vehicleId, vehicle }: VehicleDocumentsProps) => {
  const { tCommon } = useI18n();
  const { client, clientId } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSpecSheet, setShowSpecSheet] = useState(false);
  const { documents, documentTransactions, isLoading, refreshDocuments } =
    useDocuments(vehicleId);

  // Verificar de forma segura si client tiene legal_info
  const hasLegalInfo = !!(
    client &&
    'legal_info' in (client as any) &&
    (client as any).legal_info
  );

  return (
    <div className='bg-white rounded-xl border border-slate-200/60 p-4 sm:p-6 space-y-4'>
      <div className='flex justify-between items-center gap-2'>
        <h1 className='font-semibold text-base text-slate-900'>
          {tCommon('vehicles.detail.documents.title')}
        </h1>
        {/* Ficha técnica: ahora es un documento más, generable desde acá (antes era
            una acción del header). Abre el editor de plantilla → "Guardar como
            documento" la deja en esta lista. */}
        <Button variant='outline' size='sm' onClick={() => setShowSpecSheet(true)}>
          <FileCog className='mr-2 h-4 w-4' />
          Ficha técnica
        </Button>
      </div>

      {!hasLegalInfo && (
        <AlertCard
          label={tCommon('vehicles.detail.documents.missingLegalInfo')}
          href='/configuracion'
          icon={AlertCircle}
        />
      )}

      <DocumentsList
        vehicleId={vehicleId}
        documents={documents}
        onRefresh={refreshDocuments}
        isCompact={true}
        vehicle={vehicle}
        isLoading={isLoading}
      />

      <>
        <h4 className='font-semibold text-sm text-slate-900 mt-4 mb-2'>
          {tCommon('vehicles.detail.documents.additional')} ({
            documentTransactions.length
          })
        </h4>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setShowUploadModal(true)}
        >
          <PlusCircle className='mr-2 h-4 w-4' />
          {tCommon('vehicles.detail.documents.addDocuments')}
        </Button>
        <ExtraDocumentsList documents={documentTransactions} isCompact={true} />
      </>

      <DocumentUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        vehicleId={vehicleId}
        onDocumentAdded={refreshDocuments}
      />

      <SpecSheetTemplateDialog
        open={showSpecSheet}
        onClose={() => setShowSpecSheet(false)}
        vehicleId={vehicleId}
        clientId={clientId}
        onSaved={refreshDocuments}
      />
    </div>
  );
};

export default VehicleDocuments;
