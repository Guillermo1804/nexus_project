# HU-23 — Plan de Implementación: Línea de Tiempo Longitudinal Multi-Nodo (Hito MVP)

## Metadatos
- **ID:** HU-23
- **Épica:** E08 — Seguimiento Longitudinal
- **Sprint:** Sprint 3
- **Equipo Responsable:** Equipo 3
- **Prioridad:** Must (Alto Valor — **Hito Central MVP**)
- **Story Points:** 8 SP
- **Prerrequisitos de Dominio:** HU-07 (Tutorías), HU-11 (Acuerdos), HU-15 (Avance de tesis), HU-21 (Evidencias)

---

## 1. Definición y Objetivo
**Como** estudiante doctoral, asesor, coasesor o coordinador de posgrado,  
**quiero** visualizar la trayectoria académica completa del estudiante integrada en una línea de tiempo cronológica e interactiva,  
**para** comprender de forma holística la evolución del doctorando a través de los semestres, correlacionando tutorías, acuerdos, avances de tesis y evidencias en un solo lienzo visual.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-23.1:** El timeline debe agregar y ordenar cronológicamente en un único feed temporal los siguientes nodos de eventos (Fase 1 / MVP):
  - **Tutoría:** Sesiones celebradas con modalidad y participantes.
  - **Acuerdos:** Compromisos generados y sus cambios de estado.
  - **Avance de Tesis:** Porcentajes y componentes de investigación capturados.
  - **Evidencias:** Archivos cargados o enlaces DOI asociados.
- **CA-23.2:** Cada nodo del timeline debe contener metadatos uniformes:
  - `tipo_evento` (`TUTORIA`, `ACUERDO`, `TESIS`, `EVIDENCIA`).
  - `fecha_evento` (`YYYY-MM-DD` o ISO 8601).
  - `titulo` conciso.
  - `resumen` descriptivo.
  - `autor` o actor responsable.
  - `enlace_recurso` o identificador de referencia para profundizar.
  - `icono_badge` y color semafórico institucional.
- **CA-23.3:** El timeline debe agruparse visualmente por semestres académicos (Semestre 1 a 6).
- **CA-23.4:** Debe permitir filtrado dinámico en frontend por tipo de evento (mostrar/ocultar tutorías, acuerdos, tesis o evidencias).
- **CA-23.5:** Autorización RBAC: solo visible para el estudiante propietario, integrantes de su comité tutorial y coordinador del programa.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint de Línea de Tiempo
- **Ruta:** `GET /api/v1/monitoring/timeline/?student=4`
- **Autenticación:** `Bearer <access_token>`

#### Response Payload (`200 OK`):
```json
{
  "student": {
    "id": 4,
    "matricula": "DOC250002",
    "nombre_completo": "Diego Fuentes"
  },
  "semestres": [
    {
      "id": 1,
      "numero": 1,
      "activo": true,
      "eventos": [
        {
          "id": "tutoria-12",
          "tipo": "TUTORIA",
          "fecha": "2026-09-14",
          "titulo": "Sesión de tutoría 1 (Presencial)",
          "descripcion": "Revisión del marco teórico y ajuste metodológico.",
          "actor": "Dr. Roberto Gómez",
          "metadata": { "modalidad": "PRESENCIAL", "proxima_reunion": "2026-10-14" }
        },
        {
          "id": "acuerdo-85",
          "tipo": "ACUERDO",
          "fecha": "2026-09-14",
          "titulo": "Acuerdo: Entrega de capítulo 3",
          "descripcion": "Entregar versión preliminar del capítulo 3.",
          "actor": "Diego Fuentes",
          "estado": "PENDIENTE",
          "estado_efectivo": "PENDIENTE",
          "fecha_limite": "2026-10-31"
        },
        {
          "id": "tesis-9",
          "tipo": "TESIS",
          "fecha": "2026-09-14",
          "titulo": "Avance de tesis: 35%",
          "descripcion": "Recolección de muestras biológicas.",
          "actor": "Diego Fuentes",
          "porcentaje": 35
        },
        {
          "id": "evidencia-14",
          "tipo": "EVIDENCIA",
          "fecha": "2026-09-14",
          "titulo": "Minuta firmada de tutoría 1",
          "descripcion": "Documento PDF firmado.",
          "archivo_url": "/media/evidencias/2026/09/minuta_1.pdf"
        }
      ]
    }
  ]
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Servicio Agregador de Dominio (`TimelineService`)
- En `Backend/nexus/nexus/services/timeline_service.py`:
  - Consulta optimizada con `select_related`/`prefetch_related` para evitar N+1 sobre semestres, tutorías, acuerdos, avances y evidencias.
  - Consolidación y ordenamiento por fecha de cada nodo de evento.
  - Serialización estructurada en un DTO limpio y ligero.

### 4.2. Vista de Línea de Tiempo
- `TimelineView(APIView)` en `Backend/nexus/nexus/views.py`.
- Permiso `IsAuthenticated` + `can_access_student(request.user, student)`.
- Registro de ruta en `urls.py`: `path('api/v1/monitoring/timeline/', TimelineView.as_view(), name='timeline')`.

### 4.3. Pruebas Backend (`test_hu23.py`)
- Consulta autorizada con múltiples tipos de eventos $\rightarrow$ `200 OK` con eventos ordenados cronológicamente.
- Verificación de agrupación correcta por semestre.
- Intento de consulta de timeline ajeno por estudiante $\rightarrow$ `404 Not Found`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `TimelineComponent` (`src/app/shared/components/timeline/timeline.ts`).
  - Eje vertical con nodos gráficos circulares (iconos según tipo de evento: birrete, portapapeles, documento, gráfico).
  - Cards de evento con animaciones sutiles (`@fade`), badges semafóricos y fecha legible.
  - Barra de filtros de eventos (botones de conmutación: "Todos", "Tutorías", "Acuerdos", "Tesis", "Evidencias").
- Integración en la pestaña "Línea de Tiempo" de `StudentOverviewComponent`.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Lista ordenada semántica `<ol aria-label="Trayectoria cronológica del estudiante">`.
- Cada nodo cuenta con encabezado jerárquico `<h3>` y anuncio claro del tipo de actividad.
- Respeta `@media (prefers-reduced-motion: reduce)` suprimiendo transiciones en el timeline.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/monitoring/timeline/` optimizado contra N+1 y validado con SimpleJWT.
- [ ] Integración multi-nodo funcional (Tutorías + Acuerdos + Tesis + Evidencias).
- [ ] Componente `TimelineComponent` integrado y probado en Angular con diseño responsivo.
- [ ] Pruebas unitarias backend (`test_hu23.py`) y frontend aprobadas al 100%.
- [ ] Demostración funcional completa del Hito MVP lista en entorno de desarrollo.
