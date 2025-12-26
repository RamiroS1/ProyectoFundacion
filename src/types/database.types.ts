// ============================================================================
// TIPOS DE BASE DE DATOS - VERSIÓN 2
// Sistema de gestión de documentos institucionales
// ============================================================================

export type RolProfesional = 
  | 'DIRECTOR'
  | 'COORDINADOR'
  | 'ANALISTA'
  | 'AUDITOR'
  | 'GERENTE'
  | 'ADMIN';

export type TipoCampo = 
  | 'texto'
  | 'numero'
  | 'fecha'
  | 'seleccion'
  | 'tabla'
  | 'firma'
  | 'textarea';

export type EstadoCampo = 
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'REVISADO';

export type EstadoDocumento = 
  | 'BORRADOR'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'FIRMADO'
  | 'ARCHIVADO';

// ============================================================================
// USER PROFILES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string | null;
  rol_profesional: RolProfesional;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface UserProfileUpdate {
  nombre_completo?: string | null;
  activo?: boolean;
}

// ============================================================================
// PLANTILLAS DOCUMENTO
// ============================================================================

export interface PlantillaDocumento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  archivo_url: string;
  archivo_tipo: 'excel' | 'word';
  archivo_version: string;
  creado_por: string;
  creado_en: string;
  activa: boolean;
}

export interface PlantillaDocumentoInsert {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  archivo_url: string;
  archivo_tipo: 'excel' | 'word';
  archivo_version?: string;
}

export interface PlantillaDocumentoUpdate {
  activa?: boolean;
}

// ============================================================================
// CAMPOS PLANTILLA
// ============================================================================

export interface CampoPlantilla {
  id: string;
  plantilla_id: string;
  codigo: string;
  pregunta: string;
  descripcion: string | null;
  hoja_excel: string | null;
  celda_excel: string | null;
  area_seccion: string | null;
  tipo: TipoCampo;
  configuracion: ConfiguracionCampo;
  rol_asignado: RolProfesional;
  orden: number;
  creado_en: string;
}

export interface CampoPlantillaInsert {
  plantilla_id: string;
  codigo: string;
  pregunta: string;
  descripcion?: string | null;
  tipo: TipoCampo;
  configuracion: ConfiguracionCampo;
  rol_asignado: RolProfesional;
  orden?: number;
}

export interface ConfiguracionCampo {
  // Para tipo 'seleccion'
  opciones?: Array<{ valor: string; etiqueta: string }>;
  
  // Para tipo 'tabla'
  columnas?: Array<{ id: string; nombre: string; tipo: TipoCampo }>;
  
  // Validaciones
  requerido?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  mensajeError?: string;
  
  // UI
  placeholder?: string;
  ayuda?: string;
  filas?: number; // Para textarea
}

// Campo con información de plantilla
export interface CampoPlantillaConPlantilla extends CampoPlantilla {
  plantilla_nombre?: string;
  plantilla_codigo?: string;
}

// ============================================================================
// DOCUMENTOS INSTANCIA
// ============================================================================

export interface DocumentoInstancia {
  id: string;
  plantilla_id: string;
  numero_documento: string;
  titulo: string;
  estado: EstadoDocumento;
  creado_por: string;
  creado_en: string;
  actualizado_en: string;
  finalizado_en: string | null;
  archivo_generado_url: string | null;
}

export interface DocumentoInstanciaInsert {
  plantilla_id: string;
  numero_documento: string;
  titulo: string;
  estado?: EstadoDocumento;
}

export interface DocumentoInstanciaUpdate {
  titulo?: string;
  estado?: EstadoDocumento;
  archivo_generado_url?: string | null;
  finalizado_en?: string | null;
}

// Documento con información de plantilla y progreso
export interface DocumentoInstanciaConProgreso extends DocumentoInstancia {
  plantilla_nombre?: string;
  plantilla_codigo?: string;
  total_campos_asignados?: number;
  campos_completados?: number;
  progreso_completitud?: number;
}

// ============================================================================
// VALORES CAMPO
// ============================================================================

export interface ValorCampo {
  id: string;
  documento_instancia_id: string;
  campo_plantilla_id: string;
  valor: ValorCampoTipo | null;
  estado: EstadoCampo;
  editado_por: string;
  editado_en: string;
  metadata: Record<string, unknown>;
}

export type ValorCampoTipo = 
  | string  // texto, textarea, fecha (ISO string)
  | number  // numero
  | boolean // checkbox
  | Array<Record<string, unknown>>  // tabla
  | { firma: string; fecha: string }  // firma
  | string;  // seleccion (valor seleccionado)

export interface ValorCampoInsert {
  documento_instancia_id: string;
  campo_plantilla_id: string;
  valor: ValorCampoTipo | null;
  estado?: EstadoCampo;
  metadata?: Record<string, unknown>;
}

export interface ValorCampoUpdate {
  valor?: ValorCampoTipo | null;
  estado?: EstadoCampo;
  metadata?: Record<string, unknown>;
}

// Valor con información del campo
export interface ValorCampoConCampo extends ValorCampo {
  campo?: CampoPlantilla;
}

// ============================================================================
// HISTORIAL VALORES CAMPO
// ============================================================================

export interface HistorialValorCampo {
  id: string;
  valor_campo_id: string;
  valor_anterior: ValorCampoTipo | null;
  valor_nuevo: ValorCampoTipo | null;
  estado_anterior: EstadoCampo | null;
  estado_nuevo: EstadoCampo | null;
  version_numero: number;
  cambiado_por: string;
  rol_en_momento: RolProfesional;
  cambiado_en: string;
  metadata: Record<string, unknown>;
}

// ============================================================================
// DOCUMENTO COMPLETO (solo para ADMIN)
// ============================================================================

export interface DocumentoCompleto {
  documento: DocumentoInstancia;
  plantilla: PlantillaDocumento;
  campos: Array<{
    campo: CampoPlantilla;
    valor: ValorCampo | null;
  }>;
}

// ============================================================================
// PROGRESO DOCUMENTO (solo para ADMIN)
// ============================================================================

export interface ProgresoDocumento {
  rol: RolProfesional;
  total_campos: number;
  completados: number;
  en_proceso: number;
  pendientes: number;
}

