import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import esCommon from './locales/es/common.json';
import esNavigation from './locales/es/navigation.json';
import esForms from './locales/es/forms.json';
import esTeam from './locales/es/team.json';
import esAppraisel from './locales/es/appraisel.json';
import esAuth from './locales/es/auth.json';
import esDashboard from './locales/es/dashboard/dashboard.json';
import esTour from './locales/es/dashboard/tour.json';
import esVehiculos from './locales/es/vehicles/vehiculos.json';
import esVehiclesTour from './locales/es/vehicles/tour.json';
import esVehicleDetails from './locales/es/vehicle-details/vehicle-details.json';
import esVehicleDetailsTour from './locales/es/vehicle-details/tour.json';
import esVehicleReservations from './locales/es/vehicle-details/reservations.json';
import esVehicleTimeline from './locales/es/vehicle-details/timeline.json';
import esVehicleTransactions from './locales/es/vehicle-details/transactions.json';
import esVehicleDocuments from './locales/es/vehicle-details/documents.json';
import esVehicleQuotations from './locales/es/vehicle-details/quotations.json';
import esVehicleSales from './locales/es/vehicle-details/sales.json';
import esSalesPage from './locales/es/sales/sales.json';
import esSalesTour from './locales/es/sales/tour.json';
import esLeadsPage from './locales/es/leads/leads.json';
import esLeadsTour from './locales/es/leads/tour.json';
import esFinancingPage from './locales/es/financing/financing.json';
import esFinancingTour from './locales/es/financing/tour.json';
import esCustomersPage from './locales/es/customers/customers.json';
import esCustomersTour from './locales/es/customers/tour.json';
import esBuilderPage from './locales/es/builder/builder.json';
import esBuilderTour from './locales/es/builder/tour.json';
import esInAppOnboarding from './locales/es/onboarding/in-app.json';
import esSubscription from './locales/es/subscription.json';
import esSolicitudes from './locales/es/solicitudes.json';
import esNotifications from './locales/es/notifications.json';
import esImplementation from './locales/es/implementation.json';
import enCommon from './locales/en/common.json';
import enNavigation from './locales/en/navigation.json';
import enForms from './locales/en/forms.json';
import enTeam from './locales/en/team.json';
import enAppraisel from './locales/en/appraisel.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard/dashboard.json';
import enTour from './locales/en/dashboard/tour.json';
import enVehiculos from './locales/en/vehicles/vehiculos.json';
import enVehiclesTour from './locales/en/vehicles/tour.json';
import enVehicleDetails from './locales/en/vehicle-details/vehicle-details.json';
import enVehicleDetailsTour from './locales/en/vehicle-details/tour.json';
import enVehicleReservations from './locales/en/vehicle-details/reservations.json';
import enVehicleTimeline from './locales/en/vehicle-details/timeline.json';
import enVehicleTransactions from './locales/en/vehicle-details/transactions.json';
import enVehicleDocuments from './locales/en/vehicle-details/documents.json';
import enVehicleQuotations from './locales/en/vehicle-details/quotations.json';
import enVehicleSales from './locales/en/vehicle-details/sales.json';
import enSalesPage from './locales/en/sales/sales.json';
import enSalesTour from './locales/en/sales/tour.json';
import enLeadsPage from './locales/en/leads/leads.json';
import enLeadsTour from './locales/en/leads/tour.json';
import enFinancingPage from './locales/en/financing/financing.json';
import enFinancingTour from './locales/en/financing/tour.json';
import enCustomersPage from './locales/en/customers/customers.json';
import enCustomersTour from './locales/en/customers/tour.json';
import enBuilderPage from './locales/en/builder/builder.json';
import enBuilderTour from './locales/en/builder/tour.json';
import enInAppOnboarding from './locales/en/onboarding/in-app.json';
import enSubscription from './locales/en/subscription.json';
import enSolicitudes from './locales/en/solicitudes.json';
import enNotifications from './locales/en/notifications.json';
import enImplementation from './locales/en/implementation.json';

const resources = {
  es: {
    common: esCommon,
    navigation: esNavigation,
    forms: esForms,
    team: esTeam,
    appraisel: esAppraisel,
    auth: esAuth,
    dashboard: esDashboard,
    tour: esTour,
    vehiculos: esVehiculos,
    vehiclesTour: esVehiclesTour,
    vehicleDetails: esVehicleDetails,
    vehicleDetailsTour: esVehicleDetailsTour,
    vehicleReservations: esVehicleReservations,
    vehicleTimeline: esVehicleTimeline,
    vehicleTransactions: esVehicleTransactions,
    vehicleDocuments: esVehicleDocuments,
    vehicleQuotations: esVehicleQuotations,
    vehicleSales: esVehicleSales,
    salesPage: esSalesPage,
    salesTour: esSalesTour,
    leadsPage: esLeadsPage,
    leadsTour: esLeadsTour,
    financingPage: esFinancingPage,
    financingTour: esFinancingTour,
    customersPage: esCustomersPage,
    customersTour: esCustomersTour,
    builderPage: esBuilderPage,
    builderTour: esBuilderTour,
    inAppOnboarding: esInAppOnboarding,
    subscription: esSubscription,
    solicitudes: esSolicitudes,
    notifications: esNotifications,
    implementation: esImplementation,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    forms: enForms,
    team: enTeam,
    appraisel: enAppraisel,
    auth: enAuth,
    dashboard: enDashboard,
    tour: enTour,
    vehiculos: enVehiculos,
    vehiclesTour: enVehiclesTour,
    vehicleDetails: enVehicleDetails,
    vehicleDetailsTour: enVehicleDetailsTour,
    vehicleReservations: enVehicleReservations,
    vehicleTimeline: enVehicleTimeline,
    vehicleTransactions: enVehicleTransactions,
    vehicleDocuments: enVehicleDocuments,
    vehicleQuotations: enVehicleQuotations,
    vehicleSales: enVehicleSales,
    salesPage: enSalesPage,
    salesTour: enSalesTour,
    leadsPage: enLeadsPage,
    leadsTour: enLeadsTour,
    financingPage: enFinancingPage,
    financingTour: enFinancingTour,
    customersPage: enCustomersPage,
    customersTour: enCustomersTour,
    builderPage: enBuilderPage,
    builderTour: enBuilderTour,
    inAppOnboarding: enInAppOnboarding,
    subscription: enSubscription,
    solicitudes: enSolicitudes,
    notifications: enNotifications,
    implementation: enImplementation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'forms', 'team', 'appraisel', 'auth', 'dashboard', 'tour', 'vehiculos', 'vehiclesTour', 'vehicleDetails', 'vehicleDetailsTour', 'vehicleReservations', 'vehicleTimeline', 'vehicleTransactions', 'vehicleDocuments', 'vehicleQuotations', 'vehicleSales', 'salesPage', 'salesTour', 'leadsPage', 'leadsTour', 'financingPage', 'financingTour', 'customersPage', 'customersTour', 'builderPage', 'builderTour', 'inAppOnboarding', 'subscription', 'solicitudes', 'notifications', 'implementation'],

    interpolation: {
      escapeValue: false, // react already safes from xss
    },

    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'goautos-language',
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
