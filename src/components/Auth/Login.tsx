// ============================================================================
// COMPONENTE: Login
// Formulario de login con Tailwind CSS
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import logoEmpresa from '../../assets/LOGO-DIVINA-PASTORA.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Mostrar mensaje si viene del registro
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Redirigir al inicio después del login exitoso
      navigate('/inicio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl w-full flex flex-col lg:flex-row rounded-lg shadow-lg overflow-hidden">
        {/* Lado izquierdo: Formulario */}
        <div className="w-full lg:w-1/2 p-16 bg-white flex flex-col justify-center">
          <div className="max-w-xl mx-auto w-full">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
              Iniciar sesión
            </h2>
            <p className="text-base text-gray-600 mb-8">
              Ingresa tus credenciales para acceder al sistema
            </p>

            {successMessage && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-base text-green-800">{successMessage}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-base text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 text-base"
                  placeholder="correo@ejemplo.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 text-base"
                  placeholder="Ingresa tu contraseña"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    disabled={loading}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-base text-gray-700">
                    Recordarme
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-base text-gray-600">
                ¿No tienes cuenta?{' '}
                <Link to="/registro" className="font-medium text-purple-600 hover:text-purple-500">
                  Regístrate
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Lado derecho: Logo de la empresa */}
        <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-purple-50 to-blue-50 relative">
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="w-full max-w-lg">
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
  );
};
