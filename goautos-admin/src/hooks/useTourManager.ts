import { useLocation } from 'wouter';
import { useDashboardTour } from './useDashboardTour';
import { useVehiclesTour } from './useVehiclesTour';
import { useVehicleDetailsTour } from './useVehicleDetailsTour';
import { useCustomersTour } from './useCustomersTour';
import { useLeadsTour } from './useLeadsTour';
import { useSalesTour } from './useSalesTour';
import { useFinancingTour } from './useFinancingTour';
import { useBuilderTour } from './useBuilderTour';

/**
 * Hook central para manejar todos los tours de la aplicación
 * Detecta automáticamente en qué página está el usuario y proporciona el tour correspondiente
 */
export const useTourManager = () => {
  const [location] = useLocation();

  // Importar todos los hooks de tours
  const dashboardTour = useDashboardTour();
  const vehiclesTour = useVehiclesTour();
  const vehicleDetailsTour = useVehicleDetailsTour();
  const customersTour = useCustomersTour();
  const leadsTour = useLeadsTour();
  const salesTour = useSalesTour();
  const financingTour = useFinancingTour();
  const builderTour = useBuilderTour();

  // Mapeo de rutas a tours
  const tourMap: Record<string, { startTour: () => void }> = {
    '/': dashboardTour, // Ruta principal del dashboard
    '/dashboard': dashboardTour,
    '/vehiculos': vehiclesTour,
    '/vehiculo': vehicleDetailsTour, // Para rutas dinámicas /vehiculo/:id
    '/clientes': customersTour,
    '/leads': leadsTour,
    '/ventas': salesTour,
    '/financiamiento': financingTour,
    '/builder': builderTour,
  };

  // Función para detectar si la ruta actual tiene un tour disponible
  const hasTourForCurrentRoute = (): boolean => {
    // Verificar coincidencia exacta
    if (tourMap[location]) {
      return true;
    }

    // Verificar coincidencia parcial para rutas dinámicas
    // Ordenar por longitud descendente para que las rutas más específicas se verifiquen primero
    const routes = Object.keys(tourMap).sort((a, b) => b.length - a.length);

    for (const route of routes) {
      // Evitar que '/' haga match con todas las rutas
      // Solo hacer match si la ruta actual empieza con la ruta del tour Y
      // el siguiente carácter es '/' o es el final de la cadena
      if (route !== '/' && location.startsWith(route) && (location === route || location[route.length] === '/')) {
        return true;
      }
    }

    return false;
  };

  // Función para iniciar el tour de la ruta actual
  const startTour = () => {
    // Verificar coincidencia exacta
    if (tourMap[location]) {
      tourMap[location].startTour();
      return;
    }

    // Verificar coincidencia parcial para rutas dinámicas
    // Ordenar por longitud descendente para que las rutas más específicas se verifiquen primero
    const routes = Object.keys(tourMap).sort((a, b) => b.length - a.length);

    for (const route of routes) {
      // Evitar que '/' haga match con todas las rutas
      if (route !== '/' && location.startsWith(route) && (location === route || location[route.length] === '/')) {
        tourMap[route].startTour();
        return;
      }
    }

    console.warn('No hay tour disponible para esta ruta:', location);
  };

  return {
    startTour,
    hasTourForCurrentRoute: hasTourForCurrentRoute(),
    currentRoute: location,
  };
};
