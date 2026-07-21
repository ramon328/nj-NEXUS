import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { injectTourStyles } from '@/utils/tourStyles';

export const useVehicleDetailsTour = () => {
  const { t } = useTranslation('vehicleDetailsTour');

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
          element: '[data-tour="vehicle-header"]',
          popover: {
            title: t('header.title'),
            description: t('header.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="vehicle-tabs"]',
          popover: {
            title: t('tabs.title'),
            description: t('tabs.description'),
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
