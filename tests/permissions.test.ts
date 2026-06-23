import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserData } from '../src/hooks/useAuth.tsx';
import { defaultRoles, mergeRoleGroups } from '../src/services/roleDefaults.ts';
import {
  canAccessDashboardUser,
  canPotentiallyAccessAdmin,
  isDashboardOnlyUser,
} from '../src/services/permissions.ts';

const user = (updates: Partial<UserData>): UserData => ({
  email: 'person@example.com',
  role: 'user',
  roleId: 'user',
  status: 'approved',
  ...updates,
});

test('default roles include teacher as a dashboard-only role', () => {
  const teacherRole = defaultRoles.find((role) => role.id === 'teacher');

  assert.equal(teacherRole?.name, '老師');
  assert.deepEqual(teacherRole?.permissions, {
    manageUsers: false,
    viewAllData: false,
    manageSettings: false,
  });
});

test('stored role settings inherit newly added default teacher role', () => {
  const storedRoles = defaultRoles
    .filter((role) => role.id !== 'teacher')
    .map((role) => (role.id === 'admin' ? { ...role, name: 'Custom Admin' } : role));

  const merged = mergeRoleGroups(storedRoles);

  assert.equal(merged.find((role) => role.id === 'admin')?.name, 'Custom Admin');
  assert.equal(merged.find((role) => role.id === 'teacher')?.name, '老師');
});

test('teacher can access dashboard but cannot access admin', () => {
  const teacher = user({ roleId: 'teacher' });

  assert.equal(canAccessDashboardUser(teacher), true);
  assert.equal(isDashboardOnlyUser(teacher), true);
  assert.equal(canPotentiallyAccessAdmin(teacher), false);
});

test('regular users cannot access dashboard and superadmins are not dashboard-only', () => {
  assert.equal(canAccessDashboardUser(user({ roleId: 'user' })), false);
  assert.equal(isDashboardOnlyUser(user({ roleId: 'user' })), false);

  const superadmin = user({ email: 'a0938676069@gmail.com', role: 'admin', roleId: 'superadmin' });
  assert.equal(canAccessDashboardUser(superadmin), true);
  assert.equal(isDashboardOnlyUser(superadmin), false);
});
