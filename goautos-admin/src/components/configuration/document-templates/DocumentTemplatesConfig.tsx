import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import useDocumentTemplate from '@/hooks/useDocumentTemplate';
import SaleDocumentTemplate from './SaleDocumentTemplate';
import PurchaseDocumentTemplate from './PurchaseDocumentTemplate';
import ConsignmentDocumentTemplate from './ConsignmentDocumentTemplate';
import ReservationDocumentTemplate from './ReservationDocumentTemplate';
import QuotationDocumentTemplate from './QuotationDocumentTemplate';
import PurchaseNote from '@/components/documents/PurchaseNote';
import CloseDealDocumentTemplate from './CloseDealDocumentTemplate';
import SpecSheetTemplateConfig, {
  type SpecSheetTemplateConfigHandle,
} from './SpecSheetTemplateConfig';
import { TemplateType } from '@/types/document-template';
import { useTranslation } from 'react-i18next';
import { getLegalInfoForDealership } from '@/services/legalInfoService';


// Ya no necesitamos este adaptador ya que nuestro componente PurchaseDocumentTemplate
// ya usa internamente el nuevo PurchaseNote
// Sin embargo, lo mantenemos por ahora para compatibilidad
const PurchaseDocumentTemplateAdapter = (props: any) => {
  const { editableText, handleTextChange, client, legalInfo } = props;

  return (
    <PurchaseNote
      isEditable={true}
      client={client}
      legalInfo={legalInfo}
      editableText={{
        terminos_condiciones: editableText.terminos_condiciones || '',
      }}
      handleTextChange={handleTextChange}
    />
  );
};

export interface DocumentTemplatesConfigHandle {
  save: () => void;
  saving: boolean;
}

interface DocumentTemplatesConfigProps {
  selectedDealershipId?: string | null;
}

export const DocumentTemplatesConfig = forwardRef<DocumentTemplatesConfigHandle, DocumentTemplatesConfigProps>(({ selectedDealershipId: externalDealershipId }, ref) => {
  const { toast } = useToast();
  const { client, clientId } = useAuth();
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<TemplateType>('sale');
  const [saving, setSaving] = useState(false);
  const specSheetRef = useRef<SpecSheetTemplateConfigHandle>(null);

  // Para la animación de la línea azul
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: '0px',
    width: '0px',
  });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Dealership preview state (controlled externally)
  const [previewLegalInfo, setPreviewLegalInfo] = useState<any>(null);
  const selectedDealershipId = externalDealershipId ?? null;

  useEffect(() => {
    const updateIndicator = () => {
      const tabOrder: TemplateType[] = [
        'sale',
        'purchase',
        'consignment',
        'reservation',
        'quotation',
        'close_deal',
        'spec_sheet',
      ];
      const idx = tabOrder.indexOf(activeTab);
      const activeTabRef = tabRefs.current[idx];
      if (activeTabRef) {
        setIndicatorStyle({
          left: `${activeTabRef.offsetLeft}px`,
          width: `${activeTabRef.offsetWidth}px`,
        });
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

  // Load legal info based on selected dealership
  useEffect(() => {
    const loadLegalInfo = async () => {
      if (!clientId) return;

      const dealershipIdNumber = selectedDealershipId ? parseInt(selectedDealershipId) : null;
      const legalInfoData = await getLegalInfoForDealership(clientId, dealershipIdNumber);
      setPreviewLegalInfo(legalInfoData);
    };

    loadLegalInfo();
  }, [selectedDealershipId, clientId]);

  // Extraer información legal del cliente para pasar al componente de consignación
  // Usar la legal info de la vista previa si está disponible, sino usar la del cliente
  const legalInfo = previewLegalInfo || (client && 'legal_info' in client ? (client as any).legal_info : null);

  const { template: saleTemplate, updateTemplate: updateSaleTemplate } =
    useDocumentTemplate('sale');
  const { template: purchaseTemplate, updateTemplate: updatePurchaseTemplate } =
    useDocumentTemplate('purchase');
  const {
    template: consignmentTemplate,
    updateTemplate: updateConsignmentTemplate,
  } = useDocumentTemplate('consignment');
  const {
    template: reservationTemplate,
    updateTemplate: updateReservationTemplate,
  } = useDocumentTemplate('reservation');
  const {
    template: quotationTemplate,
    updateTemplate: updateQuotationTemplate,
  } = useDocumentTemplate('quotation');
  const {
    template: closeDealTemplate,
    updateTemplate: updateCloseDealTemplate,
  } = useDocumentTemplate('close_deal');

  const { getExtraPageConfig: getSaleExtraPageConfig } = useDocumentTemplate('sale');

  const [editableText, setEditableText] = React.useState({
    sale: {
      terminos_condiciones: saleTemplate?.terms_and_conditions || '',
      extra_page_config: getSaleExtraPageConfig(),
    },
    purchase: {
      terminos_condiciones: purchaseTemplate?.terms_and_conditions || '',
    },
    consignment: {
      terminos_condiciones: consignmentTemplate?.terms_and_conditions || '',
    },
    reservation: {
      terminos_condiciones: reservationTemplate?.terms_and_conditions || '',
    },
    quotation: {
      terminos_condiciones: quotationTemplate?.terms_and_conditions || '',
    },
    close_deal: {
      terminos_condiciones: closeDealTemplate?.terms_and_conditions || '',
    },
  });

  // Update editable text when templates load
  useEffect(() => {
    if (saleTemplate) {
      console.log(
        'Actualizando texto editable sale:',
        saleTemplate.terms_and_conditions
      );
      setEditableText((prev) => ({
        ...prev,
        sale: {
          terminos_condiciones: saleTemplate.terms_and_conditions || '',
          extra_page_config: getSaleExtraPageConfig(),
        },
      }));
    }
  }, [saleTemplate]);

  useEffect(() => {
    if (purchaseTemplate?.terms_and_conditions) {
      console.log(
        'Actualizando texto editable purchase:',
        purchaseTemplate.terms_and_conditions
      );
      setEditableText((prev) => ({
        ...prev,
        purchase: {
          terminos_condiciones: purchaseTemplate.terms_and_conditions,
        },
      }));
    }
  }, [purchaseTemplate]);

  useEffect(() => {
    if (consignmentTemplate?.terms_and_conditions) {
      console.log(
        'Actualizando texto editable consignment:',
        consignmentTemplate.terms_and_conditions
      );
      setEditableText((prev) => ({
        ...prev,
        consignment: {
          terminos_condiciones: consignmentTemplate.terms_and_conditions,
        },
      }));
    }
  }, [consignmentTemplate]);

  useEffect(() => {
    if (reservationTemplate?.terms_and_conditions) {
      console.log(
        'Actualizando texto editable reservation:',
        reservationTemplate.terms_and_conditions
      );
      setEditableText((prev) => ({
        ...prev,
        reservation: {
          terminos_condiciones: reservationTemplate.terms_and_conditions,
        },
      }));
    }
  }, [reservationTemplate]);

  useEffect(() => {
    if (quotationTemplate?.terms_and_conditions) {
      console.log(
        'Actualizando texto editable quotation:',
        quotationTemplate.terms_and_conditions
      );
      setEditableText((prev) => ({
        ...prev,
        quotation: {
          terminos_condiciones: quotationTemplate.terms_and_conditions,
        },
      }));
    }
  }, [quotationTemplate]);

  useEffect(() => {
    if (closeDealTemplate?.terms_and_conditions) {
      console.log(
        'Actualizando texto editable close_deal:',
        closeDealTemplate.terms_and_conditions
      );
      setEditableText((prev) => ({
        ...prev,
        close_deal: {
          terminos_condiciones: closeDealTemplate.terms_and_conditions,
        },
      }));
    }
  }, [closeDealTemplate]);

  const handleSave = async () => {
    if (saving) return;

    // Ficha técnica: su plantilla (qué campos salen) la guarda el propio panel vía
    // ref; no usa terminos_condiciones, así que se intercepta antes del flujo común.
    if (activeTab === 'spec_sheet') {
      setSaving(true);
      try {
        await specSheetRef.current?.save();
        toast({
          title: t('configuration.documents.toasts.successTitle'),
          description: t('configuration.documents.toasts.successDescription'),
        });
      } catch (error) {
        console.error('Error al guardar la ficha técnica:', error);
        toast({
          title: t('actions.error'),
          description: t('configuration.documents.toasts.errorDescription'),
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    console.log('Guardando cambios para:', activeTab);
    console.log(
      'Valor actual:',
      editableText[activeTab as keyof typeof editableText].terminos_condiciones
    );

    setSaving(true);

    let success = false;
    const content =
      editableText[activeTab as keyof typeof editableText].terminos_condiciones;

    // Validar que el contenido no esté vacío
    if (!content || content.trim() === '') {
      toast({
        title: t('actions.error'),
        description: t('configuration.documents.toasts.emptyTermsDescription'),
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    try {
      switch (activeTab) {
        case 'sale':
          success = await updateSaleTemplate(
            content,
            editableText.sale.extra_page_config
          );
          break;
        case 'purchase':
          success = await updatePurchaseTemplate(content);
          break;
        case 'consignment':
          success = await updateConsignmentTemplate(content);
          break;
        case 'reservation':
          success = await updateReservationTemplate(content);
          break;
        case 'quotation':
          success = await updateQuotationTemplate(content);
          break;
        case 'close_deal':
          success = await updateCloseDealTemplate(content);
          break;
      }

      if (success) {
      toast({
        title: t('configuration.documents.toasts.successTitle'),
        description: t('configuration.documents.toasts.successDescription'),
      });
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      toast({
        title: t('actions.error'),
        description: t('configuration.documents.toasts.errorDescription'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
    saving,
  }), [saving, activeTab, editableText]);

  const handleTextChange = (type: string, value: any) => {
    console.log('Cambiando texto:', type, typeof value === 'string' ? value?.substring(0, 20) + '...' : value);
    setEditableText((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab as keyof typeof prev],
        [type]: value,
      },
    }));
  };

  return (
    <div className='space-y-6'>
      <div className='relative flex items-end flex-nowrap overflow-x-auto scrollbar-thin min-w-[260px] mt-1 mb-4 border-none'>
        <div
          className='absolute h-[2px] bg-slate-800 rounded-full z-10 transition-all duration-300'
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            bottom: 0,
          }}
        />
        <button
          ref={(el) => (tabRefs.current[0] = el)}
          onClick={() => setActiveTab('sale')}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm transition-colors duration-200 relative z-20 mb-1 whitespace-nowrap
                ${
                  activeTab === 'sale' ? 'text-slate-800 font-medium' : 'text-gray-500'
                }`}
          style={{ background: 'transparent' }}
        >
          {t('configuration.documents.tabs.sale')}
        </button>
        <button
          ref={(el) => (tabRefs.current[1] = el)}
          onClick={() => setActiveTab('purchase')}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm transition-colors duration-200 relative z-20 mb-1 whitespace-nowrap
                ${
                  activeTab === 'purchase' ? 'text-slate-800 font-medium' : 'text-gray-500'
                }`}
          style={{ background: 'transparent' }}
        >
          {t('configuration.documents.tabs.purchase')}
        </button>
        <button
          ref={(el) => (tabRefs.current[2] = el)}
          onClick={() => setActiveTab('consignment')}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm transition-colors duration-200 relative z-20 mb-1 whitespace-nowrap
                ${
                  activeTab === 'consignment'
                    ? 'text-[#2da2e7]'
                    : 'text-gray-500'
                }`}
          style={{ background: 'transparent' }}
        >
          {t('configuration.documents.tabs.consignment')}
        </button>
        <button
          ref={(el) => (tabRefs.current[3] = el)}
          onClick={() => setActiveTab('reservation')}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm transition-colors duration-200 relative z-20 mb-1 whitespace-nowrap
                ${
                  activeTab === 'reservation'
                    ? 'text-[#2da2e7]'
                    : 'text-gray-500'
                }`}
          style={{ background: 'transparent' }}
        >
          {t('configuration.documents.tabs.reservation')}
        </button>
        <button
          ref={(el) => (tabRefs.current[4] = el)}
          onClick={() => setActiveTab('quotation')}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm transition-colors duration-200 relative z-20 mb-1 whitespace-nowrap
                ${
                  activeTab === 'quotation' ? 'text-slate-800 font-medium' : 'text-gray-500'
                }`}
          style={{ background: 'transparent' }}
        >
          {t('configuration.documents.tabs.quotation')}
        </button>
        <button
          ref={(el) => (tabRefs.current[5] = el)}
          onClick={() => setActiveTab('close_deal')}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm transition-colors duration-200 relative z-20 mb-1 whitespace-nowrap
                ${
                  activeTab === 'close_deal'
                    ? 'text-[#2da2e7]'
                    : 'text-gray-500'
                }`}
          style={{ background: 'transparent' }}
        >
          {t('configuration.documents.tabs.closeDeal')}
        </button>
        <button
          ref={(el) => (tabRefs.current[6] = el)}
          onClick={() => setActiveTab('spec_sheet')}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm transition-colors duration-200 relative z-20 mb-1 whitespace-nowrap
                ${
                  activeTab === 'spec_sheet'
                    ? 'text-slate-800 font-medium'
                    : 'text-gray-500'
                }`}
          style={{ background: 'transparent' }}
        >
          Ficha Técnica
        </button>
      </div>

      <Card className='border-none shadow-none'>
        <CardContent className='p-0'>
          {activeTab === 'sale' && (
            <SaleDocumentTemplate
              client={client}
              legalInfo={legalInfo}
              editableText={editableText.sale}
              handleTextChange={handleTextChange}
            />
          )}
          {activeTab === 'purchase' && (
            <PurchaseDocumentTemplateAdapter
              client={client}
              legalInfo={legalInfo}
              editableText={editableText.purchase}
              handleTextChange={handleTextChange}
            />
          )}
          {activeTab === 'consignment' && (
            <ConsignmentDocumentTemplate
              client={client}
              editableText={editableText.consignment}
              handleTextChange={handleTextChange}
              legalInfo={legalInfo}
            />
          )}
          {activeTab === 'reservation' && (
            <ReservationDocumentTemplate
              client={client}
              legalInfo={legalInfo}
              editableText={editableText.reservation}
              handleTextChange={handleTextChange}
            />
          )}
          {activeTab === 'quotation' && (
            <QuotationDocumentTemplate
              client={client}
              legalInfo={legalInfo}
              editableText={editableText.quotation}
              handleTextChange={handleTextChange}
            />
          )}
          {activeTab === 'close_deal' && (
            <CloseDealDocumentTemplate
              client={client}
              legalInfo={legalInfo}
              editableText={editableText.close_deal}
              handleTextChange={handleTextChange}
            />
          )}
          {activeTab === 'spec_sheet' && (
            <SpecSheetTemplateConfig ref={specSheetRef} />
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default DocumentTemplatesConfig;
