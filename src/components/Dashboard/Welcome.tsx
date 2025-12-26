// ============================================================================
// COMPONENTE: Welcome
// Vista de bienvenida para el usuario
// ============================================================================

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import logoEmpresa from '../../assets/LOGO-DIVINA-PASTORA.png';

interface WelcomeProps {
  onNavigate?: (path: string) => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onNavigate }) => {
  const { profile } = useAuth();

  const nombreUsuario = profile?.nombre_completo || 'Usuario';

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header con saludo */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Bienvenido, {nombreUsuario.split(' ')[0]}!
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Estamos encantados de tenerte de vuelta en el sistema
        </p>
      </div>

      {/* Contenido principal con imagen */}
      <div className="container mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Texto de bienvenida */}
            <div className="p-12 flex flex-col justify-center space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Sistema de Gestión de Documentos Institucionales
                </h2>
                <p className="text-base text-gray-600 leading-relaxed">
                  Plataforma diseñada para la gestión eficiente y segura de documentos 
                  institucionales, garantizando la integridad y confidencialidad de la información.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">Seguridad garantizada</p>
                    <p className="text-base text-gray-600">Tus documentos están protegidos</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">Fácil de usar</p>
                    <p className="text-base text-gray-600">Interfaz intuitiva y moderna</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">Acceso desde cualquier lugar</p>
                    <p className="text-base text-gray-600">Trabaja desde donde estés</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Imagen de la empresa */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-12">
              <div className="w-full max-w-md">
                <img
                  src={logoEmpresa}
                  alt="Logo Divina Pastora"
                  className="w-full h-auto object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

