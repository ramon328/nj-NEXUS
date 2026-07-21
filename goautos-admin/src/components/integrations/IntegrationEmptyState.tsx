import { Button } from "@/components/ui/button";
import { LucideIcon, Shield } from "lucide-react";

type IntegrationEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  buttonText: string;
  onConnect: () => void;
  isProcessing?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
};

export function IntegrationEmptyState({
  icon: Icon,
  title,
  description,
  buttonText,
  onConnect,
  isProcessing = false,
  gradientFrom = "from-blue-600",
  gradientTo = "to-indigo-600",
}: IntegrationEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
      <div
        className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center`}
      >
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div className="text-center">
        <h3 className="text-xl font-medium mb-2">{title}</h3>
        {description && (
          <p className="text-muted-foreground mb-4">{description}</p>
        )}
        <Button
          onClick={onConnect}
          className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white hover:opacity-90 transition-all duration-200`}
          size="lg"
          disabled={isProcessing}
        >
          <Icon className="w-5 h-5 mr-2" />
          {isProcessing ? "Procesando..." : buttonText}
        </Button>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-3">
          <Shield className="w-3 h-3" />
          <span>Al conectar aceptas nuestra</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
            Política de Privacidad
          </a>
        </div>
      </div>
    </div>
  );
}
