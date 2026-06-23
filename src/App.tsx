import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import {
  canAccessDashboardUser,
  canPotentiallyAccessAdmin,
  isDashboardOnlyUser,
  isSuperAdminUser,
} from './services/permissions';

const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Scan = lazy(() => import('./pages/Scan').then((module) => ({ default: module.Scan })));
const History = lazy(() => import('./pages/History').then((module) => ({ default: module.History })));
const PendingApproval = lazy(() =>
  import('./pages/PendingApproval').then((module) => ({ default: module.PendingApproval })),
);
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })));
const SuperAdminDashboard = lazy(() =>
  import('./pages/SuperAdminDashboard').then((module) => ({ default: module.SuperAdminDashboard })),
);
const SetupProfile = lazy(() => import('./pages/SetupProfile').then((module) => ({ default: module.SetupProfile })));

function PageLoader() {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">載入中...</div>;
}

function RequireAuth({
  children,
  requireAdmin = false,
  requireDashboard = false,
  requireSuperAdmin = false,
  allowPending = false,
}: {
  children: React.ReactNode,
  requireAdmin?: boolean,
  requireDashboard?: boolean,
  requireSuperAdmin?: boolean,
  allowPending?: boolean,
}) {
  const { user, userData, loading } = useAuth();
  const location = useLocation();
  
  if (loading || (user && !userData)) {
    return <PageLoader />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userData?.status === 'pending' && !allowPending && location.pathname !== '/setup') {
    return <Navigate to="/pending" replace />;
  }

  if (isDashboardOnlyUser(userData) && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!userData?.name && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  if (requireSuperAdmin && !isSuperAdminUser(userData)) {
    return <Navigate to="/scan" replace />;
  }

  if (requireDashboard && !canAccessDashboardUser(userData)) {
    return <Navigate to="/scan" replace />;
  }

  if (requireAdmin && !canPotentiallyAccessAdmin(userData)) {
    return <Navigate to="/scan" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="dashboard" element={<RequireAuth requireDashboard={true}><SuperAdminDashboard /></RequireAuth>} />
        </Route>
        <Route path="*" element={<Navigate to="/scan" replace />} />
      </Routes>
    </Suspense>
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
