import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

interface BackButtonProps {
  title?: string;
  onClick?: () => void;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  title = 'Volver',
  onClick,
  className = '',
}) => {
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.history.back();
    }
  };

  return (
    <Button
      variant='ghost'
      onClick={handleClick}
      className={`flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-0 py-2 ${className}`}
    >
      <ArrowLeft className='h-4 w-4' />
      <span className='text-sm font-medium'>{title}</span>
    </Button>
  );
};

export default BackButton;
