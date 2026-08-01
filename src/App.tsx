// ============================================================
// Flash Fiado — App Router
// ============================================================
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import '../src/styles/index.css';
import '../src/styles/animations.css';

// Lazy loading de páginas
const Login        = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Setup        = lazy(() => import('./pages/Setup').then(m => ({ default: m.Setup })));
const Dashboard    = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ClientsList  = lazy(() => import('./pages/ClientsList').then(m => ({ default: m.ClientsList })));
const ClientDetail = lazy(() => import('./pages/ClientDetail').then(m => ({ default: m.ClientDetail })));

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'hsl(222, 20%, 8%)',
    }}>
      <div className="spinner spinner-lg" />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, hasProfile, loading } = useAuth();

  if (loading) return <LoadingFallback />;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (!hasProfile) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/dashboard"          element={<Dashboard />} />
      <Route path="/clientes"           element={<ClientsList />} />
      <Route path="/clientes/:clientId" element={<ClientDetail />} />
      <Route path="*"                   element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  );
}
