
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Instagram as InstagramIcon } from 'lucide-react';

type InstagramPageHeaderProps = {
  onConnect: () => void;
  isProcessing: boolean;
};

export function InstagramPageHeader({ onConnect, isProcessing }: InstagramPageHeaderProps) {
  const { t } = useTranslation('common');
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Instagram
        </h1>
        <Button
          onClick={onConnect}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
          disabled={isProcessing}
        >
          <InstagramIcon className="w-5 h-5 mr-2" />
          {isProcessing ? t('instagram.pageHeader.processing') : t('instagram.pageHeader.connectNew')}
        </Button>
      </div>
    </div>
  );
}
