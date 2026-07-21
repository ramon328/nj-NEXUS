import { useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Client } from '@/types/user';
import { User as UserType } from '@/types/user';
import { PermissionCode, Role } from '@/types/permissions';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string>('admin');
  const [userPermissions, setUserPermissions] = useState<PermissionCode[]>([]);
  const [userRoleData, setUserRoleData] = useState<Role | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<number>(0);
  const [client, setClient] = useState<Client | null>(null);
  const [userData, setUserData] = useState<UserType | null>(null);

  return {
    user,
    setUser,
    session,
    setSession,
    userRole,
    setUserRole,
    userPermissions,
    setUserPermissions,
    userRoleData,
    setUserRoleData,
    userRoles,
    setUserRoles,
    isLoading,
    setIsLoading,
    loading,
    setLoading,
    clientId,
    setClientId,
    client,
    setClient,
    userData,
    setUserData,
  };
};
