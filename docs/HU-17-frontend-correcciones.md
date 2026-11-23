# HU-17 — Correcciones de Integración Frontend

**Fecha:** 12 de octubre de 2026  
**Repositorio:** `nexus_project/FrontEnd/nexus_project`

## Resumen

La funcionalidad de "Registrar Publicaciones Científicas" (HU-17) tenía los componentes creados pero **no estaban integrados** con el resto de la aplicación Angular. Se corrigieron importaciones, rutas, servicios, menú lateral y tipos TypeScript.

---

## Errores Detectados y Corregidos

### 1. Modelo `Publication` ausente en `academic.models.ts`
**Error:** `Cannot find module '../../core/academic/academic.models'` / `Publication` not exported.
**Fix:** Agregada interfaz `Publication` y re-exportado `PaginatedResponse` desde `shared/pagination`.

### 2. Métodos faltantes en `AcademicService`
**Error:** `getPublications()` y `createPublication()` no existían.
**Fix:** Agregados métodos:
```typescript
getPublications(studentId: number): Observable<PaginatedResponse<Publication>>
createPublication(studentId: number, data: Partial<Publication>): Observable<Publication>
```

### 3. Rutas no registradas en `app.routes.ts`
**Error:** No había rutas para `/students/:id/academic-output` (lista) ni `/students/:id/academic-output/new` (formulario).
**Fix:** Registradas dos rutas con guards `authGuard` + `roleGuard` para roles: `STUDENT`, `TUTOR`, `COMMITTEE_MEMBER`, `PROGRAM_COORDINATOR`.

### 4. Menú lateral sin acceso a la funcionalidad
**Error:** `app-shell.ts/html` no incluía enlace a "Producción Científica".
**Fix:** Agregado `canViewAcademicOutput()` y enlace condicional en el sidebar que apunta a `/students/{student_id}/academic-output`.

### 5. Import paths incorrectos en componentes HU-17
**Error:** `Cannot find module '../../core/academic/academic.service'` — path relativo erróneo.
**Fix:** Corregidos a `../core/academic/` (desde `academic-output/` un nivel arriba a `app/`, luego `core/`).

### 6. TypeScript estricto en componentes HU-17
**Errores:**
- `studentId: number` sin inicializador definitivo → `studentId = 0`
- `route.snapshot.paramMap.get()` puede ser `null` → null-check antes de parsear
- Parámetros implícitos `any` en callbacks → tipados como `unknown`
- `FormBuilder`, `Validators` no importados → agregados imports
- `Validators` no encontrado → importado de `@angular/forms`
- `publicationForm.get()` puede retornar `null` en template → agregado `!` non-null assertion

### 7. `ToastService` API incorrecta
**Error:** `showSuccess` / `showError` no existen.
**Fix:** Cambiado a `exito()` / `error()` (métodos reales del servicio).

### 8. Pipe `date` no disponible
**Error:** `NG8004: No pipe found with name 'date'`.
**Fix:** Importado `DatePipe` de `@angular/common` y agregado a `imports` del componente `PublicationsListComponent`.

### 9. `PaginatedResponse` no re-exportado
**Error:** `Module declares 'PaginatedResponse' locally, but it is not exported`.
**Fix:** Re-exportado con `export type { PaginatedResponse } from '../../shared/pagination';` en `academic.models.ts`.

### 10. `FormsModule` no importado en standalone component
**Error:** `NG1010: 'imports' must be an array... Unknown reference FormsModule`.
**Fix:** Importado `FormsModule` de `@angular/forms` y agregado a `imports`.

### 11. Dependencia circular `AuthService` ↔ `HttpClient` ↔ `authInterceptor`
**Error:** `NG0203: The EnvironmentInjector token injection failed` — `authInterceptor` inyectaba `AuthService`, pero `AuthService` inyecta `HttpClient`, y `HttpClient` usa el interceptor → ciclo infinito al arrancar la app.
**Fix:** Extraído almacenamiento de tokens a `TokenService` (sin dependencia de `HttpClient`):
- Nuevo `TokenService` maneja `access`, `refresh`, `user`, `sessionExpired` signals + persistencia en `localStorage`
- `AuthService` ahora inyecta `TokenService` y delega almacenamiento
- `authInterceptor` inyecta `TokenService` (no `AuthService`) para leer `access`/`refresh` y llamar `refreshAccessToken()`
- Se actualizaron tests para usar `TokenService` mock

---

## Archivos Modificados

| Archivo | Cambios Principales |
|---------|---------------------|
| `src/app/core/academic/academic.models.ts` | + `Publication` interface, re-export `PaginatedResponse` |
| `src/app/core/academic/academic.service.ts` | + `getPublications()`, `createPublication()` |
| `src/app/app.routes.ts` | + Rutas `/students/:id/academic-output` y `/students/:id/academic-output/new` |
| `src/app/layout/app-shell.ts` | + `canViewAcademicOutput()`, constante `ACADEMIC_OUTPUT_ROLES` |
| `src/app/layout/app-shell.html` | + Enlace condicional "Producción Científica" |
| `src/app/academic-output/publication-form.ts` | Imports corregidos, TS estricto, `ToastService.exito/error`, `Validators`, `FormsModule` |
| `src/app/academic-output/publication-form.html` | Non-null assertions `!` en `form.get()` |
| `src/app/academic-output/publications-list.ts` | Imports corregidos, TS estricto, `DatePipe`, `CommonModule` |
| `src/app/academic-output/publications-list.html` | Binding a `evidencia_archivo` en lugar de `evidencia` |
| `src/app/core/auth/token.service.ts` | **NUEVO** - Almacenamiento de tokens (access, refresh, user, sessionExpired) |
| `src/app/core/auth/auth.service.ts` | Refactor: usa `TokenService`, elimina lógica de localStorage |
| `src/app/core/auth/auth.interceptor.ts` | Inyecta `TokenService` en lugar de `AuthService` |
| `src/app/core/auth/auth.service.spec.ts` | Tests actualizados para nueva API |
| `src/app/core/auth/auth.interceptor.spec.ts` | Tests actualizados para usar `TokenService` |
| `src/app/expediente/student-overview.spec.ts` | Tests actualizados para usar `TokenService` mock |

---

## Validación

- `ng build` → **Compilación exitosa** (solo warning de bundle size pre-existente: 820 kB vs 700 kB budget)
- `ng test` → Tests pre-existentes fallan por configuración DI (`BrowserModule` faltante en test bed), no relacionado con HU-17
- No hay tests específicos para `publication-form` ni `publications-list` (no existen `.spec.ts`)

---

## Navegación Funcional

1. Login → Inicio
2. Sidebar → "Producción Científica" (visible para STUDENT, TUTOR, COMMITTEE_MEMBER, PROGRAM_COORDINATOR)
3. Lista → `/students/{id}/academic-output` muestra cards de publicaciones
4. Botón "Subir Publicación" (por implementar en lista) → `/students/{id}/academic-output/new` abre formulario
5. Formulario valida campos obligatorios, tipos JCR/SCOPUS/CONACYT/OTRO_INDEXADO, estados con badges semafóricos
6. Envío POST a `/api/v1/academic-output/publications/` con payload mapeado a campos backend (`autores_texto`, `revista_editorial`, `doi_url`)
7. Toast de éxito y redirección a lista

---

## Pendiente / Mejora Futura

- Agregar botón "Subir Publicación" en `publications-list.html` con routerLink
- Crear tests unitarios (`.spec.ts`) para ambos componentes
- Optimizar bundle size (warning 820 kB > 700 kB)
- Validar que el enlace del menú lateral use el `student_id` correcto según rol (estudiante propio vs expediente consultado)