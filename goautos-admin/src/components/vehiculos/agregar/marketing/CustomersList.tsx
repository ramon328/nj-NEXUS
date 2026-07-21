import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Loader2, Search } from 'lucide-react';
import type { PotentialCustomer } from '@/hooks/marketing/types';
import { formatPrice } from '@/hooks/marketing/utils/formatters';

interface CustomersListProps {
  customers: PotentialCustomer[];
  selectedCustomers: number[];
  onCustomerSelection: (customerId: number) => void;
  priceRange: number;
  onPriceRangeChange: (value: number) => void;
  onSearch: (criteria: { brand: boolean; model: boolean; price: boolean }) => void;
  loading: boolean;
  searchParams: {
    brand?: string;
    model?: string;
    price?: number;
  };
  onSelectAll: () => void;
}

const CustomersList = ({
  customers,
  selectedCustomers,
  onCustomerSelection,
  priceRange,
  onPriceRangeChange,
  onSearch,
  loading,
  searchParams,
  onSelectAll
}: CustomersListProps) => {
  const [tempPriceRange, setTempPriceRange] = useState(priceRange);
  const [searchCriteria, setSearchCriteria] = useState({
    brand: false,
    model: false,
    price: true
  });

  const handleSliderChange = (value: number[]) => {
    setTempPriceRange(value[0]);
  };

  const handleSearch = () => {
    onPriceRangeChange(tempPriceRange);
    onSearch(searchCriteria);
  };

  useEffect(() => {
    if (customers.length > 0 && selectedCustomers.length === 0) {
      onSelectAll();
    }
  }, [customers, selectedCustomers, onSelectAll]);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Búsqueda de Clientes Potenciales</h3>
        </div>

        <div className="space-y-6 border rounded-lg p-4 bg-muted/10">
          <div>
            <h4 className="text-sm font-medium mb-3">Criterios de búsqueda</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="brand"
                  checked={searchCriteria.brand}
                  onCheckedChange={(checked) => 
                    setSearchCriteria(prev => ({ ...prev, brand: checked === true }))
                  }
                />
                <label htmlFor="brand" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Marca
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="model"
                  checked={searchCriteria.model}
                  onCheckedChange={(checked) => 
                    setSearchCriteria(prev => ({ ...prev, model: checked === true }))
                  }
                />
                <label htmlFor="model" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Modelo
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="price"
                  checked={searchCriteria.price}
                  onCheckedChange={(checked) => 
                    setSearchCriteria(prev => ({ ...prev, price: checked === true }))
                  }
                />
                <label htmlFor="price" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Precio
                </label>
              </div>
            </div>
          </div>

          {searchCriteria.price && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Rango de precio (%)</h4>
              <div className="flex items-center space-x-4">
                <Slider
                  value={[tempPriceRange]}
                  onValueChange={handleSliderChange}
                  min={10}
                  max={50}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{tempPriceRange}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Buscar vehículos con un precio {tempPriceRange}% mayor o menor al vehículo actual
              </p>
            </div>
          )}

          <Button 
            onClick={handleSearch} 
            disabled={loading || !Object.values(searchCriteria).some(Boolean)} 
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Buscar Clientes
          </Button>

          {searchParams.brand && searchParams.model && (
            <p className="text-sm text-muted-foreground">
              Buscando clientes que compraron vehículos similares a{' '}
              <strong>{searchParams.brand} {searchParams.model}</strong>
              {searchParams.price ? ` en un rango de precio similar a ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(searchParams.price)}` : ''}
            </p>
          )}
        </div>

        <div className="divide-y">
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No se encontraron clientes con los criterios actuales.
              Intente ajustar los criterios de búsqueda.
            </p>
          ) : (
            customers.map((customer) => (
              <div key={customer.id} className="py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                    <div className="mt-1">
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full mr-2">
                        Coincidencia: {(customer.similarityScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Última compra: {customer.lastPurchase}
                      </span>
                      {customer.price && (
                        <span className="text-sm text-muted-foreground ml-2">
                          - Precio: {formatPrice(customer.price)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={selectedCustomers.includes(customer.id) ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => onCustomerSelection(customer.id)}
                  >
                    {selectedCustomers.includes(customer.id) ? "Seleccionado" : "Seleccionar"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};

export default CustomersList;
