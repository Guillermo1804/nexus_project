# HU-19 — Plan de Implementación: Registrar Estancias de Investigación Doctorales

## Metadatos
- **ID:** HU-19
- **Épica:** E06 — Trayectoria Académica
- **Sprint:** Sprint 4
- **Equipo Responsable:** Equipo 3
- **Prioridad:** Medium (Valor Medio)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-03 (Registrar estudiante), HU-05 (Gestionar semestres), HU-21 (Cargar evidencias)

---

## 1. Definición y Objetivo
**Como** estudiante doctoral o asesor tutor,  
**quiero** registrar estancias de investigación nacionales e internacionales realizadas en otras instituciones académicas o laboratorios,  
**para** documentar la movilidad académica, el trabajo de campo y las colaboraciones institucionales en el expediente doctoral.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-19.1:** Campos obligatorios de captura de la estancia:
  - Institución receptora de destino.
  - País y ciudad de la institución.
  - Periodo de duración: `fecha_inicio` y `fecha_fin` (`fecha_fin >= fecha_inicio`).
  - Investigador anfitrión o responsable en la institución receptora.
  - Objetivos académicos de la estancia.
  - Actividades y técnicas desarrolladas.
  - Resultados obtenidos / entregables pactados.
  - Semestre académico en que se cursó la estancia.
- **CA-19.2:** Debe adjuntarse obligatoriamente la carta de aceptación o constancia oficial de conclusión como evidencia (`evidencia_id`).
- **CA-19.3:** Si la estancia es futura o está en curso, se valida la fecha de inicio y el plan de trabajo.
- **CA-19.4:** Autorización: Solo el estudiante evaluado y su comité tutorial pueden registrar o modificar estancias.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Listar y Registrar Estancias
- **Rutas:**
  - `GET /api/v1/academic-output/research-stays/?student=4` (Paginado)
  - `POST /api/v1/academic-output/research-stays/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "student": 4,
  "semester": 3,
  "institucion_destino": "Universidad Politécnica de Madrid",
  "pais": "España",
  "ciudad": "Madrid",
  "fecha_inicio": "2026-02-01",
  "fecha_fin": "2026-05-31",
  "investigador_anfitrion": "Dr. Javier Aracil",
  "objetivos": "Desarrollo de experimentos en banco de pruebas de microrredes inteligentes.",
  "actividades": "Implementación de controladores en tiempo real en hardware en el lazo.",
  "resultados": "Artículo enviado a revista Q1 y validación empírica del algoritmo.",
  "evidencia": 16
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 4,
  "student": 4,
  "semester": 3,
  "institucion_destino": "Universidad Politécnica de Madrid",
  "pais": "España",
  "ciudad": "Madrid",
  "fecha_inicio": "2026-02-01",
  "fecha_fin": "2026-05-31",
  "duracion_dias": 120,
  "investigador_anfitrion": "Dr. Javier Aracil",
  "evidencia": 16,
  "created_at": "2026-09-14T12:00:00Z"
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_researchstay`)
- Modelo: `ResearchStay` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `student`: ForeignKey(`Student`, on_delete=CASCADE, related_name='research_stays')
  - `semester`: ForeignKey(`Semester`, on_delete=CASCADE)
  - `institucion_destino`: CharField(max_length=255)
  - `pais`: CharField(max_length=100)
  - `ciudad`: CharField(max_length=100, blank=True, default='')
  - `fecha_inicio`: DateField()
  - `fecha_fin`: DateField()
  - `investigador_anfitrion`: CharField(max_length=255)
  - `objetivos`: TextField()
  - `actividades`: TextField(blank=True, default='')
  - `resultados`: TextField(blank=True, default='')
  - `evidencia`: ForeignKey(`Evidence`, null=True, blank=True, on_delete=SET_NULL)

### 4.2. Validaciones en `ResearchStaySerializer`
- Validación cruzada: `fecha_fin >= fecha_inicio`.
- Validación de que la evidencia adjunta pertenezca al estudiante.

### 4.3. Pruebas Backend (`test_hu19.py`)
- Creación válida de estancia con fechas coherentes $\rightarrow$ `201 Created`.
- Rechazo cuando `fecha_fin < fecha_inicio` $\rightarrow$ `400 Bad Request`.
- Validación de institución y país obligatorios $\rightarrow$ `400 Bad Request`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `ResearchStayFormComponent` (`src/app/academic-output/research-stay-form.ts`).
  - Inputs para institución, país, ciudad y anfitrión.
  - Selector de rango de fechas con validación reactiva cruzada.
  - Textareas para objetivos y resultados.
- Visualización de estancias en la pestaña "Movilidad y Estancias" del expediente con badge de país y duración en meses.

---

## 6. Definition of Done (DoD)
- [ ] Endpoints `/api/v1/academic-output/research-stays/` probados y operativos.
- [ ] Validación de consistencia temporal de fechas aprobada en backend (`test_hu19.py`).
- [ ] Interfaz de captura de estancias integrada y accesible en el frontend.
