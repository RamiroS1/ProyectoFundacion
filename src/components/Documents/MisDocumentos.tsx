// ============================================================================
// COMPONENTE: MisDocumentos
// Lista de plantillas disponibles para editar
// ============================================================================

import React, { useState, useEffect } from 'react';
import { documentoInstanciaService, campoPlantillaService, valorCampoService } from '../../services/supabase.service';
import { useAuth } from '../../contexts/AuthContext';
import type { DocumentoInstanciaConProgreso, CampoPlantillaConPlantilla, ValorCampoConCampo } from '../../types/database.types';

export const MisDocumentos: React.FC = () => {
  const { profile } = useAuth();
  const [documentos, setDocumentos] = useState<DocumentoInstanciaConProgreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocumentos();
  }, []);

  const loadDocumentos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentoInstanciaService.getMisDocumentos();
      setDocumentos(data);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-base text-gray-600">Cargando plantillas...</div>
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
        <h1 className="text-3xl font-bold text-gray-900">Mis Documentos</h1>
        <p className="mt-2 text-base text-gray-600">
          Selecciona una plantilla para comenzar a editar
        </p>
      </div>

      {/* Lista de documentos */}
      <div className="container mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documentos.map((doc) => (
            <DocumentoCard 
              key={doc.id} 
              documento={doc}
              onUpdate={loadDocumentos}
            />
          ))}
        </div>

        {documentos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-base text-gray-600">
              No tienes documentos asignados en este momento
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: DocumentoCard
// Tarjeta de documento individual
// ============================================================================

interface DocumentoCardProps {
  documento: DocumentoInstanciaConProgreso;
  onUpdate: () => void;
}

const DocumentoCard: React.FC<DocumentoCardProps> = ({ documento, onUpdate }) => {
  const [selected, setSelected] = useState(false);

  if (selected) {
    // Mostrar editor de documento
    return (
      <EditorDocumento 
        documentoId={documento.id}
        plantillaId={documento.plantilla_id}
        onBack={() => {
          setSelected(false);
          onUpdate();
        }} 
      />
    );
  }

  const nombreDocumento = documento.plantilla_nombre || 'Documento sin nombre';
  const progreso = documento.progreso_completitud || 0;

  return (
    <button
      onClick={() => setSelected(true)}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 text-left w-full"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {nombreDocumento}
          </h3>
          <p className="text-base text-gray-600 mb-3">
            Estado: <span className="font-medium">{documento.estado}</span>
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{progreso}% completado</p>
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// COMPONENTE: EditorDocumento
// Editor de campos del documento organizado en tabs
// ============================================================================

interface EditorDocumentoProps {
  documentoId: string;
  plantillaId: string;
  onBack: () => void;
}

const EditorDocumento: React.FC<EditorDocumentoProps> = ({ documentoId, plantillaId, onBack }) => {
  const { profile } = useAuth();
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [campos, setCampos] = useState<CampoPlantillaConPlantilla[]>([]);
  const [valores, setValores] = useState<Map<string, ValorCampoConCampo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCampos();
  }, [plantillaId]);

  useEffect(() => {
    if (documentoId) {
      loadValores();
    }
  }, [documentoId]);

  const loadCampos = async () => {
    try {
      setLoading(true);
      // Obtener campos asignados al rol del usuario para esta plantilla
      const camposData = await campoPlantillaService.getCamposByPlantilla(plantillaId);
      
      // Organizar campos por área_seccion (tabs)
      const areasUnicas = Array.from(
        new Set(camposData.map((c) => c.area_seccion).filter(Boolean))
      ) as string[];
      
      // Si no hay áreas definidas, usar un tab general
      if (areasUnicas.length === 0) {
        areasUnicas.push('Campos Generales');
      }
      
      setTabs(areasUnicas);
      setActiveTab(areasUnicas[0]);
      setCampos(camposData);
    } catch (err) {
      console.error('Error cargando campos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadValores = async () => {
    try {
      const valoresData = await valorCampoService.getValoresByDocumento(documentoId);
      const valoresMap = new Map<string, ValorCampoConCampo>();
      valoresData.forEach((v) => {
        if (v.campo?.id) {
          valoresMap.set(v.campo.id, v);
        }
      });
      setValores(valoresMap);
    } catch (err) {
      console.error('Error cargando valores:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-base text-gray-600">Cargando campos...</div>
      </div>
    );
  }

  const handleSave = async (campoId: string, valor: string, estado: string = 'EN_PROCESO') => {
    try {
      setSaving(true);
      const valorActual = valores.get(campoId);
      const campo = campos.find((c) => c.id === campoId);
      
      if (!campo) return;

      const valorData = {
        documento_instancia_id: documentoId,
        campo_plantilla_id: campoId,
        valor: valor,
        estado: estado as any,
      };

      if (valorActual?.id) {
        // Actualizar valor existente
        await valorCampoService.save(
          { valor: valorData.valor, estado: valorData.estado },
          valorActual.id
        );
      } else {
        // Crear nuevo valor
        await valorCampoService.save(valorData);
      }

      // Recargar valores
      await loadValores();
    } catch (err) {
      console.error('Error guardando valor:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const camposActivos = campos.filter(
    (c) => (c.area_seccion || 'Campos Generales') === activeTab
  ).sort((a, b) => (a.orden || 0) - (b.orden || 0));

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center h-64">
        <div className="text-base text-gray-600">Cargando campos...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header con botón de volver */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {campos[0]?.plantilla_nombre || 'Editar Documento'}
          </h2>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-8">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-base font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contenido del formulario */}
      <div className="container mx-auto px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="space-y-6">
            {camposActivos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-base text-gray-600">
                  No hay campos asignados a tu rol en esta sección
                </p>
              </div>
            ) : (
              camposActivos.map((campo) => {
                const valorActual = valores.get(campo.id);
                return (
                  <CampoFormulario
                    key={campo.id}
                    campo={campo}
                    valorInicial={valorActual?.valor || ''}
                    estadoInicial={valorActual?.estado || 'EN_PROCESO'}
                    onSave={handleSave}
                    saving={saving}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: CampoFormulario
// Renderiza un campo según su tipo
// ============================================================================

interface CampoFormularioProps {
  campo: CampoPlantillaConPlantilla;
  valorInicial: string;
  estadoInicial: string;
  onSave: (campoId: string, valor: string, estado: string) => Promise<void>;
  saving: boolean;
}

const CampoFormulario: React.FC<CampoFormularioProps> = ({
  campo,
  valorInicial,
  estadoInicial,
  onSave,
  saving,
}) => {
  const [valor, setValor] = useState(valorInicial);
  const [estado, setEstado] = useState(estadoInicial);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setValor(valorInicial);
    setEstado(estadoInicial);
    setHasChanges(false);
  }, [valorInicial, estadoInicial]);

  const handleChange = (newValor: string) => {
    setValor(newValor);
    setHasChanges(true);
  };

  const handleEstadoChange = (newEstado: string) => {
    setEstado(newEstado);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(campo.id, valor, estado);
    setHasChanges(false);
  };

  const renderCampo = () => {
    switch (campo.tipo) {
      case 'texto':
        return (
          <input
            type="text"
            value={valor}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={campo.configuracion?.placeholder || ''}
            required={campo.configuracion?.requerido}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={valor}
            onChange={(e) => handleChange(e.target.value)}
            rows={campo.configuracion?.filas || 4}
            placeholder={campo.configuracion?.placeholder || ''}
            required={campo.configuracion?.requerido}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        );

      case 'numero':
        return (
          <input
            type="number"
            value={valor}
            onChange={(e) => handleChange(e.target.value)}
            min={campo.configuracion?.min}
            max={campo.configuracion?.max}
            required={campo.configuracion?.requerido}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        );

      case 'fecha':
        return (
          <input
            type="date"
            value={valor}
            onChange={(e) => handleChange(e.target.value)}
            required={campo.configuracion?.requerido}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        );

      case 'seleccion':
        const opciones = campo.configuracion?.opciones || [];
        return (
          <select
            value={valor}
            onChange={(e) => handleChange(e.target.value)}
            required={campo.configuracion?.requerido}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Seleccione...</option>
            {Array.isArray(opciones) && opciones.map((opt: any, idx: number) => (
              <option key={idx} value={typeof opt === 'string' ? opt : opt.valor}>
                {typeof opt === 'string' ? opt : opt.etiqueta}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={valor}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        );
    }
  };

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      <div className="flex items-start justify-between mb-2">
        <label className="block text-base font-medium text-gray-700">
          {campo.pregunta}
          {campo.configuracion?.requerido && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        {hasChanges && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="ml-4 px-4 py-1 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </div>
      {renderCampo()}
      {campo.descripcion && (
        <p className="mt-1 text-sm text-gray-500">{campo.descripcion}</p>
      )}
      {/* Selector de estado */}
      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estado del campo:
        </label>
        <select
          value={estado}
          onChange={(e) => handleEstadoChange(e.target.value)}
          disabled={saving}
          className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_PROCESO">En Proceso</option>
          <option value="COMPLETADO">Completado</option>
          <option value="REVISADO">Revisado</option>
        </select>
      </div>
    </div>
  );
};

