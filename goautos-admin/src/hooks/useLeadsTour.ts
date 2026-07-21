import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { injectTourStyles } from '@/utils/tourStyles';

export const useLeadsTour = () => {
  const { t } = useTranslation('leadsTour');

  useEffect(() => { injectTourStyles(); }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      popoverClass: 'goauto-tour',
      steps: [
        {
          popover: {
            title: t('welcome.title'),
            description: t('welcome.description'),
          },
        },
        {
          element: '[data-tour="leads-status-cards"]',
          popover: {
            title: t('statusCards.title'),
            description: t('statusCards.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="leads-tabs"]',
          popover: {
            title: t('tabs.title'),
            description: t('tabs.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="leads-filters"]',
          popover: {
            title: t('filters.title'),
            description: t('filters.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="leads-content"]',
          popover: {
            title: t('content.title'),
            description: t('content.description'),
            side: 'top',
            align: 'start',
          },
        },
        {
          popover: {
            title: t('finish.title'),
            description: t('finish.description'),
          },
        },
      ],
      nextBtnText: t('buttons.next'),
      prevBtnText: t('buttons.previous'),
      doneBtnText: t('buttons.done'),
    });

    driverObj.drive();
  };

  return { startTour };
};
