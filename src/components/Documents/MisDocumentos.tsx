// ============================================================================
// COMPONENTE: MisDocumentos
// Lista de plantillas disponibles para editar
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentoInstanciaService, plantillaService } from '../../services/supabase.service';
import type { DocumentoInstanciaConProgreso, PlantillaDocumento } from '../../types/database.types';

export const MisDocumentos: React.FC = () => {
  const [documentos, setDocumentos] = useState<DocumentoInstanciaConProgreso[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlantillas, setShowPlantillas] = useState(true); // Toggle entre plantillas y documentos

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar plantillas disponibles y documentos en paralelo
      const [plantillasData, documentosData] = await Promise.all([
        plantillaService.getPlantillasDisponibles().catch((err) => {
          console.error('Error cargando plantillas:', err);
          return [];
        }),
        documentoInstanciaService.getMisDocumentos().catch((err) => {
          console.error('Error cargando documentos:', err);
          return [];
        })
      ]);
      
      console.log('Plantillas cargadas:', plantillasData.length);
      console.log('Documentos cargados:', documentosData.length);
      
      setPlantillas(plantillasData);
      setDocumentos(documentosData);
    } catch (err) {
      console.error('Error cargando datos:', err);
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
          Selecciona una plantilla o documento para comenzar a editar
        </p>
        
        {/* Tabs para alternar entre plantillas y documentos */}
        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => setShowPlantillas(true)}
            className={`px-4 py-2 text-base font-medium rounded-lg transition-colors ${
              showPlantillas
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Plantillas Disponibles ({plantillas.length})
          </button>
          <button
            onClick={() => setShowPlantillas(false)}
            className={`px-4 py-2 text-base font-medium rounded-lg transition-colors ${
              !showPlantillas
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mis Documentos ({documentos.length})
          </button>
        </div>
      </div>

      {/* Lista de plantillas o documentos */}
      <div className="container mx-auto px-8 py-8">
        {showPlantillas ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plantillas.map((plantilla) => (
                <PlantillaCard 
                  key={plantilla.id} 
                  plantilla={plantilla}
                />
              ))}
            </div>
            {plantillas.length === 0 && (
              <div className="text-center py-12">
                <p className="text-base text-gray-600">
                  No hay plantillas disponibles para tu rol
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documentos.map((doc) => (
                <DocumentoCard 
                  key={doc.id} 
                  documento={doc}
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
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: PlantillaCard
// Tarjeta de plantilla disponible
// ============================================================================

interface PlantillaCardProps {
  plantilla: PlantillaDocumento;
}

const PlantillaCard: React.FC<PlantillaCardProps> = ({ plantilla }) => {
  const navigate = useNavigate();

  const handleClick = async () => {
    try {
      // Buscar o crear documento para esta plantilla
      const documento = await documentoInstanciaService.findOrCreateDocumento(plantilla.id);
      // Navegar a la ruta del documento
      navigate(`/documentos/${documento.id}`);
    } catch (error) {
      console.error('Error creando documento:', error);
      alert('Error al abrir el documento. Intenta nuevamente.');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 text-left w-full"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-600"
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
            {plantilla.nombre}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            Código: {plantilla.codigo}
          </p>
          <p className="text-base text-gray-600">
            Haz clic para crear o editar documento
          </p>
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// COMPONENTE: DocumentoCard
// Tarjeta de documento individual
// ============================================================================

interface DocumentoCardProps {
  documento: DocumentoInstanciaConProgreso;
}

const DocumentoCard: React.FC<DocumentoCardProps> = ({ documento }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navegar a la ruta dinámica del documento
    navigate(`/documentos/${documento.id}`);
  };

  const nombreDocumento = documento.plantilla_nombre || 'Documento sin nombre';
  const progreso = documento.progreso_completitud || 0;

  return (
    <button
      onClick={handleClick}
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


