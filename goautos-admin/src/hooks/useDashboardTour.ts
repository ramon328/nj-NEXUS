import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { injectTourStyles } from '@/utils/tourStyles';

export const useDashboardTour = () => {
  const { t } = useTranslation('tour');

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
          element: '[data-tour="dashboard-pills"]',
          popover: {
            title: t('pills.title'),
            description: t('pills.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="dashboard-filters-desktop"]',
          popover: {
            title: t('timeFilter.title'),
            description: t('timeFilter.description'),
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="dashboard-kpis"]',
          popover: {
            title: t('stats.title'),
            description: t('stats.description'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="dashboard-chart"]',
          popover: {
            title: t('performanceChart.title'),
            description: t('performanceChart.description'),
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="dashboard-alerts"]',
          popover: {
            title: t('smartAlerts.title'),
            description: t('smartAlerts.description'),
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="dashboard-sales-summary"]',
          popover: {
            title: t('salesSummary.title'),
            description: t('salesSummary.description'),
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
