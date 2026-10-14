# HU-17 — Diagnóstico de Integración Frontend

**Fecha:** 12 de octubre de 2026  
**Repositorio:** `nexus_project/FrontEnd/nexus_project`

## Resumen

La funcionalidad de "Registrar Publicaciones Científicas" (HU-17) tiene componentes creados (`publication-form.ts`, `publications-list.ts` y sus templates) pero **no están integrados** con el resto de la aplicación Angular.

---

## Errores Detectados (via `ng build`)

### 1. Modelo `Publication` ausente en `academic.models.ts`
```
Cannot find module '../../core/academic/academic.models'
Import { Publication } from '...'
```
- El archivo `academic.models.ts` no exporta interfaz `Publication` ni `PaginatedResponse` (usada en el servicio).

### 2. Métodos faltantes en `AcademicService`
```
No suitable injection token for parameter 'academicService'
```
- `getPublications(studentId)` — no existe
- `createPublication(studentId, data)` — no existe
- El servicio no importa/usa `Publication` ni `PaginatedResponse`.

### 3. Rutas no registradas en `app.routes.ts`
- Falta ruta para **lista**: `/students/:id/academic-output` → `PublicationsListComponent`
- Falta ruta para **formulario**: `/students/:id/academic-output/new` → `PublicationFormComponent`
- Sin guards de autenticación/roles.

### 4. Menú lateral sin acceso a la funcionalidad
`app-shell.ts` / `app-shell.html`:
- No hay enlace a "Producción Científica" o "Subir Publicación"
- No hay verificación de permisos (`academic.read.global`, `records.read.assigned`, etc.) para mostrar el enlace.

### 5. TypeScript estricto en componentes HU-17

**`publication-form.ts`:**
- `studentId: number` sin inicializador definitivo
- `route.snapshot.paramMap.get('studentId')` puede ser `null` → error TS2531
- Parámetros implícitos `any` en callbacks: `response`, `err`

**`publications-list.ts`:**
- `studentId: number` sin inicializador definitivo
- `route.snapshot.paramMap.get('studentId')` puede ser `null`
- `AcademicService` no inyectable correctamente (falta `providedIn: 'root'` o provider en config)
- Parámetros implícitos `any` en callbacks: `data`, `err`
- Import path a `academic.service` / `academic.models` no resuelve (aunque el path relativo es correcto, falla por los errores anteriores)

### 6. Template usa propiedades no tipadas
`publications-list.html` referencia:
- `publication.evidencia_archivo` — no existe en interfaz `Publication`
- `publication.evidencia` como objeto con URL — el backend devuelve `evidencia` como ID o expandido

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/app/core/academic/academic.models.ts` | Agregar `Publication`, `PaginatedResponse` |
| `src/app/core/academic/academic.service.ts` | Agregar `getPublications()`, `createPublication()` |
| `src/app/app.routes.ts` | Registrar rutas `/students/:id/academic-output` y `/students/:id/academic-output/new` |
| `src/app/layout/app-shell.ts` | Agregar permiso/enlace a "Producción Científica" |
| `src/app/layout/app-shell.html` | Renderizar enlace condicional |
| `src/app/academic-output/publication-form.ts` | Corregir TS: inicializadores, tipos callbacks, null-check |
| `src/app/academic-output/publications-list.ts` | Corregir TS: inicializadores, tipos callbacks, inyección service |
| `src/app/academic-output/publications-list.html` | Ajustar binding a campos reales de `Publication` |

---

## Validación Esperada

- `ng build` → **0 errores**
- `ng test` → Tests pasan
- Navegación funcional: Inicio → Expediente → pestaña "Producción Científica" → listar / crear
- Permisos respetados (estudiante propio, tutor/comité asignado, coordinador)

---

## Estado

⏳ Pendiente implementación y pruebas.