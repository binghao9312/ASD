import { useState, useEffect } from 'react';
import { Shield, Plus, Save, Trash2, CheckSquare, Square, RefreshCcw } from 'lucide-react';
import { type RoleGroup, getRoles, saveRoles, defaultRoles } from '../../services/settings';

export function AdminRoles() {
  const [roles, setRoles] = useState<RoleGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    const data = await getRoles();
    setRoles(data);
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      await saveRoles(roles);
      alert('設定已儲存');
    } catch (err) {
      alert('儲存失敗');
    }
  };

  const handleReset = () => {
    if (confirm('確定要重置為預設身分組嗎？這將覆蓋目前的自定義設定。')) {
      setRoles(defaultRoles);
    }
  };

  const addRole = () => {
    const newId = 'role_' + Date.now();
    setRoles([...roles, {
      id: newId,
      name: '新身分組',
      permissions: { manageUsers: false, viewAllData: false, manageSettings: false }
    }]);
  };

  const updateRole = (id: string, updates: Partial<RoleGroup>) => {
    setRoles(roles.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const togglePermission = (id: string, perm: keyof RoleGroup['permissions']) => {
    setRoles(roles.map(r => {
      if (r.id === id) {
        return { ...r, permissions: { ...r.permissions, [perm]: !r.permissions[perm] } };
      }
      return r;
    }));
  };

  const deleteRole = (id: string) => {
    if (id === 'superadmin') {
      alert('不能刪除超級管理員');
      return;
    }
    if (confirm('確定要刪除此身分組嗎？已分配此身分的使用者將失去權限。')) {
      setRoles(roles.filter(r => r.id !== id));
    }
  };

  if (loading) return <div className="text-center py-10">載入中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-5 h-5" /> 身分組權限管理
        </h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleReset} className="btn-secondary py-1.5 px-3 text-sm h-auto w-auto flex items-center gap-1">
            <RefreshCcw className="w-4 h-4" /> 重置預設
          </button>
          <button onClick={addRole} className="btn-secondary py-1.5 px-3 text-sm h-auto w-auto flex items-center gap-1">
            <Plus className="w-4 h-4" /> 新增
          </button>
          <button onClick={handleSave} className="btn-primary py-1.5 px-3 text-sm h-auto w-auto flex items-center gap-1">
            <Save className="w-4 h-4" /> 儲存變更
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {roles.map(role => (
          <div key={role.id} className="glass-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <input
                type="text"
                value={role.name}
                onChange={(e) => updateRole(role.id, { name: e.target.value })}
                className="input-styled py-1.5 text-sm font-bold w-1/2"
                disabled={role.id === 'superadmin'}
              />
              {role.id !== 'superadmin' && (
                <button onClick={() => deleteRole(role.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                <button type="button" onClick={() => togglePermission(role.id, 'manageUsers')} disabled={role.id === 'superadmin'} className="text-primary-600 disabled:opacity-50">
                  {role.permissions.manageUsers ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span>管理使用者權限</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                <button type="button" onClick={() => togglePermission(role.id, 'viewAllData')} disabled={role.id === 'superadmin'} className="text-primary-600 disabled:opacity-50">
                  {role.permissions.viewAllData ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span>檢視所有行李資料</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                <button type="button" onClick={() => togglePermission(role.id, 'manageSettings')} disabled={role.id === 'superadmin'} className="text-primary-600 disabled:opacity-50">
                  {role.permissions.manageSettings ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <span>管理系統表單設定</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
