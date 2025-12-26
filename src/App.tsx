// ============================================================================
// COMPONENTE PRINCIPAL
// Configuración de rutas con React Router
// ============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { PublicRoute } from './components/Auth/PublicRoute';
import { MainLayout } from './components/Layout/MainLayout';
import { Welcome } from './components/Dashboard/Welcome';
import { MisDocumentos } from './components/Documents/MisDocumentos';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/registro"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Rutas protegidas */}
          <Route
            path="/inicio"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Welcome />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documentos"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MisDocumentos />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto */}
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          
          {/* Ruta 404 - redirigir al inicio si está autenticado, sino al login */}
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

