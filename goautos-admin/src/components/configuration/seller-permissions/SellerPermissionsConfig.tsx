import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const SellerPermissionsConfig = () => {
  const { client } = useAuth();
  const { t } = useTranslation('common');
  const [showAllVehicles, setShowAllVehicles] = useState(client?.sellers_see_all_vehicles || false);
  const [showAllLeads, setShowAllLeads] = useState(client?.sellers_see_all_leads ?? true);
  const [canClaimLeads, setCanClaimLeads] = useState(client?.sellers_can_claim_leads || false);
  const [leadRules, setLeadRules] = useState(() => ({
    nag_enabled: false,
    nag_hours: 48,
    release_enabled: false,
    release_hours: 72,
    active_since: null as string | null,
    ...((client?.lead_rules as Record<string, unknown>) || {}),
  }));
  // Inputs editables de horas (se guardan al salir del campo / Enter). String para
  // permitir edición libre; se parsean y clampean al guardar.
  const [nagHoursInput, setNagHoursInput] = useState(String(leadRules.nag_hours ?? 48));
  const [releaseHoursInput, setReleaseHoursInput] = useState(String(leadRules.release_hours ?? 72));
  const [requireSaleApproval, setRequireSaleApproval] = useState(client?.require_sale_approval || false);
  const [isLoading, setIsLoading] = useState(false);

  // Límites de las horas configurables: mínimo 1h, máximo 1 año.
  const MIN_HOURS = 1;
  const MAX_HOURS = 8760;

  const handleToggleChange = async (checked: boolean) => {
    if (!client?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ sellers_see_all_vehicles: checked })
        .eq('id', client.id);

      if (error) throw error;

      setShowAllVehicles(checked);
      toast.success(t('configuration.sellerPermissions.updated'));
    } catch (error) {
      console.error('Error updating seller permissions:', error);
      toast.error(t('configuration.sellerPermissions.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadsToggleChange = async (checked: boolean) => {
    if (!client?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ sellers_see_all_leads: checked })
        .eq('id', client.id);

      if (error) throw error;

      setShowAllLeads(checked);
      toast.success(t('configuration.sellerPermissions.updated'));
    } catch (error) {
      console.error('Error updating seller leads permission:', error);
      toast.error(t('configuration.sellerPermissions.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimLeadsToggle = async (checked: boolean) => {
    if (!client?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ sellers_can_claim_leads: checked })
        .eq('id', client.id);

      if (error) throw error;

      setCanClaimLeads(checked);
      toast.success(t('configuration.sellerPermissions.updated'));
    } catch (error) {
      console.error('Error updating seller claim leads permission:', error);
      toast.error(t('configuration.sellerPermissions.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Reglas de seguimiento (T3 aviso + T5 liberación). Al activar por PRIMERA vez se
  // fija active_since=ahora: las reglas solo aplican a leads creados desde ese momento
  // (cutoff — evita avalancha de avisos/liberaciones sobre el backlog histórico).
  const updateLeadRules = async (patch: Partial<typeof leadRules>) => {
    if (!client?.id) return;
    setIsLoading(true);
    try {
      const next = { ...leadRules, ...patch };
      if ((next.nag_enabled || next.release_enabled) && !next.active_since) {
        next.active_since = new Date().toISOString();
      }
      const { error } = await supabase
        .from('clients')
        .update({ lead_rules: next })
        .eq('id', client.id);

      if (error) throw error;

      setLeadRules(next);
      toast.success(t('configuration.sellerPermissions.updated'));
    } catch (error) {
      console.error('Error updating lead rules:', error);
      toast.error(t('configuration.sellerPermissions.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Guarda las horas del aviso (nag) al salir del campo. Clampa a [1, 8760] y
  // restaura el valor guardado si el input quedó vacío/ inválido. No-op si no cambió.
  const commitNagHours = async () => {
    const parsed = parseInt(nagHoursInput, 10);
    const current = leadRules.nag_hours ?? 48;
    const clamped = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, MIN_HOURS), MAX_HOURS)
      : current;
    setNagHoursInput(String(clamped));
    if (clamped === current) return;
    // Mantener el invariante "liberar nunca antes de avisar": si subir el aviso
    // dejó la liberación por debajo del nuevo valor, subimos también la liberación
    // en el MISMO guardado (si no, quedaría release < nag silenciosamente).
    const patch: Partial<typeof leadRules> = { nag_hours: clamped };
    if ((leadRules.release_hours ?? 72) < clamped) {
      patch.release_hours = clamped;
      setReleaseHoursInput(String(clamped));
    }
    await updateLeadRules(patch);
  };

  // Guarda las horas de liberación. Además del clamp general, no permite liberar
  // ANTES del aviso (la liberación requiere haber avisado primero): se sube al
  // valor del aviso si el admin pone un número menor.
  const commitReleaseHours = async () => {
    const parsed = parseInt(releaseHoursInput, 10);
    const current = leadRules.release_hours ?? 72;
    const floor = leadRules.nag_hours ?? 48;
    let clamped = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, MIN_HOURS), MAX_HOURS)
      : current;
    if (clamped < floor) {
      clamped = floor;
      toast.info(`La liberación no puede ser antes del aviso (${floor}h). Se ajustó a ${floor}h.`);
    }
    setReleaseHoursInput(String(clamped));
    if (clamped === current) return;
    await updateLeadRules({ release_hours: clamped });
  };

  const handleSaleApprovalToggle = async (checked: boolean) => {
    if (!client?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ require_sale_approval: checked })
        .eq('id', client.id);

      if (error) throw error;

      setRequireSaleApproval(checked);
      toast.success(t('configuration.sellerPermissions.updated'));
    } catch (error) {
      console.error('Error updating sale approval setting:', error);
      toast.error(t('configuration.sellerPermissions.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[13px] font-medium text-slate-700">{t('configuration.sellerPermissions.viewTitle')}</p>
            <p className="text-[13px] text-slate-500">
              {t('configuration.sellerPermissions.viewDescription')}
            </p>
          </div>
          <Switch
            checked={showAllVehicles}
            onCheckedChange={handleToggleChange}
            disabled={isLoading}
          />
        </div>
        <div className="border-t border-slate-100" />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[13px] font-medium text-slate-700">Ver todos los leads</p>
            <p className="text-[13px] text-slate-500">
              Cuando está activado, los vendedores ven todos los leads de la automotora. Si está desactivado, cada vendedor ve solo los leads asignados a él (los que él ingresa o los que un admin le asigna).
            </p>
          </div>
          <Switch
            checked={showAllLeads}
            onCheckedChange={handleLeadsToggleChange}
            disabled={isLoading}
          />
        </div>

        {/* Sub-opción: solo aplica cuando "Ver todos los leads" está desactivado */}
        {!showAllLeads && (
          <div className="flex items-center justify-between pl-4 border-l-2 border-slate-100">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-slate-700">Permitir tomar leads sin asignar (pool)</p>
              <p className="text-[13px] text-slate-500">
                Cuando está activado, además de sus leads asignados los vendedores ven los leads sin asignar y pueden "tomarlos" para trabajarlos (también pueden soltarlos para devolverlos al pool). No ven los leads asignados a otros vendedores. Si está desactivado, cada vendedor ve solo los leads asignados a él.
              </p>
            </div>
            <Switch
              checked={canClaimLeads}
              onCheckedChange={handleClaimLeadsToggle}
              disabled={isLoading}
            />
          </div>
        )}
        <div className="border-t border-slate-100" />

        {/* T3: aviso por leads sin seguimiento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium text-slate-700">Avisar por leads sin seguimiento</p>
              <p className="text-[13px] text-slate-500">
                Cuando está activado, una vez al día se notifica por los leads sin actividad por el tiempo que configures abajo (al vendedor dueño; los leads sin asignar se avisan al admin). Solo aplica a leads recibidos desde que activas esta opción.
              </p>
            </div>
            <Switch
              checked={leadRules.nag_enabled}
              onCheckedChange={(checked) => updateLeadRules({ nag_enabled: checked })}
              disabled={isLoading}
            />
          </div>

          {/* Horas configurables del aviso (default 48h) */}
          {leadRules.nag_enabled && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-slate-100">
              <p className="text-[13px] text-slate-600">Avisar cuando un lead lleve sin actividad</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={MIN_HOURS}
                  max={MAX_HOURS}
                  value={nagHoursInput}
                  onChange={(e) => setNagHoursInput(e.target.value)}
                  onBlur={commitNagHours}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  disabled={isLoading}
                  className="w-20 h-8 text-right"
                />
                <span className="text-[13px] text-slate-500">horas</span>
              </div>
            </div>
          )}
        </div>

        {/* T5: liberación automática (solo visible si el aviso está activo) */}
        {leadRules.nag_enabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-4 border-l-2 border-slate-100">
              <div className="space-y-0.5">
                <p className="text-[13px] font-medium text-slate-700">Liberar automáticamente los leads botados</p>
                <p className="text-[13px] text-slate-500">
                  Cuando está activado, si un lead avisado sigue sin seguimiento por el tiempo que configures abajo, se libera: vuelve a "Pendiente" y se le quita el vendedor asignado (queda disponible para que otro lo tome).
                </p>
              </div>
              <Switch
                checked={leadRules.release_enabled}
                onCheckedChange={(checked) => updateLeadRules({ release_enabled: checked })}
                disabled={isLoading}
              />
            </div>

            {/* Horas configurables de la liberación (default 72h; no puede ser antes del aviso) */}
            {leadRules.release_enabled && (
              <div className="flex items-center justify-between pl-8 border-l-2 border-slate-100">
                <p className="text-[13px] text-slate-600">Liberar cuando un lead avisado lleve sin actividad</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={MIN_HOURS}
                    max={MAX_HOURS}
                    value={releaseHoursInput}
                    onChange={(e) => setReleaseHoursInput(e.target.value)}
                    onBlur={commitReleaseHours}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    disabled={isLoading}
                    className="w-20 h-8 text-right"
                  />
                  <span className="text-[13px] text-slate-500">horas</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-slate-100" />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[13px] font-medium text-slate-700">Aprobación de ventas por admin</p>
            <p className="text-[13px] text-slate-500">
              Cuando está activado, las ventas registradas por vendedores quedan pendientes hasta que un administrador las apruebe. Si está desactivado, todas las ventas se aprueban automáticamente.
            </p>
          </div>
          <Switch
            checked={requireSaleApproval}
            onCheckedChange={handleSaleApprovalToggle}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};
