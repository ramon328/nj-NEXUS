import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Ícono (i) con tooltip explicativo al lado de un label de formulario.
 * Sirve para aclarar "a dónde va" cada campo.
 */
export function FieldInfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Más información"
            className="inline-flex items-center"
          >
            <Info className="h-3 w-3 text-slate-400 hover:text-slate-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs leading-snug">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default FieldInfoTooltip;
