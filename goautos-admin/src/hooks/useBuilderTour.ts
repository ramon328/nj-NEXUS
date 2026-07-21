import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { injectTourStyles } from '@/utils/tourStyles';

export const useBuilderTour = () => {
  const { t } = useTranslation('builderTour');

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
          element: '[data-tour="builder-topbar"]',
          popover: {
            title: t('topbar.title'),
            description: t('topbar.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="builder-device-toggle"]',
          popover: {
            title: t('deviceToggle.title'),
            description: t('deviceToggle.description'),
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '[data-tour="builder-canvas"]',
          popover: {
            title: t('canvas.title'),
            description: t('canvas.description'),
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="builder-sidebar"]',
          popover: {
            title: t('sidebar.title'),
            description: t('sidebar.description'),
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="builder-save-button"]',
          popover: {
            title: t('saveButton.title'),
            description: t('saveButton.description'),
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="builder-actions-menu"]',
          popover: {
            title: t('actionsMenu.title'),
            description: t('actionsMenu.description'),
            side: 'bottom',
            align: 'end',
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
