import { useState, useEffect, useMemo } from 'react';
import { Database, Users, Shield, ListChecks, Building, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AdminLuggages } from './admin/AdminLuggages';
import { AdminUsers } from './admin/AdminUsers';
import { AdminRoles } from './admin/AdminRoles';
import { AdminForm } from './admin/AdminForm';
import { AdminBuildings } from './admin/AdminBuildings';
import { getRoles, type RoleGroup } from '../services/settings';
import { getEffectivePermissions } from '../services/permissions';

export function Admin() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'data' | 'users' | 'roles' | 'form' | 'buildings'>('data');
  const [roles, setRoles] = useState<RoleGroup[]>([]);

  useEffect(() => {
    getRoles().then(setRoles);
  }, []);

  const permissions = useMemo(() => getEffectivePermissions(userData, roles), [userData, roles]);
  const availableTabs = useMemo(() => {
    const tabs: Array<'data' | 'users' | 'roles' | 'form' | 'buildings'> = [];
    if (permissions.viewAllData) tabs.push('data');
    if (permissions.manageUsers) tabs.push('users');
    if (permissions.manageSettings) tabs.push('roles', 'form');
    if (permissions.isSuperAdmin) tabs.push('buildings');
    return tabs;
  }, [permissions]);

  const selectedTab = availableTabs.includes(activeTab) ? activeTab : availableTabs[0];

  if (availableTabs.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-slate-500 dark:text-slate-400">
        <Lock className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
        <h2 className="mb-1 text-lg font-bold text-slate-800 dark:text-slate-100">沒有管理權限</h2>
        <p className="text-sm">目前身分只能使用掃描、查詢、個人設定與自己的歷史紀錄。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid auto-cols-fr grid-flow-col bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-800">
        {permissions.viewAllData && (
          <button
            onClick={() => setActiveTab('data')}
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedTab === 'data' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Database className="w-4 h-4" />
            資料
          </button>
        )}
        {permissions.manageUsers && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedTab === 'users' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            人員
          </button>
        )}
        {permissions.manageSettings && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedTab === 'roles' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            身分組
          </button>
        )}
        {permissions.manageSettings && (
          <button
            onClick={() => setActiveTab('form')}
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedTab === 'form' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            表單
          </button>
        )}
        {permissions.isSuperAdmin && (
          <button
            onClick={() => setActiveTab('buildings')}
            className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedTab === 'buildings' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Building className="w-4 h-4" />
            棟別
          </button>
        )}
      </div>

      <div className="pb-10">
        {selectedTab === 'data' && permissions.viewAllData && (
          <AdminLuggages isSuper={permissions.isSuperAdmin} canEditAll={permissions.canEditAllLuggage} />
        )}
        {selectedTab === 'users' && permissions.manageUsers && <AdminUsers />}
        {selectedTab === 'roles' && permissions.manageSettings && <AdminRoles />}
        {selectedTab === 'form' && permissions.manageSettings && (
          <AdminForm userBuilding={userData?.building || '毅志'} isSuper={permissions.isSuperAdmin} />
        )}
        {selectedTab === 'buildings' && permissions.isSuperAdmin && <AdminBuildings />}
      </div>
    </div>
  );
}
