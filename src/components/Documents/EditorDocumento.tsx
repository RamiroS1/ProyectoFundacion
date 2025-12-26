// ============================================================================
// COMPONENTE: EditorDocumento
// Editor de campos del documento organizado en tabs
// Se muestra en ruta dinámica /documentos/:documentoId
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campoPlantillaService, valorCampoService, documentoInstanciaService } from '../../services/supabase.service';
import { useAuth } from '../../contexts/AuthContext';
import type { CampoPlantillaConPlantilla, ValorCampoConCampo } from '../../types/database.types';

export const EditorDocumento: React.FC = () => {
  const { documentoId } = useParams<{ documentoId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [plantillaId, setPlantillaId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [campos, setCampos] = useState<CampoPlantillaConPlantilla[]>([]);
  const [valores, setValores] = useState<Map<string, ValorCampoConCampo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentoId) {
      initializeDocumento();
    }
  }, [documentoId]);

  const initializeDocumento = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('EditorDocumento - Inicializando documento:', documentoId);
      
      // Obtener el documento para saber la plantilla
      const documento = await documentoInstanciaService.getById(documentoId!);
      console.log('EditorDocumento - Documento encontrado:', documento);
      
      if (!documento) {
        console.error('EditorDocumento - Documento no encontrado');
        setError('Documento no encontrado');
        return;
      }
      
      setPlantillaId(documento.plantilla_id);
      console.log('EditorDocumento - Plantilla ID:', documento.plantilla_id);
      console.log('EditorDocumento - Título del documento:', documento.titulo);
      
      // Cargar campos y valores en paralelo
      await Promise.all([
        loadCampos(documento.plantilla_id),
        loadValores(documentoId!)
      ]);
    } catch (err) {
      console.error('Error inicializando documento:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar documento');
    } finally {
      setLoading(false);
    }
  };

  const loadCampos = async (plantillaId: string) => {
    try {
      console.log('EditorDocumento - Cargando campos para plantilla:', plantillaId);
      // Obtener campos asignados al rol del usuario para esta plantilla
      const camposData = await campoPlantillaService.getCamposByPlantilla(plantillaId);
      console.log('EditorDocumento - Campos cargados:', camposData.length);
      console.log('EditorDocumento - Campos:', camposData);
      
      // Organizar campos por área_seccion (tabs)
      const areasUnicas = Array.from(
        new Set(camposData.map((c) => c.area_seccion).filter(Boolean))
      ) as string[];
      
      // Si no hay áreas definidas, usar un tab general
      if (areasUnicas.length === 0) {
        areasUnicas.push('Campos Generales');
      }
      
      console.log('EditorDocumento - Tabs:', areasUnicas);
      setTabs(areasUnicas);
      setActiveTab(areasUnicas[0]);
      setCampos(camposData);
    } catch (err) {
      console.error('Error cargando campos:', err);
      setError('Error al cargar campos del documento');
    }
  };

  const loadValores = async (docId: string) => {
    try {
      const valoresData = await valorCampoService.getValoresByDocumento(docId);
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

  const handleSave = async (campoId: string, valor: string, estado: string = 'EN_PROCESO') => {
    if (!documentoId) {
      alert('Error: No hay documento asociado');
      return;
    }

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
      await loadValores(documentoId);
    } catch (err) {
      console.error('Error guardando valor:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center h-64">
        <div className="text-base text-gray-600">Cargando documento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center h-64">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-base text-red-800">{error}</p>
          <button
            onClick={() => navigate('/documentos')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Volver a Mis Documentos
          </button>
        </div>
      </div>
    );
  }

  const camposActivos = campos.filter(
    (c) => (c.area_seccion || 'Campos Generales') === activeTab
  ).sort((a, b) => (a.orden || 0) - (b.orden || 0));

  console.log('EditorDocumento - Render:');
  console.log('  - Total campos:', campos.length);
  console.log('  - Tabs:', tabs);
  console.log('  - Active tab:', activeTab);
  console.log('  - Campos activos:', camposActivos.length);
  console.log('  - Valores cargados:', valores.size);

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header con botón de volver */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/documentos')}
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
                // Convertir valor a string para el formulario
                const valorString = valorActual?.valor != null 
                  ? String(valorActual.valor) 
                  : '';
                return (
                  <CampoFormulario
                    key={campo.id}
                    campo={campo}
                    valorInicial={valorString}
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

