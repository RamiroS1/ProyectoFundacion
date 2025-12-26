// ============================================================================
// COMPONENTE: Logout
// Botón simple para cerrar sesión y redirigir al login
// ============================================================================

import React from 'react';
import { supabase } from '../../supabaseClient';

interface LogoutProps {
  className?: string;
}

export const Logout: React.FC<LogoutProps> = ({ className }) => {
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error al cerrar sesión:', error);
        return;
      }
      // Redirigir al login recargando la página
      // El App.tsx detectará que no hay usuario y mostrará el Login automáticamente
      window.location.href = '/';
    } catch (error) {
      console.error('Error inesperado al cerrar sesión:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${className || ''}`}
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Cerrar Sesión
    </button>
  );
};

