// ============================================================================
// SERVICIO SUPABASE - VERSIÓN 2
// Sistema de gestión de documentos institucionales
// Consultas seguras con RLS estricto
// ============================================================================

import { supabase } from '../supabaseClient';
import type {
  UserProfile,
  PlantillaDocumento,
  PlantillaDocumentoInsert,
  CampoPlantilla,
  CampoPlantillaInsert,
  CampoPlantillaConPlantilla,
  DocumentoInstancia,
  DocumentoInstanciaInsert,
  DocumentoInstanciaUpdate,
  DocumentoInstanciaConProgreso,
  ValorCampo,
  ValorCampoInsert,
  ValorCampoUpdate,
  ValorCampoConCampo,
  HistorialValorCampo,
  DocumentoCompleto,
  ProgresoDocumento,
  RolProfesional,
  TipoCampo,
  EstadoCampo,
} from '../types/database.types';

// ============================================================================
// HELPER: Verificar autenticación
// ============================================================================

async function requireAuth(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('Usuario no autenticado');
  }
  return session.user.id;
}

// ============================================================================
// USER PROFILES
// ============================================================================

export const userProfileService = {
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }

    return data;
  },

  async getCurrentUserRol(): Promise<RolProfesional | null> {
    const profile = await this.getCurrentUserProfile();
    return profile?.rol_profesional || null;
  },

  async isAdmin(): Promise<boolean> {
    const rol = await this.getCurrentUserRol();
    return rol === 'ADMIN';
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('activo', true)
      .order('nombre_completo');

    if (error) {
      throw new Error(`Error obteniendo perfiles: ${error.message}`);
    }

    return data || [];
  },
};

// ============================================================================
// PLANTILLAS DOCUMENTO (SOLO ADMIN)
// ============================================================================

export const plantillaService = {
  async getAll(): Promise<PlantillaDocumento[]> {
    const isAdmin = await userProfileService.isAdmin();
    if (!isAdmin) {
      throw new Error('Acceso denegado: Solo administradores pueden ver plantillas');
    }

    const { data, error } = await supabase
      .from('plantillas_documento')
      .select('*')
      .eq('activa', true)
      .order('nombre');

    if (error) {
      throw new Error(`Error obteniendo plantillas: ${error.message}`);
    }

    return data || [];
  },

  async getById(id: string): Promise<PlantillaDocumento | null> {
    const isAdmin = await userProfileService.isAdmin();
    if (!isAdmin) {
      throw new Error('Acceso denegado: Solo administradores pueden ver plantillas');
    }

    const { data, error } = await supabase
      .from('plantillas_documento')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error obteniendo plantilla: ${error.message}`);
    }

    return data;
  },

  async create(plantilla: PlantillaDocumentoInsert): Promise<PlantillaDocumento> {
    const userId = await requireAuth();
    const isAdmin = await userProfileService.isAdmin();
    if (!isAdmin) {
      throw new Error('Acceso denegado: Solo administradores pueden crear plantillas');
    }

    const { data, error } = await supabase
      .from('plantillas_documento')
      .insert({
        ...plantilla,
        creado_por: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando plantilla: ${error.message}`);
    }

    return data;
  },
};

// ============================================================================
// CAMPOS PLANTILLA
// Usuarios SOLO ven campos asignados a su rol
// ============================================================================

export const campoPlantillaService = {
  /**
   * Obtiene campos asignados al usuario actual para una plantilla
   * RLS automáticamente filtra según el rol del usuario
   */
  async getCamposByPlantilla(plantillaId: string): Promise<CampoPlantillaConPlantilla[]> {
    await requireAuth();

    const { data, error } = await supabase
      .from('campos_plantilla')
      .select(`
        *,
        plantillas_documento!inner (
          nombre,
          codigo
        )
      `)
      .eq('plantilla_id', plantillaId)
      .order('orden');

    if (error) {
      throw new Error(`Error obteniendo campos: ${error.message}`);
    }

    return (data || []).map((campo: any) => ({
      ...campo,
      plantilla_nombre: Array.isArray(campo.plantillas_documento) 
        ? campo.plantillas_documento[0]?.nombre 
        : campo.plantillas_documento?.nombre,
      plantilla_codigo: Array.isArray(campo.plantillas_documento) 
        ? campo.plantillas_documento[0]?.codigo 
        : campo.plantillas_documento?.codigo,
    }));
  },

  async getById(id: string): Promise<CampoPlantilla | null> {
    await requireAuth();

    const { data, error } = await supabase
      .from('campos_plantilla')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error obteniendo campo: ${error.message}`);
    }

    return data;
  },

  async create(campo: CampoPlantillaInsert): Promise<CampoPlantilla> {
    const isAdmin = await userProfileService.isAdmin();
    if (!isAdmin) {
      throw new Error('Acceso denegado: Solo administradores pueden crear campos');
    }

    const { data, error } = await supabase
      .from('campos_plantilla')
      .insert(campo)
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando campo: ${error.message}`);
    }

    return data;
  },
};

// ============================================================================
// DOCUMENTOS INSTANCIA
// Usuarios ven SOLO instancias donde tienen campos asignados
// ============================================================================

export const documentoInstanciaService = {
  /**
   * Obtiene instancias del usuario actual
   * RLS filtra automáticamente según campos asignados
   */
  async getMisDocumentos(): Promise<DocumentoInstanciaConProgreso[]> {
    await requireAuth();

    // Obtener documentos instancia (RLS filtra automáticamente)
    const { data: documentos, error } = await supabase
      .from('documentos_instancia')
      .select('*')
      .order('actualizado_en', { ascending: false });

    if (error) {
      throw new Error(`Error obteniendo documentos: ${error.message}`);
    }

    if (!documentos || documentos.length === 0) {
      return [];
    }

    // Obtener información de plantillas usando una función helper o consulta separada
    // Como las plantillas están bloqueadas por RLS para usuarios normales,
    // necesitamos usar una función que bypass RLS o hacer una consulta más simple
    // Por ahora, intentaremos obtener solo los IDs y nombres básicos
    const plantillaIds = [...new Set(documentos.map((d: any) => d.plantilla_id))];
    
    // Intentar obtener nombres de plantillas (puede fallar si RLS bloquea)
    // Si falla, usaremos IDs o nombres por defecto
    const { data: plantillas } = await supabase
      .from('plantillas_documento')
      .select('id, nombre, codigo')
      .in('id', plantillaIds);

    // Crear mapa de plantillas para acceso rápido
    const plantillaMap = new Map(
      (plantillas || []).map((p: any) => [p.id, { nombre: p.nombre, codigo: p.codigo }])
    );

    // Transformar documentos agregando información de plantilla
    return documentos.map((doc: any) => {
      const plantillaInfo = plantillaMap.get(doc.plantilla_id) || { 
        nombre: 'Documento', 
        codigo: doc.plantilla_id?.substring(0, 8) || 'N/A' 
      };

      return {
        ...doc,
        plantilla_nombre: plantillaInfo.nombre,
        plantilla_codigo: plantillaInfo.codigo,
      };
    });
  },

  async getById(id: string): Promise<DocumentoInstancia | null> {
    await requireAuth();

    const { data, error } = await supabase
      .from('documentos_instancia')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error obteniendo documento: ${error.message}`);
    }

    return data;
  },

  async create(documento: DocumentoInstanciaInsert): Promise<DocumentoInstancia> {
    const userId = await requireAuth();
    const isAdmin = await userProfileService.isAdmin();
    if (!isAdmin) {
      throw new Error('Acceso denegado: Solo administradores pueden crear documentos');
    }

    const { data, error } = await supabase
      .from('documentos_instancia')
      .insert({
        ...documento,
        creado_por: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando documento: ${error.message}`);
    }

    return data;
  },

  async update(id: string, documento: DocumentoInstanciaUpdate): Promise<DocumentoInstancia> {
    const isAdmin = await userProfileService.isAdmin();
    if (!isAdmin) {
      throw new Error('Acceso denegado: Solo administradores pueden actualizar documentos');
    }

    const { data, error } = await supabase
      .from('documentos_instancia')
      .update(documento)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error actualizando documento: ${error.message}`);
    }

    return data;
  },

  /**
   * Obtiene documento completo con todos los campos y valores (solo ADMIN)
   */
  async getCompleto(id: string): Promise<DocumentoCompleto> {
    const isAdmin = await userProfileService.isAdmin();
    if (!isAdmin) {
      throw new Error('Acceso denegado: Solo administradores pueden ver documentos completos');
    }

    const { data, error } = await supabase
      .rpc('obtener_documento_completo', { doc_instancia_id: id });

    if (error) {
      throw new Error(`Error obteniendo documento completo: ${error.message}`);
    }

    return data;
  },

  /**
   * Obtiene progreso del documento por rol (solo ADMIN)
   */
  async getProgreso(id: string): Promise<ProgresoDocumento[]> {
    const isAdmin = await userProfileService.isAdmin();
    if (!isAdmin) {
      throw new Error('Acceso denegado: Solo administradores pueden ver progreso');
    }

    const { data, error } = await supabase
      .rpc('obtener_progreso_documento', { doc_instancia_id: id });

    if (error) {
      throw new Error(`Error obteniendo progreso: ${error.message}`);
    }

    return data || [];
  },
};

// ============================================================================
// VALORES CAMPO
// CRÍTICO: Esta es la tabla principal que los usuarios editan
// ============================================================================

export const valorCampoService = {
  /**
   * Obtiene valores de campos para un documento
   * RLS filtra automáticamente: solo campos asignados al rol del usuario
   */
  async getValoresByDocumento(documentoId: string): Promise<ValorCampoConCampo[]> {
    await requireAuth();

    const { data, error } = await supabase
      .from('valores_campo')
      .select(`
        *,
        campos_plantilla!inner (*)
      `)
      .eq('documento_instancia_id', documentoId)
      .order('campos_plantilla.orden');

    if (error) {
      throw new Error(`Error obteniendo valores: ${error.message}`);
    }

    return (data || []).map((valor: any) => ({
      ...valor,
      campo: Array.isArray(valor.campos_plantilla) 
        ? valor.campos_plantilla[0] 
        : valor.campos_plantilla,
    }));
  },

  async getById(id: string): Promise<ValorCampo | null> {
    await requireAuth();

    const { data, error } = await supabase
      .from('valores_campo')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error obteniendo valor: ${error.message}`);
    }

    return data;
  },

  /**
   * Guarda o actualiza un valor de campo
   * RLS garantiza que solo puede guardar campos de su rol
   */
  async save(valor: ValorCampoInsert | ValorCampoUpdate, valorId?: string): Promise<ValorCampo> {
    const userId = await requireAuth();

    if (valorId) {
      // UPDATE
      const { data, error } = await supabase
        .from('valores_campo')
        .update({
          ...valor,
          editado_por: userId,
        })
        .eq('id', valorId)
        .select()
        .single();

      if (error) {
        if (error.code === '42501') {
          throw new Error('Acceso denegado: No tienes permiso para editar este campo');
        }
        throw new Error(`Error guardando valor: ${error.message}`);
      }

      return data;
    } else {
      // INSERT
      const insertData = valor as ValorCampoInsert;
      const { data, error } = await supabase
        .from('valores_campo')
        .insert({
          ...insertData,
          editado_por: userId,
          estado: insertData.estado || 'EN_PROCESO',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42501') {
          throw new Error('Acceso denegado: No tienes permiso para editar este campo');
        }
        throw new Error(`Error guardando valor: ${error.message}`);
      }

      return data;
    }
  },

  /**
   * Obtiene historial de un valor campo
   */
  async getHistorial(valorCampoId: string): Promise<HistorialValorCampo[]> {
    await requireAuth();

    const { data, error } = await supabase
      .from('historial_valores_campo')
      .select('*')
      .eq('valor_campo_id', valorCampoId)
      .order('cambiado_en', { ascending: false });

    if (error) {
      throw new Error(`Error obteniendo historial: ${error.message}`);
    }

    return data || [];
  },
};

