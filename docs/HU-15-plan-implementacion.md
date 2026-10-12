# HU-15 — Plan de Implementación: Registrar Avance de Tesis

## Metadatos
- **ID:** HU-15
- **Épica:** E05 — Seguimiento de Tesis
- **Sprint:** Sprint 3
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 8 SP
- **Prerrequisitos de Dominio:** HU-03 (Registrar estudiante), HU-05 (Gestionar semestres)

---

## 1. Definición y Objetivo
**Como** estudiante doctoral o asesor tutor asignado,  
**quiero** registrar el porcentaje global de avance de investigación (0% a 100%) y el desglose de avance por componentes clave de la tesis doctoral,  
**para** documentar formalmente la evolución del trabajo de grado, respaldar los informes semestrales y alimentar la línea de tiempo longitudinal.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-15.1:** Todo registro de avance debe asociarse estrictamente a un estudiante y a un semestre académico perteneciente a dicho estudiante.
- **CA-15.2:** El porcentaje global (`porcentaje_avance`) debe ser un número entero o decimal dentro del rango cerrado de 0 a 100 inclusive.
- **CA-15.3:** Debe admitir el desglose cualitativo/cuantitativo en formato estructurado (`componentes_json`) para las siguientes áreas canónicas:
  - Protocolo y delimitación.
  - Estado del arte y marco teórico.
  - Metodología y diseño experimental.
  - Desarrollo / Recolección de datos.
  - Análisis de resultados.
  - Redacción de capítulos de tesis.
- **CA-15.4:** Se debe registrar inmutablemente el usuario que capturó el avance (`registrado_por`) y la fecha de registro.
- **CA-15.5:** El registro previo de avances no debe sobreescribirse; cada nuevo avance genera una nueva entrada histórica en la base de datos.
- **CA-15.6:** Autorización: Solo el propio estudiante o los integrantes activos de su comité tutorial pueden registrar avances.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Registrar Avance de Tesis
- **Ruta:** `POST /api/v1/thesis/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "student": 4,
  "semester": 1,
  "porcentaje_avance": 35,
  "observaciones": "Se completó la recolección de muestras biológicas y se inició el análisis cuantitativo.",
  "componentes_json": {
    "protocolo": 100,
    "marco_teorico": 80,
    "metodologia": 60,
    "recoleccion_datos": 40,
    "analisis_resultados": 15,
    "redaccion_capitulos": 10
  }
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 9,
  "student": 4,
  "semester": 1,
  "porcentaje_avance": 35,
  "observaciones": "Se completó la recolección de muestras biológicas y se inició el análisis cuantitativo.",
  "componentes_json": {
    "protocolo": 100,
    "marco_teorico": 80,
    "metodologia": 60,
    "recoleccion_datos": 40,
    "analisis_resultados": 15,
    "redaccion_capitulos": 10
  },
  "registrado_por": 15,
  "registrado_por_nombre": "Diego Fuentes",
  "created_at": "2026-09-14T12:00:00Z"
}
```

### 3.2. Consultar Último Avance
- **Ruta:** `GET /api/v1/thesis/latest/?student=4`
- **Response (`200 OK`):** Objeto del último avance o `null` si no hay avances registrados.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_thesisprogress`)
- Modelo: `ThesisProgress` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `student`: ForeignKey(`Student`, on_delete=CASCADE, related_name='thesis_progresses')
  - `semester`: ForeignKey(`Semester`, on_delete=CASCADE, related_name='thesis_progresses')
  - `porcentaje_avance`: PositiveSmallIntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
  - `observaciones`: TextField(blank=True, default='')
  - `componentes_json`: JSONField(default=dict, blank=True)
  - `registrado_por`: ForeignKey(`CustomUser`, on_delete=SET_NULL, null=True)
  - `created_at`: DateTimeField(auto_now_add=True)

### 4.2. Serializers y Vistas
- `ThesisProgressSerializer`: Validación del rango 0–100 en `porcentaje_avance` y validación de esquema en `componentes_json`.
- `ThesisProgressViewSet`: Permisos por relación mediante `can_access_student(..., write=True)`. Asignación de `registrado_por = request.user`.

### 4.3. Pruebas Backend (`test_hu15.py`)
- Registro exitoso con porcentaje 35% y componentes $\rightarrow$ `201 Created`.
- Rechazo de porcentaje < 0 o > 100 $\rightarrow$ `400 Bad Request`.
- Rechazo de semestre ajeno al estudiante $\rightarrow$ `400 Bad Request`.
- Intento de captura por usuario no vinculado al estudiante $\rightarrow$ `403 Forbidden`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `ThesisProgressFormComponent` (`src/app/thesis/thesis-progress-form.ts`).
  - Slider o input numérico para el porcentaje global (0–100%) con barra visual en tiempo real.
  - Acordeón interactivo para calificar cada componente temático con sliders de 0% a 100%.
  - Textarea para observaciones y síntesis del avance.
- Integración en `StudentOverviewComponent`:
  - Barra de progreso general con valor ARIA y botón "Registrar avance de tesis" habilitado para estudiante y comité.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Controles de barra de progreso con atributos semánticos: `role="progressbar"`, `aria-valuenow="35"`, `aria-valuemin="0"`, `aria-valuemax="100"`.
- Los sliders son completamente operables mediante las flechas del teclado.

---

## 6. Definition of Done (DoD)
- [ ] Endpoints `POST /api/v1/thesis/` y `GET /api/v1/thesis/latest/` implementados y probados.
- [ ] Validación de rango 0–100 y estructura JSON probada en backend.
- [ ] Pruebas unitarias backend (`test_hu15.py`) y frontend aprobadas al 100%.
- [ ] Visualización del avance integrada en el expediente del estudiante.
