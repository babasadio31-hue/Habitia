import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Proprietaires from './pages/Proprietaires';
import Locataires from './pages/Locataires';
import Biens from './pages/Biens';
import Construction from './pages/Construction';
import Comptabilite from './pages/Comptabilite';
import Personnels from './pages/Personnels';
import Parametres from './pages/Parametres';

const queryClient = new QueryClient();

// PRIVATE ROUTE WRAPPER
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PermissionGate: React.FC<{ path: string; children: React.ReactElement }> = ({ path, children }) => {
  const { user } = useAuthStore();
  
  if (user?.role === 'admin') return children;
  
  if (user?.permissions?.pages) {
    if (!user.permissions.pages.includes(path)) {
      const allowed = user.permissions.pages;
      if (allowed.length > 0) {
        return <Navigate to={allowed[0]} replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }
  
  return children;
};

export const App: React.FC = () => {
  const { checkAuth, user } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    checkAuth();
    initTheme();

    // Intercept native alerts and show them as Toast
    window.alert = (message?: any) => {
      const msg = String(message);
      if (
        msg.toLowerCase().includes('erreur') || 
        msg.toLowerCase().includes('impossible') || 
        msg.toLowerCase().includes('échec') || 
        msg.toLowerCase().includes('pas de') ||
        msg.toLowerCase().includes('dé dépasse')
      ) {
        toast.error(msg, { duration: 5000 });
      } else if (
        msg.toLowerCase().includes('succès') || 
        msg.toLowerCase().includes('réussi') || 
        msg.toLowerCase().includes('enregistré') || 
        msg.toLowerCase().includes('effectué') || 
        msg.toLowerCase().includes('validé') ||
        msg.toLowerCase().includes('supprimé')
      ) {
        toast.success(msg, { duration: 4000 });
      } else {
        toast.info(msg, { duration: 4000 });
      }
    };
  }, []);

  const defaultRedirectPath = user?.permissions?.pages?.[0] || "/dashboard";

  return (
    <GoogleOAuthProvider clientId="466480529541-49fao7ma01km2sbmaev7b8pp748lfjkn.apps.googleusercontent.com">
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" richColors closeButton />
        <BrowserRouter>
          <Routes>
            {/* LOGIN */}
            <Route path="/login" element={<Login />} />

            {/* SECURE ROUTES */}
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Layout>
                    <Routes>
                      <Route path="/dashboard" element={<PermissionGate path="/dashboard"><Dashboard /></PermissionGate>} />
                      <Route path="/proprietaires" element={<PermissionGate path="/proprietaires"><Proprietaires /></PermissionGate>} />
                      <Route path="/locataires" element={<PermissionGate path="/locataires"><Locataires /></PermissionGate>} />
                      <Route path="/biens" element={<PermissionGate path="/biens"><Biens /></PermissionGate>} />
                      <Route path="/construction" element={<PermissionGate path="/construction"><Construction /></PermissionGate>} />
                      <Route path="/comptabilite" element={<PermissionGate path="/comptabilite"><Comptabilite /></PermissionGate>} />
                      <Route path="/personnels" element={<PermissionGate path="/personnels"><Personnels /></PermissionGate>} />
                      <Route path="/parametres" element={<PermissionGate path="/parametres"><Parametres /></PermissionGate>} />
                      
                      {/* Fallback redirects */}
                      <Route path="/" element={<Navigate to={defaultRedirectPath} replace />} />
                      <Route path="*" element={<Navigate to={defaultRedirectPath} replace />} />
                    </Routes>
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};
export default App;
