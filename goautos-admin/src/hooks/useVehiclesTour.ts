import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { injectTourStyles } from '@/utils/tourStyles';

export const useVehiclesTour = () => {
  const { t } = useTranslation('vehiclesTour');

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
          element: '[data-tour="status-cards"]',
          popover: {
            title: t('statusCards.title'),
            description: t('statusCards.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="add-vehicle"]',
          popover: {
            title: t('addVehicle.title'),
            description: t('addVehicle.description'),
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="view-toggle"]',
          popover: {
            title: t('viewToggle.title'),
            description: t('viewToggle.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="export-excel"]',
          popover: {
            title: t('exportExcel.title'),
            description: t('exportExcel.description'),
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="column-selector"]',
          popover: {
            title: t('columnSelector.title'),
            description: t('columnSelector.description'),
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="filters"]',
          popover: {
            title: t('filters.title'),
            description: t('filters.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="vehicles-content"]',
          popover: {
            title: t('tableView.title'),
            description: t('tableView.description'),
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
