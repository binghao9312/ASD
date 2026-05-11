import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Scan } from './pages/Scan';
import { History } from './pages/History';
import { PendingApproval } from './pages/PendingApproval';
import { Admin } from './pages/Admin';
import { SetupProfile } from './pages/SetupProfile';

function RequireAuth({ children, requireAdmin = false, allowPending = false }: { children: React.ReactNode, requireAdmin?: boolean, allowPending?: boolean }) {
  const { user, userData, loading } = useAuth();
  const location = useLocation();
  
  if (loading || (user && !userData)) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">載入中...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userData?.name && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  if (userData?.status === 'pending' && !allowPending && location.pathname !== '/setup') {
    return <Navigate to="/pending" replace />;
  }

  if (requireAdmin && userData?.roleId !== 'superadmin' && userData?.roleId !== 'admin' && userData?.role !== 'admin') {
    return <Navigate to="/scan" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending" element={
        <RequireAuth allowPending={true}>
          <PendingApproval />
        </RequireAuth>
      } />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/scan" replace />} />
        <Route path="scan" element={<Scan />} />
        <Route path="history" element={<History />} />
        <Route path="setup" element={<SetupProfile />} />
        <Route path="admin" element={<RequireAuth requireAdmin={true}><Admin /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/scan" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
