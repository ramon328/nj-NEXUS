import React from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from './ui/button';
import { useTourManager } from '@/hooks/useTourManager';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

/**
 * Botón para iniciar el tour en cualquier página
 * Debe ser integrado en el header de cada página
 */
const TourButton: React.FC = () => {
  const { startTour, hasTourForCurrentRoute } = useTourManager();

  // Si no hay tour disponible, no mostrar
  if (!hasTourForCurrentRoute) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={startTour}
            size='icon'
            className='relative h-9 w-9 rounded-lg bg-transparent hover:bg-slate-100 text-slate-500 transition-colors'
          >
            <Lightbulb className='h-5 w-5' />
            {/* Pelotita amarilla */}
            <span className='absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 ring-white' />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='bottom' className='bg-amber-500 text-white'>
          <p>Iniciar tour</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TourButton;
