import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import UserDialog from '@/components/users/ClientUserDialog';
import LoadingState from '@/components/users/LoadingState';
import AccessDeniedState from '@/components/users/AccessDeniedState';
import { User } from '@/types/user';
import { useUsers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import GenericRoleTab from '@/components/users/GenericRoleTab';
import SellersTab from '@/components/users/SellersTab';
import RolesTab from '@/components/roles/RolesTab';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import { useTranslation } from 'react-i18next';
import { PermissionCode } from '@/types/permissions';
import { SellerPermissionsConfig } from '@/components/configuration/seller-permissions/SellerPermissionsConfig';
import { Button } from '@/components/ui/button';
import { UserPlus, Plus, Shield, UserCog } from 'lucide-react';

const pageSize = 10;

export default function EquipoContent() {
  const { userRole, clientId } = useAuth();
  const { t } = useTranslation('team');
  const { hasPermission, isSuperadmin } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('admins');
  const [selectedSeller, setSelectedSeller] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);

  const canManageRoles = hasPermission(PermissionCode.ROLES_MANAGE);

  const { users, loading: usersLoading, handleDeleteUser, fetchUsers } = useUsers(
    userRole,
    clientId?.toString()
  );

  const { roles, loading: rolesLoading } = useRoles();

  // Crear tabs dinámicos basados en roles — one tab per role, users filtered by user_roles membership
  const dynamicTabs = useMemo(() => {
    const tabs: { id: string; label: string; roleId: number; rolValue: string; isSeller: boolean }[] = [];

    // System roles first
    const adminRole = roles.find((r) => r.is_system_role && ['admin', 'administrador'].includes(r.name.toLowerCase()));
    const sellerRole = roles.find((r) => r.is_system_role && ['seller', 'vendedor'].includes(r.name.toLowerCase()));

    if (adminRole) {
      tabs.push({ id: 'admins', label: t('tabs.admins'), roleId: adminRole.id, rolValue: 'admin', isSeller: false });
    } else {
      // Fallback tab for legacy admin users without role assignment
      tabs.push({ id: 'admins', label: t('tabs.admins'), roleId: 0, rolValue: 'admin', isSeller: false });
    }
    if (sellerRole) {
      tabs.push({ id: 'sellers', label: t('tabs.sellers'), roleId: sellerRole.id, rolValue: 'seller', isSeller: true });
    } else {
      tabs.push({ id: 'sellers', label: t('tabs.sellers'), roleId: 0, rolValue: 'seller', isSeller: true });
    }

    // Custom roles (including sub-roles)
    roles
      .filter((role) => !role.is_system_role)
      .forEach((role) => {
        const rolValue = role.name.toLowerCase();
        if (['admin', 'administrador', 'seller', 'vendedor'].includes(rolValue)) return;

        // Check if this is a sub-role of seller
        const isSellerSubRole = sellerRole && role.parent_role_id === sellerRole.id;

        tabs.push({
          id: `role-${role.id}`,
          label: role.name,
          roleId: role.id,
          rolValue: rolValue,
          isSeller: !!isSellerSubRole,
        });
      });

    return tabs;
  }, [roles, t]);

  // Solo las pestañas de roles viven en el strip scrolleable. "Permisos" y
  // "Gestionar roles" pasaron a ser botones fijos a la derecha (antes eran las
  // últimas pestañas y quedaban tapadas fuera de pantalla — feedback Magdalena).
  const allTabs = useMemo(() => {
    return dynamicTabs.map((tab) => ({ id: tab.id, label: tab.label }));
  }, [dynamicTabs]);

  useEffect(() => {
    if (allTabs.length > 0) {
      const tabExists = allTabs.some((tab) => tab.id === selectedTab);
      // 'permissions'/'roles' ya no están en allTabs (son botones): no resetear.
      if (!tabExists && selectedTab !== 'permissions' && selectedTab !== 'roles') {
        setSelectedTab(allTabs[0].id);
      }
    }
  }, [allTabs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab]);

  // Animated underline indicator
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const idx = allTabs.findIndex((tab) => tab.id === selectedTab);
    const el = idx >= 0 ? tabRefs.current[idx] : null;
    if (el) {
      setIndicatorStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    } else {
      // En "Permisos"/"Gestionar roles" (botones fijos) no hay pestaña activa.
      setIndicatorStyle({ left: 0, width: 0 });
    }
  }, [selectedTab, allTabs]);

  const filteredUsers = useMemo(() => {
    const currentTab = dynamicTabs.find((tab) => tab.id === selectedTab);
    if (!currentTab) return [];

    return users.filter((user) => {
      // If tab has a real roleId, check user_roles membership
      if (currentTab.roleId > 0 && user.role_ids && user.role_ids.length > 0) {
        return user.role_ids.includes(currentTab.roleId);
      }
      // Fallback: match by legacy rol string
      if (currentTab.rolValue === 'admin') {
        return user.rol === 'admin' || user.rol === 'administrador';
      }
      if (currentTab.rolValue === 'seller') {
        return user.rol === 'seller' || user.rol === 'vendedor';
      }
      return user.rol === currentTab.rolValue;
    });
  }, [users, dynamicTabs, selectedTab]);

  const totalCount = filteredUsers.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleUserSaved = () => {
    fetchUsers();
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleSelectSeller = (seller: User) => {
    setSelectedSeller(seller);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  const handleDeleteWithSellerCheck = async (id: number) => {
    await handleDeleteUser(id);

    if (selectedSeller && selectedSeller.id === id) {
      setSelectedSeller(null);
      setDrawerOpen(false);
    }
  };

  const isLoading = usersLoading || rolesLoading;
  const isRolesTab = selectedTab === 'roles';
  const isPermissionsTab = selectedTab === 'permissions';
  const isDynamicTab = dynamicTabs.some((tab) => tab.id === selectedTab);
  const showAddUserButton = isDynamicTab && !isLoading;
  const showCreateRoleButton = isRolesTab && (isSuperadmin || canManageRoles) && !isLoading;

  const renderTabContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (!isSuperadmin && !hasPermission(PermissionCode.TEAM_VIEW)) {
      return <AccessDeniedState />;
    }

    if (isPermissionsTab) {
      return (
        <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Ajustes de vendedores</h2>
            <p className="text-[13px] text-slate-500">
              Reglas de cómo trabajan los vendedores: qué vehículos y leads ven,
              pool de leads y aprobación de venta. No confundir con "Gestionar
              roles" (roles y permisos del sistema).
            </p>
          </div>
          <SellerPermissionsConfig />
        </div>
      );
    }

    if (isRolesTab && (isSuperadmin || canManageRoles)) {
      return <RolesTab createDialogOpen={createRoleDialogOpen} onCreateDialogOpenChange={setCreateRoleDialogOpen} />;
    }

    const currentTab = dynamicTabs.find((tab) => tab.id === selectedTab);
    if (!currentTab) return null;

    if (currentTab.isSeller) {
      return (
        <SellersTab
          users={paginatedUsers}
          onCreateUser={handleCreateUser}
          onSelectSeller={handleSelectSeller}
          selectedSeller={selectedSeller}
          drawerOpen={drawerOpen}
          onDrawerOpenChange={setDrawerOpen}
          onCloseDrawer={handleCloseDrawer}
          onEditSeller={handleEditUser}
          onDeleteSeller={(seller) => handleDeleteWithSellerCheck(seller.id)}
          onCommissionsSaved={fetchUsers}
        />
      );
    }

    return (
      <GenericRoleTab
        users={paginatedUsers}
        onEdit={handleEditUser}
        onDelete={handleDeleteWithSellerCheck}
        onCreateUser={handleCreateUser}
        roleName={currentTab.label}
      />
    );
  };

  const showPagination =
    !isLoading &&
    !isRolesTab &&
    !isPermissionsTab &&
    (isSuperadmin || hasPermission(PermissionCode.TEAM_VIEW)) &&
    totalCount > 0;

  return (
    <>
      <div className="flex flex-col min-h-full bg-white">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-0 flex items-end justify-between gap-4">
            <div
              className="relative flex items-end overflow-x-auto min-w-0"
              style={{ scrollbarWidth: 'none' }}
            >
              <div
                className="absolute h-[2px] bg-slate-800 rounded-full z-10 transition-all duration-300"
                style={{
                  left: indicatorStyle.left,
                  width: indicatorStyle.width,
                  bottom: 0,
                }}
              />
              {allTabs.map((tab, idx) => {
                const isActive = selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => (tabRefs.current[idx] = el)}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1 text-[13px] sm:text-[14px] font-medium transition-colors duration-200 relative z-20 mb-3 whitespace-nowrap
                      ${isActive ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}
                    `}
                    style={{ background: 'transparent' }}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Acciones fijas a la derecha: nunca quedan tapadas por el scroll de
                las pestañas de roles. Antes "Permisos" y "Gestionar roles" eran las
                últimas pestañas y se cortaban fuera de pantalla (feedback Magdalena:
                no podía llegar a "Gestionar roles"). */}
            <div className='flex items-center gap-2 shrink-0 mb-2'>
              <Button
                variant={isPermissionsTab ? 'default' : 'outline'}
                className='h-9 rounded-xl text-[13px] font-medium'
                onClick={() => setSelectedTab('permissions')}
                title='Ajustes de vendedores'
              >
                <UserCog className='h-4 w-4 sm:mr-2' />
                <span className='hidden sm:inline'>Ajustes</span>
              </Button>
              {(isSuperadmin || canManageRoles) && (
                <Button
                  variant={isRolesTab ? 'default' : 'outline'}
                  className='h-9 rounded-xl text-[13px] font-medium'
                  onClick={() => setSelectedTab('roles')}
                  title='Gestionar roles'
                >
                  <Shield className='h-4 w-4 sm:mr-2' />
                  <span className='hidden sm:inline'>Gestionar roles</span>
                </Button>
              )}
              {showAddUserButton && (
                <Button className='h-9 rounded-xl text-[13px] font-medium' onClick={handleCreateUser}>
                  <UserPlus className='h-4 w-4 mr-2' />
                  {t('actions.addUser')}
                </Button>
              )}
              {showCreateRoleButton && (
                <Button className='h-9 rounded-xl text-[13px] font-medium' onClick={() => setCreateRoleDialogOpen(true)}>
                  <Plus className='h-4 w-4 mr-2' />
                  Crear Rol
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="w-full">
            {renderTabContent()}
          </div>
        </div>

        {/* Pagination */}
        {showPagination && (
          <VehiclesPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            isLoading={isLoading}
            showingText="Mostrando {{start}} - {{end}} de {{total}} usuarios"
          />
        )}
      </div>

      <UserDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleUserSaved}
        user={selectedUser}
        clientId={clientId}
      />
    </>
  );
}
