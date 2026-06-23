import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building, Clock, LayoutDashboard, LogOut, Moon, ScanLine, Shield, Sun, UserCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { canAccessDashboardUser, canPotentiallyAccessAdmin, isDashboardOnlyUser } from '../services/permissions';
import { cn } from '../utils/cn';

export function Layout() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const dashboardOnly = isDashboardOnlyUser(userData);
  const navItems = dashboardOnly
    ? []
    : [
      { name: '掃描', path: '/scan', icon: ScanLine },
      { name: '個人設定', path: '/setup', icon: UserCircle2 },
      { name: '歷史紀錄', path: '/history', icon: Clock },
    ];

  if (canPotentiallyAccessAdmin(userData)) {
    navItems.push({ name: '管理', path: '/admin', icon: Shield });
  }

  if (canAccessDashboardUser(userData)) {
    navItems.push({ name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-500 font-bold text-lg">
            <Building className="w-6 h-6" />
            <span>ASD</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="切換深色模式"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="登出"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={cn(
        'flex-1 w-full mx-auto p-4 flex flex-col pb-24',
        location.pathname === '/dashboard' ? 'max-w-6xl' : 'max-w-md',
      )}>
        <Outlet />
      </main>

      {user && (
        <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-bottom z-50 transition-colors duration-300">
          <div className="max-w-md mx-auto flex justify-around p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex flex-col items-center gap-1 w-20 py-2 rounded-xl transition-all',
                    isActive
                      ? 'text-primary-600 dark:text-primary-500'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                  )}
                >
                  <Icon className={cn('w-6 h-6 transition-transform', isActive && 'scale-110')} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
