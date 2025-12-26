// ============================================================================
// CONTEXTO DE AUTENTICACIÓN
// Maneja el estado de autenticación y el perfil del usuario
// ============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { userProfileService } from '../services/supabase.service';
import type { UserProfile, RolProfesional } from '../types/database.types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  role: RolProfesional | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async (userId?: string) => {
    const userIdToUse = userId || user?.id;
    if (!userIdToUse) {
      console.log('No hay usuario, limpiando perfil');
      setProfile(null);
      return;
    }

    try {
      console.log('Cargando perfil para usuario:', userIdToUse);
      const userProfile = await userProfileService.getCurrentUserProfile();
      console.log('Perfil cargado:', userProfile);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AuthContext - Sesión obtenida:', session);
      console.log('AuthContext - Error:', error);
      console.log('AuthContext - Usuario:', session?.user);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('AuthContext - Llamando refreshProfile para usuario:', session.user.id);
        refreshProfile(session.user.id);
      } else {
        console.log('AuthContext - No hay usuario en la sesión');
      }
      setLoading(false);
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthContext - Cambio de estado:', event, session?.user?.id);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('AuthContext - Usuario autenticado, refrescando perfil');
        refreshProfile(session.user.id);
      } else {
        console.log('AuthContext - Usuario desautenticado');
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isAdmin: profile?.rol_profesional === 'ADMIN',
    role: profile?.rol_profesional || null,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

