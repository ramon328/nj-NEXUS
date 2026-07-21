import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  Eye,
  Download,
  FileText,
  ImagePlus,
  XCircle,
  Edit,
  Calendar,
  Trash,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Document {
  id: number;
  type: string;
  created_at?: string;
  document_date?: string;
  notes?: string;
  status?: string;
  [key: string]: any;
}

interface DocumentItemProps {
  document: Document;
  menuOpen: number | null;
  setMenuOpen: (id: number | null) => void;
  isDeleting: boolean;
  handleDeleteDocument: (id: number) => Promise<void>;
  onView: (document: Document) => void;
  onDownload?: (document: Document) => void;
  onEdit?: (document: Document) => void;
  isCompact?: boolean;
  hideDelete?: boolean;
}

export const getDocumentTypeDisplay = (type: string) => {
  switch (type) {
    case 'consignment':
      return 'Nota de Consignación';
    case 'quotation':
      return 'Cotización';
    case 'reservation':
      return 'Nota de Reservación';
    case 'sale':
      return 'Nota de Venta';
    case 'purchase':
      return 'Nota de Compra';
    case 'close_deal':
      return 'Cierre de Negocio';
    case 'spec_sheet':
      return 'Ficha Técnica';
    default:
      return 'Documento';
  }
};

const DocumentItem: React.FC<DocumentItemProps> = ({
  document,
  menuOpen,
  setMenuOpen,
  isDeleting,
  handleDeleteDocument,
  onView,
  onDownload,
  onEdit,
  isCompact = false,
  hideDelete = false,
}) => {
  return (
    <Card
      key={document.id}
      className='border rounded-xl transition hover:shadow-md bg-white'
    >
      <CardContent
        className={`flex items-center justify-between ${
          isCompact ? 'p-4' : 'p-6'
        }`}
      >
        <div className={`flex items-center ${isCompact ? 'gap-3' : 'gap-5'}`}>
          {/* Icono principal */}
          {document.type === 'consignment' && (
            <FileText className='h-7 w-7 text-blue-400 ' strokeWidth={1} />
          )}
          {document.type === 'quotation' && (
            <FileText className='h-7 w-7 text-green-400' strokeWidth={1} />
          )}
          {document.type === 'reservation' && (
            <FileText className='h-7 w-7 text-orange-400' strokeWidth={1} />
          )}
          {document.type === 'sale' && (
            <FileText className='h-7 w-7 text-purple-400' strokeWidth={1} />
          )}
          {document.type === 'purchase' && (
            <FileText className='h-7 w-7 text-red-400' strokeWidth={1} />
          )}
          {document.type === 'close_deal' && (
            <FileText className='h-7 w-7 text-indigo-400' strokeWidth={1} />
          )}
          {document.type === 'spec_sheet' && (
            <FileText className='h-7 w-7 text-cyan-400' strokeWidth={1} />
          )}
          <div>
            <h4 className='font-semibold text-sm sm:text-base text-gray-900 mb-1'>
              {getDocumentTypeDisplay(document.type)}
              {document.is_trade_in_doc && (
                <span className='ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded'>
                  Parte de pago
                </span>
              )}
            </h4>
            {document.is_trade_in_doc && document.trade_in_label && (
              <p className='text-xs text-gray-500 mb-0.5'>
                {document.trade_in_label}
              </p>
            )}
            <div className='flex items-center text-xs text-gray-500 gap-1'>
              <Calendar className='w-3 h-3' />
              <span>
                {(document.document_date || document.created_at) &&
                  new Date(document.document_date || document.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className={`flex items-center ${isCompact ? 'gap-1' : 'gap-2'}`}>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onView(document)}
            className='h-8 px-2 hover:bg-sky-50 transition-colors'
          >
            <Eye className={`h-4 w-4 ${isCompact ? '' : 'mr-2'}`} />
            {!isCompact && 'Ver'}
          </Button>

          {/* Descargar directo (genera el PDF y lo baja sin abrir el viewer) */}
          {onDownload && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onDownload(document)}
              className='h-8 px-2 hover:bg-sky-50 transition-colors'
              title='Descargar'
            >
              <Download className={`h-4 w-4 ${isCompact ? '' : 'mr-2'}`} />
              {!isCompact && 'Descargar'}
            </Button>
          )}

          {/* Edit button for all document types */}
          {onEdit && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => onEdit(document)}
                className='h-8 px-2 hover:bg-sky-50  transition-colors'
              >
                <Edit className={`h-4 w-4 ${isCompact ? '' : 'mr-2'}`} />
                {!isCompact && 'Editar'}
              </Button>
            )}

          {!hideDelete && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleDeleteDocument(document.id)}
              className='h-6 px-2 hover:bg-sky-50 transition-colors'
              disabled={isDeleting}
              title='Eliminar documento'
            >
              <Trash className='h-4 w-4' />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentItem;
