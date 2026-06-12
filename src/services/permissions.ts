import type { UserData } from '../hooks/useAuth';
import { defaultRoles, type RoleGroup } from './settings';

const MASTER_ADMIN_EMAIL = 'a0938676069@gmail.com';

const emptyPermissions: RoleGroup['permissions'] = {
  manageUsers: false,
  viewAllData: false,
  manageSettings: false,
};

export interface EffectivePermissions {
  manageUsers: boolean;
  viewAllData: boolean;
  manageSettings: boolean;
  accessAdmin: boolean;
  canEditAllLuggage: boolean;
  isSuperAdmin: boolean;
  isLowestRole: boolean;
}

export const isSuperAdminUser = (userData: UserData | null | undefined) => {
  return userData?.email === MASTER_ADMIN_EMAIL || userData?.roleId === 'superadmin';
};

export const isLegacyAdminUser = (userData: UserData | null | undefined) => {
  return isSuperAdminUser(userData) || userData?.roleId === 'admin' || userData?.role === 'admin';
};

export const canPotentiallyAccessAdmin = (userData: UserData | null | undefined) => {
  if (!userData) return false;
  if (isLegacyAdminUser(userData)) return true;
  return Boolean(userData.roleId && userData.roleId !== 'user');
};

export const getEffectivePermissions = (
  userData: UserData | null | undefined,
  roles: RoleGroup[] = defaultRoles,
): EffectivePermissions => {
  if (!userData) {
    return {
      ...emptyPermissions,
      accessAdmin: false,
      canEditAllLuggage: false,
      isSuperAdmin: false,
      isLowestRole: true,
    };
  }

  const isSuperAdmin = isSuperAdminUser(userData);
  const isLegacyAdmin = isLegacyAdminUser(userData);
  const role = roles.find((item) => item.id === userData.roleId);
  const fallbackRole = isLegacyAdmin ? roles.find((item) => item.id === 'admin') : null;
  const requestedPermissions = isSuperAdmin
    ? { manageUsers: true, viewAllData: true, manageSettings: true }
    : role?.permissions ?? fallbackRole?.permissions ?? emptyPermissions;
  const permissions = {
    viewAllData: requestedPermissions.viewAllData,
    manageUsers: isSuperAdmin && requestedPermissions.manageUsers,
    manageSettings: isSuperAdmin && requestedPermissions.manageSettings,
  };
  const accessAdmin = isSuperAdmin || isLegacyAdmin || Object.values(permissions).some(Boolean);

  return {
    ...permissions,
    accessAdmin,
    canEditAllLuggage: isLegacyAdmin,
    isSuperAdmin,
    isLowestRole: !accessAdmin,
  };
};
