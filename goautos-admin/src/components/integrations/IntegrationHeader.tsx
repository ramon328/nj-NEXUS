import { Button } from "@/components/ui/button";
import { LucideIcon, PlusCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type IntegrationHeaderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonText?: string;
  onConnect?: () => void;
  isProcessing?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
};

export function IntegrationHeader({
  title,
  description,
  icon: Icon,
  buttonText,
  onConnect,
  isProcessing = false,
  gradientFrom = "from-blue-600",
  gradientTo = "to-indigo-600",
}: IntegrationHeaderProps) {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      {buttonText && onConnect && (
        <Button
          className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white hover:opacity-90 transition-colors`}
          onClick={onConnect}
          disabled={isProcessing}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {isProcessing ? t('actions.processing') : buttonText}
        </Button>
      )}
    </div>
  );
}
