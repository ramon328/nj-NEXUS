import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Ajustes tributarios de la automotora. Vive en Configuración → Contabilidad
 * (antes el toggle de IVA estaba mal ubicado dentro del panel de vendedores).
 * `ventas_exentas_iva` es un flag de `clients` que leen los cálculos de margen,
 * comisión y neto — acá solo se togglea.
 */
export const FiscalConfig = () => {
  const { client } = useAuth();
  const [ventasExentasIva, setVentasExentasIva] = useState(
    client?.ventas_exentas_iva || false
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleIvaExemptToggle = async (checked: boolean) => {
    if (!client?.id) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ ventas_exentas_iva: checked })
        .eq('id', client.id);
      if (error) throw error;
      setVentasExentasIva(checked);
      toast.success('Configuración actualizada');
    } catch (error) {
      console.error('Error updating IVA exemption setting:', error);
      toast.error('No se pudo actualizar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Contabilidad</h2>
        <p className="text-[13px] text-slate-500">
          Ajustes tributarios de la automotora.
        </p>
      </div>
      <Card className="rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-slate-700">
                Ventas exentas de IVA (autos usados)
              </p>
              <p className="text-[13px] text-slate-500">
                Actívalo si vendes autos usados (exentos de IVA en Chile). Cuando
                está activado, no se descuenta IVA del margen al calcular la
                comisión y el neto del vendedor. Si está desactivado, se aplica
                IVA 19% sobre el margen.
              </p>
            </div>
            <Switch
              checked={ventasExentasIva}
              onCheckedChange={handleIvaExemptToggle}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalConfig;
