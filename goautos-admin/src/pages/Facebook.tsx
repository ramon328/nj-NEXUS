import DashboardLayout from "@/components/DashboardLayout";
import { IntegrationEmptyState } from "@/components/integrations/IntegrationEmptyState";
import { IntegrationHeader } from "@/components/integrations/IntegrationHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, Facebook as FacebookIcon } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const facebookConfig = {
  gradientFrom: "from-blue-600",
  gradientTo: "to-blue-800",
};

const FacebookPage = () => {
  const { clientId } = useAuth();
  const [location, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

  const handleConnect = () => {
    setIsProcessing(true);
    // Placeholder for Facebook auth - would be implemented with actual API
    setTimeout(() => {
      toast({
        title: "Facebook",
        description: "Esta funcionalidad estará disponible próximamente.",
      });
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <IntegrationHeader
          title="Integración de Facebook"
          description="Conecta tus páginas de Facebook para publicar anuncios y gestionar interacciones"
          icon={FacebookIcon}
          buttonText="Conectar página"
          onConnect={handleConnect}
          isProcessing={isProcessing}
          gradientFrom={facebookConfig.gradientFrom}
          gradientTo={facebookConfig.gradientTo}
        />

        {error && (
          <Alert variant="destructive" className="mt-4 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {connectedAccounts.length === 0 && (
          <IntegrationEmptyState
            icon={FacebookIcon}
            title="No hay páginas de Facebook conectadas"
            description="Conecta tus páginas de Facebook para publicar anuncios automáticamente"
            buttonText="Conectar página de Facebook"
            onConnect={handleConnect}
            isProcessing={isProcessing}
            gradientFrom={facebookConfig.gradientFrom}
            gradientTo={facebookConfig.gradientTo}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default FacebookPage;
