import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomerSearch } from "@/hooks/marketing/useCustomerSearch";
import { useVehicleMarketingDetails } from "@/hooks/marketing/useVehicleMarketingDetails";
import { AlertTriangle, InfoIcon } from "lucide-react";
import React, { useState } from "react";
import { useLocation } from "wouter";
import CustomersList from "./marketing/CustomersList";
import MarketingStatsCards from "./marketing/MarketingStatsCards";
import PreviewEmailButton from "./marketing/PreviewEmailButton";
import VehicleSummaryCard from "./marketing/VehicleSummaryCard";

interface VehicleMarketingFormProps {
  initialData: any;
  onNext: () => void;
  onPrevious: () => void;
}

const VehicleMarketingForm: React.FC<VehicleMarketingFormProps> = ({
  initialData,
  onNext,
  onPrevious,
}) => {
  const { brandName, modelName, formattedPrice } = useVehicleMarketingDetails(
    initialData.basicInfo
  );
  const [isEmailCampaignEnabled, setIsEmailCampaignEnabled] = useState(false);
  const [showEmailOptions, setShowEmailOptions] = useState<boolean>(true);
  const [location, navigate] = useLocation();

  const {
    customers,
    loading,
    priceRange,
    setPriceRange,
    searchParams,
    searchPotentialCustomers,
    selectedCustomers,
    handleCustomerSelection,
    selectAllCustomers,
    hasCustomerTransactions,
  } = useCustomerSearch(
    initialData.basicInfo?.brand_id,
    initialData.basicInfo?.model_id,
    initialData.basicInfo?.price
  );

  const handleEmailCampaignToggle = (enabled: boolean) => {
    console.log("Email campaign toggled:", enabled);
    setIsEmailCampaignEnabled(enabled);
  };

  const handleEmailOptionSelection = (wantToSendEmails: boolean) => {
    if (wantToSendEmails) {
      setShowEmailOptions(false);
      setIsEmailCampaignEnabled(true);
    } else {
      // Skip to next tab
      onNext();
    }
  };

  // If there are no customer transactions data, show a message
  if (!loading && hasCustomerTransactions === false) {
    return (
      <div className="space-y-6">
        <VehicleSummaryCard
          brandName={brandName}
          modelName={modelName}
          formattedPrice={formattedPrice}
        />

        <Card className="border-amber-200 bg-amber-50 cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-amber-700">
              <p className="font-medium">Base de datos incompleta</p>
              <p className="text-sm">
                Falta subir la base de datos de Autofact para habilitar esta
                sección. Contacte con Go Auto para habilitarla.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={onPrevious}
            className="btn btn-secondary"
          >
            Anterior
          </button>
          <button type="button" onClick={onNext} className="btn btn-primary">
            Siguiente
          </button>
        </div>
      </div>
    );
  }

  if (showEmailOptions) {
    return (
      <div className="space-y-6">
        <VehicleSummaryCard
          brandName={brandName}
          modelName={modelName}
          formattedPrice={formattedPrice}
        />

        <Alert variant="default" className="bg-muted/50">
          <InfoIcon className="h-4 w-4 text-muted-foreground" />
          <AlertTitle>Campañas de Marketing</AlertTitle>
          <AlertDescription>
            ¿Desea enviar correos electrónicos a clientes potenciales sobre este
            vehículo?
          </AlertDescription>
        </Alert>

        <div className="flex justify-center gap-4 mt-6">
          <Button
            onClick={() => handleEmailOptionSelection(true)}
            variant="default"
            className="w-32"
          >
            Sí
          </Button>

          <Button
            onClick={() => handleEmailOptionSelection(false)}
            variant="outline"
            className="w-32"
          >
            No
          </Button>
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={onPrevious}
            className="btn btn-secondary"
          >
            Anterior
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VehicleSummaryCard
          brandName={brandName}
          modelName={modelName}
          formattedPrice={formattedPrice}
        />

        <div className="space-y-4">
          <MarketingStatsCards
            selectedCustomersCount={selectedCustomers.length}
            totalCustomersCount={customers.length}
            isEmailCampaignEnabled={isEmailCampaignEnabled}
            onEmailCampaignToggle={handleEmailCampaignToggle}
            hasSelectedCustomers={selectedCustomers.length > 0}
          />

          <PreviewEmailButton
            brandName={brandName}
            modelName={modelName}
            formattedPrice={formattedPrice}
            mainImage={initialData.media?.mainImage}
            selectedCustomers={selectedCustomers}
            isEmailCampaignEnabled={isEmailCampaignEnabled}
          />
        </div>
      </div>

      <CustomersList
        customers={customers}
        selectedCustomers={selectedCustomers}
        onCustomerSelection={handleCustomerSelection}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        onSearch={searchPotentialCustomers}
        loading={loading}
        searchParams={searchParams}
        onSelectAll={selectAllCustomers}
      />

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={onPrevious}
          className="btn btn-secondary"
        >
          Anterior
        </button>
        <button type="button" onClick={onNext} className="btn btn-primary">
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default VehicleMarketingForm;
