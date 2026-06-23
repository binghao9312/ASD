export interface RoleGroup {
  id: string;
  name: string;
  permissions: {
    manageUsers: boolean;
    viewAllData: boolean;
    manageSettings: boolean;
  };
}

export const defaultRoles: RoleGroup[] = [
  {
    id: 'superadmin',
    name: '超級管理員',
    permissions: { manageUsers: true, viewAllData: true, manageSettings: true },
  },
  {
    id: 'coordinator',
    name: '總幹事',
    permissions: { manageUsers: true, viewAllData: true, manageSettings: false },
  },
  {
    id: 'dorm_head',
    name: '正舍長',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: false },
  },
  {
    id: 'deputy_dorm_head',
    name: '副舍長',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: false },
  },
  {
    id: 'floor_head',
    name: '正樓長',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: false },
  },
  {
    id: 'deputy_floor_head',
    name: '副樓長',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: false },
  },
  {
    id: 'admin',
    name: '管理員',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: true },
  },
  {
    id: 'teacher',
    name: '老師',
    permissions: { manageUsers: false, viewAllData: false, manageSettings: false },
  },
  {
    id: 'user',
    name: '一般使用者',
    permissions: { manageUsers: false, viewAllData: false, manageSettings: false },
  },
];

export const mergeRoleGroups = (storedRoles?: RoleGroup[] | null): RoleGroup[] => {
  if (!storedRoles?.length) return defaultRoles;

  const storedRolesById = new Map(storedRoles.map((role) => [role.id, role]));
  const defaultRoleIds = new Set(defaultRoles.map((role) => role.id));
  const mergedDefaults = defaultRoles.map((defaultRole) => ({
    ...defaultRole,
    ...(storedRolesById.get(defaultRole.id) ?? {}),
  }));
  const customRoles = storedRoles.filter((role) => !defaultRoleIds.has(role.id));

  return [...mergedDefaults, ...customRoles];
};
