# HU-09 — Plan de Implementación: Registrar Observaciones y Minutas

## Metadatos
- **ID:** HU-09
- **Épica:** E03 — Tutorías
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-07 (Registrar sesión de tutoría)

---

## 1. Definición y Objetivo
**Como** asesor, coasesor o integrante del comité tutor,  
**quiero** registrar observaciones detalladas, comentarios técnicos y minutas de avance asociadas a una tutoría específica,  
**para** conservar la memoria académica de la retroalimentación brindada al estudiante e identificar al autor responsable de cada observación.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-09.1:** Se pueden registrar múltiples observaciones independientes dentro de una misma sesión de tutoría.
- **CA-09.2:** Cada observación debe identificar de forma inmutable al usuario que la emitió (`autor`) y la fecha/hora de registro (`created_at`).
- **CA-09.3:** La observación debe contener al menos 10 caracteres y no exceder 5000 caracteres.
- **CA-09.4:** Solo los integrantes del comité tutorial vinculados al estudiante pueden añadir observaciones.
- **CA-09.5:** Una vez registrada una observación, su autor y fecha de registro son de solo lectura para preservar la fidelidad de la minuta.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Listar Observaciones
- **Ruta:** `GET /api/v1/tutoring-sessions/{id}/observations/`
- **Autenticación:** `Bearer <access_token>`
- **Response (`200 OK`):** Arreglo de observaciones ordenadas cronológicamente por `created_at`.

### 3.2. Crear Observación
- **Ruta:** `POST /api/v1/tutoring-sessions/{id}/observations/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "observacion": "Se recomienda enriquecer el estado del arte con referencias a literatura publicada entre 2024 y 2026 sobre redes neuronales difusas."
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 42,
  "session": 12,
  "autor": 2,
  "autor_nombre": "Dr. Roberto Gómez",
  "observacion": "Se recomienda enriquecer el estado del arte con referencias a literatura publicada entre 2024 y 2026 sobre redes neuronales difusas.",
  "created_at": "2026-09-14T11:30:00Z"
}
```

#### Respuestas de Error:
- `400 Bad Request`: Texto de observación vacío o menor a 10 caracteres.
- `403 Forbidden`: Usuario no pertenece al comité de la sesión.
- `404 Not Found`: Sesión de tutoría inexistente.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_tutoringobservation`)
- Modelo: `TutoringObservation` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `session`: ForeignKey(`TutoringSession`, on_delete=CASCADE, related_name='observations')
  - `autor`: ForeignKey(`CustomUser`, on_delete=SET_NULL, null=True)
  - `observacion`: TextField()
  - `created_at`: DateTimeField(auto_now_add=True)

### 4.2. Serializers y Vistas
- `TutoringObservationSerializer`: Inclusión de `autor_nombre` de solo lectura (`SerializerMethodField`).
- Asignación obligatoria de `autor = request.user` en `perform_create()`.
- Acción anidada en `TutoringSessionViewSet`: `@action(detail=True, methods=['get', 'post'], url_path='observations')`.

### 4.3. Pruebas Backend (`test_hu09.py`)
- Creación de observación por tutor asignado $\rightarrow$ `201 Created` con autor asignado.
- Creación de múltiples observaciones en una misma sesión $\rightarrow$ ambas persistidas con orden cronológico.
- Rechazo de observación con texto en blanco $\rightarrow$ `400 Bad Request`.
- Usuario ajeno al comité intentando registrar $\rightarrow$ `403 Forbidden`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `TutoringObservationsComponent` con listado tipo feed cronológico de minutas.
- Card por observación mostrando:
  - Avatar o iniciales del autor.
  - Nombre completo y cargo en el comité.
  - Fecha relativa o formateada (ej. "14 sep 2026, 11:30").
  - Texto completo de la observación.
- Formulario de captura rápida con textarea autoajustable y botón "Agregar observación".

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Lista semántica `<section aria-label="Minutas y observaciones de la tutoría">`.
- Live region (`aria-live="polite"`) para anunciar nuevas observaciones agregadas dinámicamente.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/tutoring-sessions/{id}/observations/` probado con SimpleJWT.
- [ ] Autoría inmutable verificada en base de datos (`autor` fijado en backend).
- [ ] Pruebas unitarias backend (`test_hu09.py`) aprobadas al 100%.
- [ ] Feed de observaciones integrado en la interfaz de tutoría del frontend con diseño Inter responsivo.
