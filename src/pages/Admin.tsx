import { useState, useEffect } from 'react';
import { Database, Users, Shield, ListChecks, Building } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AdminLuggages } from './admin/AdminLuggages';
import { AdminUsers } from './admin/AdminUsers';
import { AdminRoles } from './admin/AdminRoles';
import { AdminForm } from './admin/AdminForm';
import { AdminBuildings } from './admin/AdminBuildings';
import { getRoles, type RoleGroup } from '../services/settings';

export function Admin() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'data' | 'users' | 'roles' | 'form' | 'buildings'>('data');
  const [userRole, setUserRole] = useState<RoleGroup | null>(null);

  useEffect(() => {
    if (userData?.roleId) {
      getRoles().then(roles => {
        const role = roles.find(r => r.id === userData.roleId);
        if (role) setUserRole(role);
      });
    }
  }, [userData?.roleId]);

  // Determine permissions
  const isSuper = userData?.roleId === 'superadmin';
  // const canManageUsers = isSuper || userRole?.permissions?.manageUsers;
  const canManageSettings = isSuper || userRole?.permissions?.manageSettings;
  // If not super but admin, they can see users but maybe not manage them.

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'data' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Database className="w-4 h-4" />
          資料
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'users' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          人員
        </button>
        {canManageSettings && (
          <>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'roles' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Shield className="w-4 h-4" />
              身分組
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'form' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              表單
            </button>
            <button
              onClick={() => setActiveTab('buildings')}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'buildings' ? 'bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Building className="w-4 h-4" />
              棟別
            </button>
          </>
        )}
      </div>

      <div className="pb-10">
        {activeTab === 'data' && <AdminLuggages isSuper={isSuper} />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'roles' && canManageSettings && <AdminRoles />}
        {activeTab === 'form' && canManageSettings && <AdminForm userBuilding={userData?.building || '毅志'} isSuper={isSuper} />}
        {activeTab === 'buildings' && canManageSettings && <AdminBuildings />}
      </div>
    </div>
  );
}
