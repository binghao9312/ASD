import { useState, useEffect } from 'react';
import { collection, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, Check, X } from 'lucide-react';
import type { UserData } from '../../hooks/useAuth';
import { type RoleGroup, getRoles } from '../../services/settings';

export function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<RoleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingEmail, setApprovingEmail] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('user');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const rolesData = await getRoles();
        setRoles(rolesData);
      } catch (error) {
        console.error("Error fetching roles data:", error);
      }
      
      try {
        unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
          setUsers(snapshot.docs.map(d => d.data() as UserData));
          setLoading(false);
        }, (error) => {
          console.error("Snapshot error:", error);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error setting up snapshot:", error);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleUpdateUserStatus = async (email: string, status: 'approved' | 'pending') => {
    if (status === 'approved') {
      setApprovingEmail(email);
      setSelectedRoleId('user');
      return;
    }
    
    // Suspend user
    try {
      await updateDoc(doc(db, 'users', email), { status, roleId: '' });
      setUsers(users.map(u => u.email === email ? { ...u, status, roleId: '' } : u));
    } catch (error) {
      alert("更新失敗");
    }
  };

  const confirmApprove = async () => {
    if (!approvingEmail) return;
    try {
      await updateDoc(doc(db, 'users', approvingEmail), { 
        status: 'approved', 
        roleId: selectedRoleId 
      });
      setUsers(users.map(u => u.email === approvingEmail ? { ...u, status: 'approved', roleId: selectedRoleId } : u));
      setApprovingEmail(null);
    } catch (error) {
      alert("核准失敗");
    }
  };

  const handleChangeRole = async (email: string, roleId: string) => {
    try {
      await updateDoc(doc(db, 'users', email), { roleId });
      setUsers(users.map(u => u.email === email ? { ...u, roleId } : u));
    } catch (error) {
      alert("更新權限失敗");
    }
  };

  const pendingUsers = users.filter((user) => user.status === 'pending');
  const approvedUsers = users.filter((user) => user.status === 'approved');

  if (loading) return <div className="text-center py-10 text-slate-500">載入中...</div>;

  return (
    <div className="space-y-4 relative">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" />
        <h2 className="text-lg font-bold">人員管理</h2>
      </div>

      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">待審核申請</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pendingUsers.length}</div>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <div>已核准：{approvedUsers.length}</div>
          <div>總人數：{users.length}</div>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">待審核申請</h3>
          {pendingUsers.map((u) => {
            const userRoleGroup = roles.find((role) => role.id === u.roleId);
            return (
              <div key={u.email} className="glass-card p-4 space-y-4 border border-amber-200 dark:border-amber-900/50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">{u.name || '尚未設定姓名'}</div>
                    <div className="text-sm text-slate-500 mb-2">{u.email}</div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        {userRoleGroup ? userRoleGroup.name : '無身分組'}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                        等待核准
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdateUserStatus(u.email, 'approved')} className="flex-1 flex justify-center items-center gap-1 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
                      <Check className="w-4 h-4" /> 批准
                    </button>
                    <button onClick={() => handleUpdateUserStatus(u.email, 'pending')} className="flex-1 flex justify-center items-center gap-1 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium">
                      <X className="w-4 h-4" /> 保留待審
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {approvedUsers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">已核准人員</h3>
          {approvedUsers.map((u) => {
            const userRoleGroup = roles.find((role) => role.id === u.roleId);
            return (
              <div key={u.email} className="glass-card p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">{u.name || '尚未設定姓名'}</div>
                    <div className="text-sm text-slate-500 mb-2">{u.email}</div>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        {userRoleGroup ? userRoleGroup.name : '無身分組'}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                        已核准
                      </span>
                    </div>
                  </div>
                </div>

                {u.email !== 'a0938676069@gmail.com' && (
                  <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateUserStatus(u.email, 'pending')} className="flex-1 flex justify-center items-center gap-1 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium">
                        <X className="w-4 h-4" /> 停權
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500">變更身分組：</label>
                      <select
                        value={u.roleId || ''}
                        onChange={(e) => handleChangeRole(u.email, e.target.value)}
                        className="input-styled py-1.5 px-2 text-sm"
                      >
                        <option value="" disabled>請選擇身分組</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approval Modal */}
      {approvingEmail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">核准人員</h3>
            <p className="text-sm text-slate-500">請為 {users.find(u => u.email === approvingEmail)?.name} 指派身分組：</p>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="input-styled w-full"
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setApprovingEmail(null)} className="btn-secondary flex-1">取消</button>
              <button onClick={confirmApprove} className="btn-primary flex-1">確認核准</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
