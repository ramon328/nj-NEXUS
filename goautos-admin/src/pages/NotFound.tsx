import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const NotFound = () => {
  const [location, navigate] = useLocation();

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col items-center justify-center p-6">
        <h1 className="text-5xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-6">Página no encontrada</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-md">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>
        <Button onClick={() => navigate("/")} className="px-6">
          Volver al inicio
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default NotFound;
