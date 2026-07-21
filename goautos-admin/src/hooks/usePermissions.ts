import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  PermissionCode,
  ROUTE_PERMISSIONS,
  getLegacyRolePermissions,
  SELLER_DEFAULT_PERMISSIONS,
} from '@/types/permissions';

export const usePermissions = () => {
  const { userRole, userPermissions, userRoleData, userRoles } = useAuth();

  // Superadmin bypasses all permission checks
  const isSuperadmin = userRole === 'superadmin';

  // Has custom roles assigned (multi-role or single)
  const hasCustomRoles = (userRoles && userRoles.length > 0) || !!userRoleData;

  // Legacy admin (only when NO custom role is assigned)
  const isAdmin = userRole === 'admin' && !hasCustomRoles;

  // Legacy seller (only when NO custom role is assigned)
  const isSeller = (userRole === 'seller' || userRole === 'vendedor') && !hasCustomRoles;

  // Obtener permisos efectivos
  const effectivePermissions = useMemo(() => {
    if (isSuperadmin) {
      return Object.values(PermissionCode);
    }

    // Multi-role: userPermissions already contains the union of all roles' permissions
    // (merged in useUserProfile.fetchMultiRoles)
    if (hasCustomRoles) {
      return userPermissions && userPermissions.length > 0
        ? userPermissions
        : [];
    }

    // --- Sin rol personalizado: fallback a permisos legacy ---
    if (isAdmin) {
      return Object.values(PermissionCode);
    }

    if (isSeller) {
      return SELLER_DEFAULT_PERMISSIONS;
    }

    return getLegacyRolePermissions(userRole);
  }, [isSuperadmin, isAdmin, isSeller, hasCustomRoles, userPermissions, userRole]);

  // Verificar si tiene un permiso especifico
  const hasPermission = useCallback(
    (permission: PermissionCode): boolean => {
      if (isSuperadmin || isAdmin) return true;
      return effectivePermissions.includes(permission);
    },
    [isSuperadmin, isAdmin, effectivePermissions]
  );

  // Verificar si tiene al menos uno de los permisos
  const hasAnyPermission = useCallback(
    (permissions: PermissionCode[]): boolean => {
      if (isSuperadmin || isAdmin) return true;
      return permissions.some((p) => effectivePermissions.includes(p));
    },
    [isSuperadmin, isAdmin, effectivePermissions]
  );

  // Verificar si tiene todos los permisos
  const hasAllPermissions = useCallback(
    (permissions: PermissionCode[]): boolean => {
      if (isSuperadmin || isAdmin) return true;
      return permissions.every((p) => effectivePermissions.includes(p));
    },
    [isSuperadmin, isAdmin, effectivePermissions]
  );

  // Verificar si puede acceder a una ruta
  const canAccessRoute = useCallback(
    (path: string): boolean => {
      if (isSuperadmin || isAdmin) return true;

      // Rutas que no requieren permisos especificos
      const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/onboarding'];
      if (publicRoutes.some((r) => path.startsWith(r))) {
        return true;
      }

      // Buscar permiso exacto para la ruta
      const exactMatch = ROUTE_PERMISSIONS[path];
      if (exactMatch) {
        return hasPermission(exactMatch);
      }

      // Buscar permiso para ruta base (ej: /vehiculos/123 -> /vehiculos)
      const baseRoutes = Object.keys(ROUTE_PERMISSIONS).sort(
        (a, b) => b.length - a.length
      );
      for (const route of baseRoutes) {
        if (path.startsWith(route + '/') || path === route) {
          return hasPermission(ROUTE_PERMISSIONS[route]);
        }
      }

      // Por defecto permitir acceso a rutas no mapeadas
      return true;
    },
    [isSuperadmin, isAdmin, hasPermission]
  );

  // Obtener permisos faltantes para una ruta
  const getMissingPermission = useCallback(
    (path: string): PermissionCode | null => {
      if (canAccessRoute(path)) return null;

      const exactMatch = ROUTE_PERMISSIONS[path];
      if (exactMatch && !hasPermission(exactMatch)) {
        return exactMatch;
      }

      const baseRoutes = Object.keys(ROUTE_PERMISSIONS).sort(
        (a, b) => b.length - a.length
      );
      for (const route of baseRoutes) {
        if (path.startsWith(route + '/') || path === route) {
          const permission = ROUTE_PERMISSIONS[route];
          if (!hasPermission(permission)) {
            return permission;
          }
        }
      }

      return null;
    },
    [canAccessRoute, hasPermission]
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    getMissingPermission,
    isSuperadmin,
    isAdmin,
    isSeller,
    permissions: effectivePermissions,
  };
};
