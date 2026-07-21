import { Route, Switch, Redirect } from 'wouter';
import {
  QueryClient,
  QueryClientProvider,
  MutationCache,
} from '@tanstack/react-query';
import { notifyError } from '@/lib/handleError';
import Index from '@/pages/Index';
import Vehiculos from '@/pages/Vehiculos';
import AgregarVehiculo from '@/pages/AgregarVehiculo';
import EditarVehiculo from '@/pages/EditarVehiculo';
import VehiculoDetalle from '@/pages/VehiculoDetalle';
import Clientes from '@/pages/Clientes';
import Financiamiento from '@/pages/Financiamiento';
import FinanciamientoDetalle from '@/pages/FinanciamientoDetalle';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/NotFound';
import Chats from '@/pages/Chats';
import Personas from '@/pages/Personas';
import Equipo from '@/pages/Equipo';
import Tasador from '@/pages/Tasador';
import Ventas from '@/pages/Ventas';
import Configuracion from '@/pages/Configuracion';
import Updates from '@/pages/Updates';
import Instagram from '@/pages/Instagram';
import MercadolibrePage from './pages/Mercadolibre';
import FacebookMarketplacePage from './pages/FacebookMarketplace';
import ChileautosPage from './pages/ChileAutos';
import InstagramMessages from '@/pages/instagram/Messages';
import OnboardingFlow from '@/pages/Onboarding/OnboardingFlow';
import InAppOnboarding from '@/pages/Onboarding/InAppOnboarding';
import Subscribe from '@/pages/Subscribe';
import SubscriptionRequired from '@/pages/SubscriptionRequired';
import Projection from '@/pages/Projection';
import Privacy from '@/pages/Privacy';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { AIChatProvider } from '@/contexts/AIChatContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { MeliCloseOnSoldDialog } from '@/components/mercadolibre/MeliCloseOnSoldDialog';
import Builder2 from '@/pages/Builder2';
import Leads from './pages/Leads';
import Marketing from './pages/Marketing';

import Documentos from './pages/Documentos';
import UpdatesManagement from './pages/admin/UpdatesManagement';
import UpdateEditor from './pages/admin/UpdateEditor';
import UpdateDetail from './pages/UpdateDetail';
import Funcionalidades from './pages/Funcionalidades';
import GuiaDeUso from './pages/GuiaDeUso';
import Asistente from '@/pages/Asistente';
import GAIA from '@/pages/GAIA';
import GaiaCanvas from '@/pages/GaiaCanvas';
import GuiaMarketplace from './pages/GuiaMarketplace';

import Solicitudes from '@/pages/Solicitudes';
import Tareas from '@/pages/Tareas';
import Calendario from '@/pages/Calendario';
import AlertasInteligentes from '@/pages/AlertasInteligentes';
import ErrorBoundary from '@/components/ErrorBoundary';
import { PageLoadingProvider } from '@/contexts/PageLoadingContext';

export const queryClient = new QueryClient({
  // Error handler global para mutations: si la mutation no define su propio
  // onError, mostramos un único toast en español. Las que ya tienen onError
  // propio conservan su comportamiento (evita toasts duplicados).
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.options.onError) {
        notifyError(error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 min — data se considera "fresca"
      // 30 min — el cache sobrevive aunque navegues fuera del home y vuelvas (antes 10
      // min: salías un rato, el cache se borraba y al volver el dashboard recargaba en
      // frío = "latoso" reportado). Solo es memoria; la data igual se refresca por staleTime.
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,     // no re-fetchar al volver a la pestaña
      refetchOnMount: false,           // no re-fetchar si la data no está stale
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const AppContent = () => (
  <ErrorBoundary>
  <AuthProvider>
    <PageLoadingProvider>
    <SidebarProvider>
      <AIChatProvider>
        <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path='/login'>
            <Login />
          </Route>
          <Route path='/forgot-password'>
            <ForgotPassword />
          </Route>
          <Route path='/reset-password'>
            <ResetPassword />
          </Route>
          <Route path='/onboarding'>
            <OnboardingFlow />
          </Route>
          <Route path='/privacy'>
            <Privacy />
          </Route>
          <Route path='/funcionalidades'>
            <Funcionalidades />
          </Route>
          <Route path='/guia'>
            <GuiaDeUso />
          </Route>
          <Route path='/gaia-landpage'>
            <GAIA />
          </Route>
          <Route path='/guia-marketplace'>
            <GuiaMarketplace />
          </Route>
          <Route path='/subscribe'>
            <ProtectedRoute>
              <Subscribe />
            </ProtectedRoute>
          </Route>
          <Route path='/subscription-required'>
            <ProtectedRoute>
              <SubscriptionRequired />
            </ProtectedRoute>
          </Route>
          <Route path='/in-app-onboarding'>
            <ProtectedRoute>
              <InAppOnboarding />
            </ProtectedRoute>
          </Route>
          <Route path='/'>
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          </Route>
          <Route path='/vehiculos'>
            <ProtectedRoute>
              <Vehiculos />
            </ProtectedRoute>
          </Route>
          <Route path='/vehiculos/agregar'>
            <ProtectedRoute>
              <AgregarVehiculo />
            </ProtectedRoute>
          </Route>
          <Route path='/vehiculos/editar/:id'>
            <ProtectedRoute>
              <EditarVehiculo />
            </ProtectedRoute>
          </Route>
          <Route path='/vehiculos/:id'>
            <ProtectedRoute>
              <VehiculoDetalle />
            </ProtectedRoute>
          </Route>
          <Route path='/clientes'>
            <ProtectedRoute>
              <Clientes />
            </ProtectedRoute>
          </Route>
          <Route path='/marketing'>
            <ProtectedRoute>
              <Marketing />
            </ProtectedRoute>
          </Route>
          <Route path='/leads'>
            <ProtectedRoute>
              <Leads />
            </ProtectedRoute>
          </Route>
          <Route path='/financiamiento'>
            <ProtectedRoute>
              <Financiamiento />
            </ProtectedRoute>
          </Route>
          <Route path='/financiamiento/:id'>
            <ProtectedRoute>
              <FinanciamientoDetalle />
            </ProtectedRoute>
          </Route>
          <Route path='/chats'>
            <ProtectedRoute>
              <Chats />
            </ProtectedRoute>
          </Route>
          <Route path='/builder'>
            <ProtectedRoute>
              <Builder2 />
            </ProtectedRoute>
          </Route>
          <Route path='/personas'>
            <ProtectedRoute>
              <Personas />
            </ProtectedRoute>
          </Route>
          <Route path='/equipo'>
            <ProtectedRoute>
              <Equipo />
            </ProtectedRoute>
          </Route>
          <Route path='/tasador'>
            <ProtectedRoute>
              <Tasador />
            </ProtectedRoute>
          </Route>
          <Route path='/ventas'>
            <ProtectedRoute>
              <Ventas />
            </ProtectedRoute>
          </Route>
          <Route path='/configuracion'>
            <ProtectedRoute>
              <Configuracion />
            </ProtectedRoute>
          </Route>
          <Route path='/novedades'>
            <ProtectedRoute>
              <Updates />
            </ProtectedRoute>
          </Route>
          <Route path='/novedades/:slug'>
            <ProtectedRoute>
              <UpdateDetail />
            </ProtectedRoute>
          </Route>
          <Route path='/configuracion/novedades'>
            <ProtectedRoute>
              <UpdatesManagement />
            </ProtectedRoute>
          </Route>
          <Route path='/configuracion/novedades/crear'>
            <ProtectedRoute>
              <UpdateEditor />
            </ProtectedRoute>
          </Route>
          <Route path='/configuracion/novedades/editar/:id'>
            <ProtectedRoute>
              <UpdateEditor />
            </ProtectedRoute>
          </Route>
          <Route path='/instagram'>
            <ProtectedRoute>
              <Instagram />
            </ProtectedRoute>
          </Route>
          <Route path='/mercadolibre'>
            <ProtectedRoute>
              <MercadolibrePage />
            </ProtectedRoute>
          </Route>
          <Route path='/facebook-marketplace'>
            <ProtectedRoute>
              <FacebookMarketplacePage />
            </ProtectedRoute>
          </Route>
          <Route path='/chileautos'>
            <ProtectedRoute>
              <ChileautosPage />
            </ProtectedRoute>
          </Route>
          <Route path='/instagram/messages'>
            <ProtectedRoute>
              <InstagramMessages />
            </ProtectedRoute>
          </Route>
          <Route path='/projection'>
            <ProtectedRoute>
              <Projection />
            </ProtectedRoute>
          </Route>
          <Route path='/agendamientos'>
            <Redirect to='/calendario' />
          </Route>
          <Route path='/documentos'>
            <ProtectedRoute>
              <Documentos />
            </ProtectedRoute>
          </Route>
          <Route path='/asistente'>
            <ProtectedRoute>
              <Asistente />
            </ProtectedRoute>
          </Route>
          <Route path='/gaia'>
            <ProtectedRoute>
              <GaiaCanvas />
            </ProtectedRoute>
          </Route>
          <Route path='/solicitudes'>
            <ProtectedRoute>
              <Solicitudes />
            </ProtectedRoute>
          </Route>
          <Route path='/tareas'>
            <ProtectedRoute>
              <Tareas />
            </ProtectedRoute>
          </Route>
          <Route path='/calendario'>
            <ProtectedRoute>
              <Calendario />
            </ProtectedRoute>
          </Route>
          <Route path='/alertas-inteligentes'>
            <ProtectedRoute>
              <AlertasInteligentes />
            </ProtectedRoute>
          </Route>
          <Route path='/:rest*'>
            <NotFound />
          </Route>

        </Switch>
        <Toaster />
        <SonnerToaster />
        <MeliCloseOnSoldDialog />
      </QueryClientProvider>
      </AIChatProvider>
    </SidebarProvider>
    </PageLoadingProvider>
  </AuthProvider>
  </ErrorBoundary>
);

function App() {
  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;
