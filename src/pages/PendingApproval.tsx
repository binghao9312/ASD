import { Clock, LogOut } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isDashboardOnlyUser } from '../services/permissions';

export function PendingApproval() {
  const { logout, userData } = useAuth();

  if (userData?.status === 'approved') {
    return <Navigate to={isDashboardOnlyUser(userData) ? '/dashboard' : '/scan'} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="glass-card max-w-sm w-full p-8 text-center space-y-6 shadow-xl">
        <div className="flex justify-center">
          <div className="bg-amber-100 p-4 rounded-full text-amber-600">
            <Clock className="w-12 h-12" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">等待審核中</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            您的帳號已經成功登入，但目前正在等待管理員批准您的權限。<br/>
            請稍後再試，或聯絡管理員為您開通。
          </p>
        </div>
        <button
          onClick={logout}
          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all active:scale-95 flex justify-center items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          登出
        </button>
      </div>
    </div>
  );
}
