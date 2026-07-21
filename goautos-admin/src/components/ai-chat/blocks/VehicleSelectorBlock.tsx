import { VehiclePreview } from '@/types/gaia';
import { VehicleCardBlock } from './VehicleCardBlock';
import { MousePointerClick } from 'lucide-react';

interface VehicleSelectorBlockProps {
  vehicles: VehiclePreview[];
  prompt: string;
  onSelect: (vehicle: VehiclePreview) => void;
}

export function VehicleSelectorBlock({ vehicles, prompt, onSelect }: VehicleSelectorBlockProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
          <MousePointerClick className="w-3.5 h-3.5 text-cyan-600" />
        </div>
        <p className="text-sm font-medium text-slate-700">{prompt}</p>
      </div>
      <VehicleCardBlock vehicles={vehicles} onSelect={onSelect} />
    </div>
  );
}
