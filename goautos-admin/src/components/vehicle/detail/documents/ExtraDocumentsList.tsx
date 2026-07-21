import React, { useMemo, useState } from 'react';
import { VehicleTransaction } from '../transactions/types';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  File,
  Trash,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtraDocumentsListProps {
  documents: VehicleTransaction[];
  isCompact?: boolean;
  onRefresh?: () => void;
}

const ExtraDocumentsList = ({
  documents,
  isCompact = false,
  onRefresh,
}: ExtraDocumentsListProps) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [localDocuments, setLocalDocuments] =
    useState<VehicleTransaction[]>(documents);

  // Actualizar el estado local cuando cambien los documents de las props
  React.useEffect(() => {
    setLocalDocuments(documents);
  }, [documents]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return <TrendingDown className='text-red-500' />;
      case 'income':
        return <TrendingUp className='text-green-500' />;
      default:
        return <FileText className='text-blue-500' />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'expense':
        return 'Gasto';
      case 'income':
        return 'Ingreso';
      case 'document':
        return 'Documento';
      default:
        return type;
    }
  };

  // Ordenar documentos del más reciente al más antiguo
  const sortedDocuments = useMemo(() => {
    return [...localDocuments].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Orden descendente (más reciente primero)
    });
  }, [localDocuments]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from('vehicles_extras')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      // Actualizar la lista local sin el documento eliminado
      setLocalDocuments((prev) => prev.filter((doc) => doc.id !== id));

      toast.success('Documento eliminado');

      // También llamamos a onRefresh para mantener la sincronización con el servidor
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      toast.error('No se pudo eliminar el documento');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className='grid gap-3'>
      {sortedDocuments.map((doc, index) => (
        <Card
          key={doc.id || index}
          className='border shadow-sm rounded-xl bg-white transition-shadow duration-150 hover:shadow-lg'
        >
          <CardContent className='flex flex-col p-3 relative'>
            {/* Chip y basurero en la esquina superior derecha */}
            <div className='absolute right-4 top-4 flex flex-col items-center'>
              <Badge className='text-xs px-3 py-1 rounded-full bg-sky-50 text-sky-500 border-sky-200 font-semibold pointer-events-none hover:bg-sky-100 hover:text-sky-700 hover:shadow-none'>
                {getTransactionLabel(doc.type)}
              </Badge>
              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7 mt-2 text-gray-400 hover:text-gray-600 flex items-center justify-center'
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                style={{ boxShadow: 'none' }}
              >
                {deletingId === doc.id ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Trash className='h-4 w-4 text-gray-800' />
                )}
              </Button>
            </div>
            {/* Contenido principal */}
            <div className='flex flex-col gap-0.5 pr-20'>
              <h4 className='font-semibold text-[15px] text-gray-900 leading-tight'>
                {doc.title || 'Documento'}
              </h4>
              {doc.description && (
                <p className='text-xs text-gray-700 mt-0.5'>
                  {doc.description}
                </p>
              )}
              <p className='text-xs text-gray-500 mt-0.5'>
                {new Date(doc.created_at || Date.now()).toLocaleDateString(
                  'es-CL'
                )}
              </p>
              {/* Documentos adjuntos: mostrar todos los enlaces si es array o string JSON */}
              {(() => {
                let urls: string[] = [];
                if (Array.isArray(doc.docs_urls)) {
                  // Si el primer elemento es un string que parece un array JSON, parsea
                  if (
                    doc.docs_urls.length === 1 &&
                    typeof doc.docs_urls[0] === 'string' &&
                    doc.docs_urls[0].startsWith('[')
                  ) {
                    try {
                      urls = JSON.parse(doc.docs_urls[0]);
                    } catch {
                      urls = [];
                    }
                  } else {
                    urls = doc.docs_urls;
                  }
                } else if (typeof doc.docs_urls === 'string') {
                  try {
                    urls = JSON.parse(doc.docs_urls);
                  } catch {
                    urls = [];
                  }
                }
                return urls.length > 0 ? (
                  <div className='mt-1 flex flex-wrap gap-2'>
                    {urls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80'
                        style={{ wordBreak: 'break-all' }}
                      >
                        <FileText className='h-3 w-3 mr-1 text-gray-500' />
                        {url.split('/').pop() || `Documento ${i + 1}`}
                        <ExternalLink className='h-3 w-3 ml-1 text-gray-400' />
                      </a>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExtraDocumentsList;
