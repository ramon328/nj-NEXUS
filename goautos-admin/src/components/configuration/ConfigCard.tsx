import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReactNode } from 'react';

interface ConfigCardProps {
  title: string;
  children: ReactNode;
  onClick?: () => void;
}

const ConfigCard = ({ title, children, onClick }: ConfigCardProps) => {
  return (
    <Card
      className='hover:bg-accent/50 transition-colors cursor-pointer backdrop-blur-sm border border-neutral-200/50 shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-200'
      onClick={onClick}
    >
      <CardHeader className='space-y-1'>
        <CardTitle className='text-xl font-semibold bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent'>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className='text-muted-foreground'>{children}</CardContent>
    </Card>
  );
};

export default ConfigCard;
