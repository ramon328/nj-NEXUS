
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Instagram as InstagramIcon } from 'lucide-react';

type InstagramEmptyStateProps = {
  onConnect: () => void;
  isProcessing: boolean;
};

export function InstagramEmptyState({ onConnect, isProcessing }: InstagramEmptyStateProps) {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
        <InstagramIcon className="w-8 h-8 text-white" />
      </div>
      <div className="text-center">
        <p className="text-xl text-gray-600 mb-4">{t('instagram.emptyState.noAccounts')}</p>
        <Button
          onClick={onConnect}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
          size="lg"
          disabled={isProcessing}
        >
          <InstagramIcon className="w-5 h-5 mr-2" />
          {isProcessing ? t('instagram.emptyState.processing') : t('instagram.emptyState.connectAccount')}
        </Button>
      </div>
    </div>
  );
}
