// ============================================================================
// COMPONENTE: PublicRoute
// Rutas públicas que redirigen a /inicio si el usuario ya está autenticado
// ============================================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-base text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
};

