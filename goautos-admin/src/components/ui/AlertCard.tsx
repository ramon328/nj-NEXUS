import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertOctagon, LucideIcon } from 'lucide-react';
import { useLocation } from 'wouter';

type AlertCardProps = {
  label: string;
  href: string;
  variant?: 'warning' | 'info';
  icon?: LucideIcon;
};

const AlertCard = ({
  label,
  href,
  variant = 'warning',
  icon: Icon,
}: AlertCardProps) => {
  const [, navigate] = useLocation();

  // Determine which icon to use based on variant and provided icon
  const AlertIcon =
    Icon || (variant === 'warning' ? AlertOctagon : AlertCircle);

  return (
    <Card
      className='border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors'
      onClick={() => navigate(href)}
    >
      <CardContent className='p-3 sm:p-4 flex items-center gap-2 sm:gap-3'>
        <AlertIcon className='h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0' />
        <p className='text-amber-700 text-xs sm:text-sm'>{label}</p>
      </CardContent>
    </Card>
  );
};

export default AlertCard;
