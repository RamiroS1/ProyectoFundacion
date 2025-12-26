# Sistema de Gestión de Informes Empresariales

Sistema empresarial robusto para gestión de informes con **aislamiento total de información** por secciones, diseñado para manejar información sensible (legal, financiera, etc.).

## 🎯 Características Principales

- ✅ **Aislamiento Total**: Usuarios normales SOLO ven sus secciones asignadas
- ✅ **Seguridad por Capas**: RLS en PostgreSQL + validaciones en servicios + UI protegida
- ✅ **Versionado Automático**: Cada cambio crea una versión inmutable con auditoría completa
- ✅ **Control de Acceso Granular**: Administradores ven todo, usuarios solo lo asignado
- ✅ **Arquitectura Escalable**: Diseñado para crecer y manejar grandes volúmenes

## 🏗️ Arquitectura

```
Frontend (React + TypeScript)
    ↓
Servicios TypeScript (Validaciones + Consultas Seguras)
    ↓
Supabase Client
    ↓
PostgreSQL + Row Level Security (RLS)
    ↓
Base de Datos (Tablas + Políticas + Triggers)
```

## 🚀 Inicio Rápido

### 1. Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno (.env.local)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
```

### 2. Configurar Base de Datos

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Abre el SQL Editor
3. Ejecuta `database/schema.sql`
4. Ejecuta `database/rls_policies.sql`
5. Crea un usuario administrador:

```sql
UPDATE user_profiles
SET rol = 'ADMIN'
WHERE email = 'tu-email@ejemplo.com';
```

### 3. Desarrollo

```bash
npm run dev
```

### 4. Construcción

```bash
npm run build
```

## 📚 Documentación

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Arquitectura detallada del sistema
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**: Guía paso a paso de implementación
- **[database/README.md](./database/README.md)**: Documentación de la base de datos

## 🔐 Seguridad

### Principios de Seguridad

1. **Row Level Security (RLS)**: Todas las tablas tienen RLS habilitado
2. **Políticas Estrictas**: Usuarios normales NO pueden ver documentos completos
3. **Validaciones Múltiples**: Verificaciones en base de datos, servicios y UI
4. **Auditoría Inmutable**: Las versiones NO se pueden modificar ni eliminar

### Tablas y Acceso

| Tabla | Usuario Normal | Administrador |
|-------|---------------|---------------|
| `documentos` | ❌ Sin acceso | ✅ Acceso completo |
| `secciones` | ✅ Solo asignadas | ✅ Todas |
| `asignaciones_seccion` | ✅ Solo propias | ✅ Todas |
| `versiones_seccion` | ✅ Solo de sus secciones | ✅ Todas |
| `user_profiles` | ✅ Solo propio | ✅ Todos |

## 📁 Estructura del Proyecto

```
proyecto-fundacion/
├── database/
│   ├── schema.sql              # Esquema completo de BD
│   ├── rls_policies.sql        # Políticas RLS
│   └── README.md               # Doc de BD
├── src/
│   ├── types/
│   │   └── database.types.ts   # Tipos TypeScript
│   ├── services/
│   │   └── supabase.service.ts # Servicios de consulta
│   ├── contexts/
│   │   └── AuthContext.tsx     # Contexto de autenticación
│   ├── components/
│   │   ├── SeccionForm/        # Formulario de sección
│   │   ├── MisSecciones/       # Vista usuario normal
│   │   └── Admin/              # Vistas de administrador
│   ├── App.tsx                 # Componente principal
│   └── supabaseClient.js       # Cliente Supabase
├── ARCHITECTURE.md             # Arquitectura del sistema
├── IMPLEMENTATION_GUIDE.md     # Guía de implementación
└── README.md                   # Este archivo
```

## 🎨 Flujo de Usuario

### Usuario Normal

1. Inicia sesión → Ve lista de sus secciones asignadas
2. Selecciona una sección → Ve formulario aislado
3. Edita y guarda → Cambios se guardan y se crea versión automática
4. ❌ NO puede ver documento completo ni otras secciones

### Administrador

1. Inicia sesión → Ve panel de administración
2. Ve lista de TODOS los documentos
3. Selecciona un documento → Ve documento completo con TODAS las secciones
4. Puede gestionar usuarios, asignaciones y documentos

## 🔄 Versionado Automático

Cada vez que se actualiza una sección:

1. Se guarda el cambio en `secciones`
2. El trigger crea automáticamente una versión en `versiones_seccion`
3. La versión contiene:
   - Datos anteriores y nuevos
   - Usuario que hizo el cambio
   - Rol del usuario en ese momento
   - Timestamp preciso
   - Número de versión

**Las versiones son inmutables** - No se pueden modificar ni eliminar (auditoría legal).

## 🛠️ Tecnologías

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Storage)
- **Seguridad**: Row Level Security, Políticas granulares
- **Versionado**: Triggers PostgreSQL, Auditoría completa

## 📝 Ejemplo de Uso

### Crear un Documento (ADMIN)

```typescript
import { documentoService } from './services/supabase.service';

const documento = await documentoService.create({
  titulo: 'Informe Anual 2024',
  descripcion: 'Informe financiero anual',
  estado: 'BORRADOR'
});
```

### Obtener Mis Secciones (Usuario Normal)

```typescript
import { seccionService } from './services/supabase.service';

const secciones = await seccionService.getMisSecciones();
// Solo devuelve secciones asignadas al usuario actual
```

### Ver Documento Completo (Solo ADMIN)

```typescript
import { documentoService } from './services/supabase.service';

const documentoCompleto = await documentoService.getCompleto(documentoId);
// Solo funciona si el usuario es ADMIN
```

## ⚠️ Restricciones Críticas

- ❌ **NO** deshabilites RLS en producción
- ❌ **NO** crees endpoints que expongan documentos completos a usuarios normales
- ❌ **NO** modifiques las versiones (son inmutables por diseño)
- ✅ Toda seguridad debe estar en PostgreSQL mediante RLS
- ✅ Los usuarios normales NUNCA deben conocer la estructura completa del documento

## 🔍 Testing

Ver `IMPLEMENTATION_GUIDE.md` para guía completa de testing y verificación de seguridad.

## 📞 Soporte

Para problemas o preguntas:
1. Revisa la documentación en los archivos `.md`
2. Verifica los logs de Supabase para errores RLS
3. Consulta `ARCHITECTURE.md` para entender el flujo de datos

## 📄 Licencia

Este proyecto es privado y confidencial.

---

**Desarrollado con ❤️ para manejar información sensible de forma segura y escalable.**
