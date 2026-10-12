# HU-18 — Plan de Implementación: Registrar Congresos o Coloquios

## Metadatos
- **ID:** HU-18
- **Épica:** E06 — Trayectoria Académica
- **Sprint:** Sprint 4
- **Equipo Responsable:** Equipo 1
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-03 (Registrar estudiante), HU-05 (Gestionar semestres), HU-21 (Cargar evidencias)

---

## 1. Definición y Objetivo
**Como** estudiante doctoral,  
**quiero** registrar mi participación y ponencias en congresos, simposios y coloquios de investigación,  
**para** acreditar la divulgación científica y retroalimentación externa de mi tesis requerida en el programa doctoral.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-18.1:** El registro debe permitir distinguir claramente entre los tipos de evento: `CONGRESO`, `COLOQUIO` y `SIMPOSIO`.
- **CA-18.2:** Campos obligatorios de captura:
  - Título de la ponencia o trabajo presentado.
  - Nombre formal del evento.
  - Tipo de evento (`CONGRESO` / `COLOQUIO` / `SIMPOSIO`).
  - Modalidad de participación (`PRESENCIAL`, `VIRTUAL`, `HIBRIDA`).
  - Rol de participación (`PONENTE`, `CONFERENCISTA_MAGISTRAL`, `ASISTENTE`).
  - Fecha de realización (o fecha de inicio y fin).
  - Lugar / Ciudad / País sede.
  - Semestre académico al que corresponde.
- **CA-18.3:** Si el rol es `PONENTE`, debe ser obligatorio adjuntar la constancia o carta de aceptación como evidencia (`evidencia_id`).
- **CA-18.4:** La fecha del evento no puede ser posterior a la fecha actual del sistema para eventos ya realizados.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Listar y Registrar Eventos
- **Rutas:**
  - `GET /api/v1/academic-output/events/?student=4` (Paginado)
  - `POST /api/v1/academic-output/events/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "student": 4,
  "semester": 2,
  "titulo_trabajo": "Algoritmos genéticos paralelos aplicados a optimización energética",
  "nombre_evento": "Congreso Internacional de Computación CIC 2026",
  "tipo_evento": "CONGRESO",
  "modalidad": "PRESENCIAL",
  "rol_participacion": "PONENTE",
  "lugar": "Ciudad de México, México",
  "fecha_evento": "2026-06-15",
  "evidencia": 14
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 8,
  "student": 4,
  "semester": 2,
  "titulo_trabajo": "Algoritmos genéticos paralelos aplicados a optimización energética",
  "nombre_evento": "Congreso Internacional de Computación CIC 2026",
  "tipo_evento": "CONGRESO",
  "modalidad": "PRESENCIAL",
  "rol_participacion": "PONENTE",
  "lugar": "Ciudad de México, México",
  "fecha_evento": "2026-06-15",
  "evidencia": 14,
  "created_at": "2026-09-14T12:00:00Z"
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_academicevent`)
- Modelo: `AcademicEvent` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `student`: ForeignKey(`Student`, on_delete=CASCADE, related_name='academic_events')
  - `semester`: ForeignKey(`Semester`, on_delete=CASCADE)
  - `titulo_trabajo`: CharField(max_length=255)
  - `nombre_evento`: CharField(max_length=255)
  - `tipo_evento`: CharField(max_length=50, choices=EventType.choices)
  - `modalidad`: CharField(max_length=20, choices=Modality.choices)
  - `rol_participacion`: CharField(max_length=50, default='PONENTE')
  - `lugar`: CharField(max_length=255, blank=True, default='')
  - `fecha_evento`: DateField()
  - `evidencia`: ForeignKey(`Evidence`, null=True, blank=True, on_delete=SET_NULL)

### 4.2. Serializers y Vistas
- `AcademicEventSerializer`: Validación de constancia obligatoria para ponentes.
- `AcademicEventViewSet`: Paginado estándar y permisos relacionales.

### 4.3. Pruebas Backend (`test_hu18.py`)
- Creación válida de congreso con rol `PONENTE` y evidencia $\rightarrow$ `201 Created`.
- Intento de crear ponencia sin evidencia adjunta $\rightarrow$ `400 Bad Request`.
- Verificación de choices válidos de `tipo_evento`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `AcademicEventFormComponent` (`src/app/academic-output/event-form.ts`).
  - Radio buttons o segmented control para `CONGRESO` vs `COASESOR/SIMPOSIO`.
  - Selector de modalidad (Presencial, Virtual, Híbrida).
  - Selector de archivo de constancia vinculada.
- Lista de eventos académicos en el expediente con filtros por semestre.

---

## 6. Definition of Done (DoD)
- [ ] Endpoints `/api/v1/academic-output/events/` probados y operativos.
- [ ] Validación de evidencia para ponentes probada en tests backend (`test_hu18.py`).
- [ ] Interfaz de captura y visualización de eventos integrada en frontend con diseño responsivo.
