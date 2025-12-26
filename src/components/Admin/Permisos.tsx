// ============================================================================
// COMPONENTE: Permisos
// Muestra todos los usuarios registrados (solo ADMIN)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { userProfileService } from '../../services/supabase.service';
import type { UserProfile } from '../../types/database.types';

export const Permisos: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando usuarios...');
      const data = await userProfileService.getAllProfiles();
      console.log('Usuarios cargados:', data.length);
      setUsuarios(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Mensaje de error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-base text-gray-600">Cargando usuarios...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-base text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Permisos</h1>
        <p className="mt-2 text-base text-gray-600">
          Gestión de usuarios y permisos del sistema
        </p>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Usuarios Registrados ({usuarios.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-base font-medium text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-base font-medium text-gray-700">
                    Nombre Completo
                  </th>
                  <th className="px-6 py-3 text-left text-base font-medium text-gray-700">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-base font-medium text-gray-700">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-base font-medium text-gray-700">
                    Fecha de Registro
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-base text-gray-500">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                        {usuario.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                        {usuario.nombre_completo || 'Sin nombre'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                            usuario.rol_profesional === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : usuario.rol_profesional === 'TESTER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {usuario.rol_profesional}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                            usuario.activo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
                        {new Date(usuario.creado_en).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

