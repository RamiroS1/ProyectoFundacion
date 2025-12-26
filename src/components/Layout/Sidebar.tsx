// ============================================================================
// COMPONENTE: Sidebar
// Sidebar de navegación para el usuario
// ============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  path?: string;
}

interface SidebarProps {
  items: SidebarItem[];
  currentPath?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ items }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Sistema</h1>
            <p className="text-sm text-gray-500">Gestión</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-base font-semibold text-purple-700">
              {profile?.nombre_completo?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-gray-900 truncate">
              {profile?.nombre_completo || 'Usuario'}
            </p>
            <p className="text-base text-gray-500 truncate">
              {profile?.email || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
              item.active
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="text-base">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer con botón de logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="mb-3">
          <button
            onClick={async () => {
              try {
                const { error } = await supabase.auth.signOut();
                if (error) {
                  console.error('Error al cerrar sesión:', error);
                  return;
                }
                navigate('/login');
              } catch (error) {
                console.error('Error inesperado al cerrar sesión:', error);
              }
            }}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-lg text-base font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
        <p className="text-sm text-gray-500 text-center">
          © 2024 Sistema de Gestión
        </p>
      </div>
    </div>
  );
};

