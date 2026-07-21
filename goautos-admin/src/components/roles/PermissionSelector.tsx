import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  PermissionCode,
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
} from '@/types/permissions';

// Dependencias: si seleccionas la key, automáticamente se seleccionan los values
const PERMISSION_DEPENDENCIES: Partial<Record<PermissionCode, PermissionCode[]>> = {
  // Leads: gestionar requiere ver
  [PermissionCode.LEADS_MANAGE]: [PermissionCode.LEADS_VIEW],

  // Clientes: crear/editar requiere ver
  [PermissionCode.CLIENTS_CREATE]: [PermissionCode.CLIENTS_VIEW],
  [PermissionCode.CLIENTS_EDIT]: [PermissionCode.CLIENTS_VIEW],

  // Ventas: crear/editar requiere ver
  [PermissionCode.SALES_CREATE]: [PermissionCode.SALES_VIEW],
  [PermissionCode.SALES_EDIT]: [PermissionCode.SALES_VIEW],

  // Vehículos: crear/editar/eliminar requiere ver
  [PermissionCode.VEHICLES_CREATE]: [PermissionCode.VEHICLES_VIEW],
  [PermissionCode.VEHICLES_EDIT]: [PermissionCode.VEHICLES_VIEW],
  [PermissionCode.VEHICLES_DELETE]: [PermissionCode.VEHICLES_VIEW],

  // Vehículos: ver precio de compra / resumen financiero requiere ver vehículos
  [PermissionCode.VEHICLES_VIEW_PURCHASE_PRICE]: [PermissionCode.VEHICLES_VIEW],
  [PermissionCode.VEHICLES_VIEW_FINANCIAL_SUMMARY]: [PermissionCode.VEHICLES_VIEW],

  // Documentos: crear/eliminar requiere ver
  [PermissionCode.DOCUMENTS_CREATE]: [PermissionCode.DOCUMENTS_VIEW],
  [PermissionCode.DOCUMENTS_DELETE]: [PermissionCode.DOCUMENTS_VIEW],

  // Configuración: editar requiere ver
  [PermissionCode.CONFIGURATION_EDIT]: [PermissionCode.CONFIGURATION_VIEW],

  // Equipo: gestionar requiere ver
  [PermissionCode.TEAM_MANAGE]: [PermissionCode.TEAM_VIEW],

  // Roles: gestionar requiere ver equipo
  [PermissionCode.ROLES_MANAGE]: [PermissionCode.TEAM_VIEW],

  // Notificaciones: crear requiere ver
  [PermissionCode.NOTIFICATIONS_CREATE]: [PermissionCode.NOTIFICATIONS_VIEW],

  // Solicitudes de vehiculos: crear/gestionar requiere ver
  [PermissionCode.VEHICLE_REQUESTS_CREATE]: [PermissionCode.VEHICLE_REQUESTS_VIEW],
  [PermissionCode.VEHICLE_REQUESTS_MANAGE]: [PermissionCode.VEHICLE_REQUESTS_VIEW],

  // Dashboard: seller y completo requieren básico
  [PermissionCode.DASHBOARD_VIEW_SELLER]: [PermissionCode.DASHBOARD_VIEW],
  [PermissionCode.DASHBOARD_VIEW_FULL]: [PermissionCode.DASHBOARD_VIEW],

  // Dashboard tabs: requieren dashboard completo
  [PermissionCode.DASHBOARD_TAB_COMERCIAL]: [PermissionCode.DASHBOARD_VIEW_FULL],
  [PermissionCode.DASHBOARD_TAB_INVENTARIO]: [PermissionCode.DASHBOARD_VIEW_FULL],
  [PermissionCode.DASHBOARD_TAB_WEB]: [PermissionCode.DASHBOARD_VIEW_FULL],
  [PermissionCode.DASHBOARD_TAB_VENDEDORES]: [PermissionCode.DASHBOARD_VIEW_FULL],

  // Tareas: aprobar requiere ver y gestionar
  [PermissionCode.TASKS_APPROVE]: [PermissionCode.TASKS_VIEW, PermissionCode.TASKS_MANAGE],

  // Dashboard widgets comercial: requieren pestaña comercial
  [PermissionCode.DASHBOARD_COMERCIAL_VENTAS]: [PermissionCode.DASHBOARD_TAB_COMERCIAL],
  [PermissionCode.DASHBOARD_COMERCIAL_GASTOS]: [PermissionCode.DASHBOARD_TAB_COMERCIAL],
  [PermissionCode.DASHBOARD_COMERCIAL_MARGEN]: [PermissionCode.DASHBOARD_TAB_COMERCIAL],
  [PermissionCode.DASHBOARD_COMERCIAL_INVENTARIO]: [PermissionCode.DASHBOARD_TAB_COMERCIAL],
  [PermissionCode.DASHBOARD_COMERCIAL_RENDIMIENTO]: [PermissionCode.DASHBOARD_TAB_COMERCIAL],
  [PermissionCode.DASHBOARD_COMERCIAL_ALERTAS]: [PermissionCode.DASHBOARD_TAB_COMERCIAL],
  [PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_VENTAS]: [PermissionCode.DASHBOARD_TAB_COMERCIAL],
  [PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_COSTOS]: [PermissionCode.DASHBOARD_TAB_COMERCIAL],
};

// Calcula qué permisos dependen de un permiso dado (inverso, recursivo)
const getPermissionsDependingOn = (permission: PermissionCode): PermissionCode[] => {
  const result: PermissionCode[] = [];
  const visited = new Set<PermissionCode>();

  const collect = (perm: PermissionCode) => {
    for (const [dep, deps] of Object.entries(PERMISSION_DEPENDENCIES)) {
      const depCode = dep as PermissionCode;
      if (deps?.includes(perm) && !visited.has(depCode)) {
        visited.add(depCode);
        result.push(depCode);
        collect(depCode); // recurse to find transitive dependents
      }
    }
  };

  collect(permission);
  return result;
};

interface PermissionSelectorProps {
  selectedPermissions: PermissionCode[];
  onChange: (permissions: PermissionCode[]) => void;
  disabled?: boolean;
}

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  selectedPermissions,
  onChange,
  disabled = false,
}) => {
  // Recursively collect all ancestor dependencies for a permission
  const getAllDependencies = (permission: PermissionCode): PermissionCode[] => {
    const result: PermissionCode[] = [];
    const visited = new Set<PermissionCode>();

    const collect = (perm: PermissionCode) => {
      const deps = PERMISSION_DEPENDENCIES[perm] || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          visited.add(dep);
          result.push(dep);
          collect(dep);
        }
      }
    };

    collect(permission);
    return result;
  };

  const handlePermissionToggle = (permission: PermissionCode, checked: boolean) => {
    let newPermissions = [...selectedPermissions];

    if (checked) {
      // Agregar el permiso
      if (!newPermissions.includes(permission)) {
        newPermissions.push(permission);
      }

      // Agregar dependencias recursivamente (toda la cadena ancestral)
      const allDeps = getAllDependencies(permission);
      allDeps.forEach((dep) => {
        if (!newPermissions.includes(dep)) {
          newPermissions.push(dep);
        }
      });
    } else {
      // Al desmarcar, también desmarcar los que dependen de este
      const dependents = getPermissionsDependingOn(permission);
      const toRemove = [permission, ...dependents.filter(d => selectedPermissions.includes(d))];
      newPermissions = newPermissions.filter((p) => !toRemove.includes(p));
    }

    onChange(newPermissions);
  };

  // Verifica si un permiso está bloqueado porque otro lo requiere
  const isPermissionLocked = (permission: PermissionCode): boolean => {
    const dependents = getPermissionsDependingOn(permission);
    return dependents.some((dep) => selectedPermissions.includes(dep));
  };

  const handleCategoryToggle = (permissions: PermissionCode[], checked: boolean) => {
    if (checked) {
      // Agregar todos los permisos de la categoria + sus dependencias ancestrales
      const newPermissions = [...selectedPermissions];
      permissions.forEach((p) => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p);
        }
        // Resolver dependencias recursivamente para cada permiso
        const deps = getAllDependencies(p);
        deps.forEach((dep) => {
          if (!newPermissions.includes(dep)) {
            newPermissions.push(dep);
          }
        });
      });
      onChange(newPermissions);
    } else {
      // Quitar todos los permisos de la categoria + sus dependientes transitivos
      const toRemove = new Set<PermissionCode>(permissions);
      permissions.forEach((p) => {
        const dependents = getPermissionsDependingOn(p);
        dependents.forEach((d) => toRemove.add(d));
      });
      onChange(selectedPermissions.filter((p) => !toRemove.has(p)));
    }
  };

  const isCategoryFullySelected = (permissions: PermissionCode[]) => {
    return permissions.every((p) => selectedPermissions.includes(p));
  };

  const isCategoryPartiallySelected = (permissions: PermissionCode[]) => {
    const selected = permissions.filter((p) => selectedPermissions.includes(p));
    return selected.length > 0 && selected.length < permissions.length;
  };

  const handleSelectAll = () => {
    onChange(Object.values(PermissionCode));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Botones de seleccion rapida */}
      <div className="flex gap-2 pb-2 border-b">
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          Seleccionar todos
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={handleDeselectAll}
          disabled={disabled}
          className="text-xs text-gray-500 hover:underline disabled:opacity-50"
        >
          Deseleccionar todos
        </button>
      </div>

      {/* Categorias de permisos */}
      <div className="space-y-6">
        {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
          const isFullySelected = isCategoryFullySelected(category.permissions);
          const isPartiallySelected = isCategoryPartiallySelected(category.permissions);

          return (
            <div key={categoryKey} className="space-y-2">
              {/* Header de categoria con checkbox */}
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <Checkbox
                  id={`category-${categoryKey}`}
                  checked={isFullySelected}
                  // @ts-ignore - indeterminate is valid but not in types
                  data-state={isPartiallySelected ? 'indeterminate' : isFullySelected ? 'checked' : 'unchecked'}
                  onCheckedChange={(checked) =>
                    handleCategoryToggle(category.permissions, checked as boolean)
                  }
                  disabled={disabled}
                  className="data-[state=indeterminate]:bg-primary/50"
                />
                <Label
                  htmlFor={`category-${categoryKey}`}
                  className="text-sm font-semibold text-gray-700 cursor-pointer"
                >
                  {category.label}
                </Label>
                <span className="text-xs text-gray-400 ml-auto">
                  {category.permissions.filter((p) => selectedPermissions.includes(p)).length}/
                  {category.permissions.length}
                </span>
              </div>

              {/* Permisos de la categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                {category.permissions.map((permission) => {
                  const isLocked = isPermissionLocked(permission);
                  const isSelected = selectedPermissions.includes(permission);

                  return (
                    <div key={permission} className="flex items-center gap-2">
                      <Checkbox
                        id={permission}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handlePermissionToggle(permission, checked as boolean)
                        }
                        disabled={disabled || isLocked}
                      />
                      <Label
                        htmlFor={permission}
                        className={`text-sm cursor-pointer ${
                          isLocked
                            ? 'text-gray-400'
                            : 'text-gray-600'
                        }`}
                        title={isLocked ? 'Requerido por otro permiso seleccionado' : undefined}
                      >
                        {PERMISSION_LABELS[permission]}
                        {isLocked && (
                          <span className="text-xs text-blue-500 ml-1">(requerido)</span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionSelector;
