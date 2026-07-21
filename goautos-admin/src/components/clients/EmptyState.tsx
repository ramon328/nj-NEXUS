
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}

const EmptyState = ({ title, description, buttonLabel, onButtonClick }: EmptyStateProps) => {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Users className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          {description}
        </p>
        {buttonLabel && onButtonClick && (
          <Button onClick={onButtonClick} size="sm">
            {buttonLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
