import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import BuyerForm from './components/BuyerForm';
import SellerForm from './components/SellerForm';
import type { ReactNode } from 'react';

// Route protégée : redirige vers /auth si non connecté
function PrivateRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-500">Chargement...</div>;
  return session ? <>{children}</> : <Navigate to="/auth" replace />;
}

// Redirige les utilisateurs déjà connectés
function PublicRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-500">Chargement...</div>;
  return session ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Page d'accueil = Dashboard (mode démo si pas connecté) */}
      <Route path="/" element={<Dashboard />} />

      {/* Auth */}
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />

      {/* Formulaires protégés */}
      <Route path="/buyer/new" element={<PrivateRoute><BuyerForm /></PrivateRoute>} />
      <Route path="/seller/new" element={<PrivateRoute><SellerForm /></PrivateRoute>} />

      {/* Dashboard connecté */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
