# HU-24 — Plan de Implementación: Dashboard Ejecutivo del Coordinador

## Metadatos
- **ID:** HU-24
- **Épica:** E08 — Seguimiento Longitudinal
- **Sprint:** Sprint 4
- **Equipo Responsable:** Equipo 3
- **Prioridad:** Should (Alto Valor Estratégico)
- **Story Points:** 8 SP
- **Prerrequisitos de Dominio:** HU-04 (Comité), HU-07 (Tutorías), HU-14 (Acuerdos), HU-15 (Tesis), HU-17 (Publicaciones)

---

## 1. Definición y Objetivo
**Como** coordinador,
**quiero** una vista global de estudiantes (estudiantes activos, acuerdos pendientes/vencidos, sin tutoría reciente, avance de tesis, actividades próximas),
**para** monitorear el seguimiento académico de la cohorte y detectar oportunamente estudiantes con rezago.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-24.1:** Indicadores Clave de Rendimiento (KPIs) en tiempo real:
  - **Total de estudiantes activos** en el posgrado.
  - **Total de acuerdos pendientes** en curso.
  - **Total de acuerdos vencidos** no concluidos.
  - **Estudiantes sin tutoría reciente**: estudiantes activos que no tienen una asesoría registrada en los últimos 21 días ni una asesoría agendada dentro de los próximos 21 días.
  - **Promedio global de avance de tesis** de la cohorte.
- **CA-24.2:** Visualización gráfica consolidada:
  - Distribución de estudiantes por semestre actual (Semestres 1 a 6).
  - Histograma o dispersión de avances de tesis (rangos: 0-25%, 26-50%, 51-75%, 76-100%).
- **CA-24.3:** Listado interactivo de alertas críticas:
  - Tabla rápida con estudiantes en situación de rezago (acuerdos vencidos o falta de tutoría reciente) con enlace directo a sus respectivos expedientes.
  - Cuando un estudiante no tiene una asesoría registrada o agendada en tres semanas, se muestra un aviso de **rezago de seguimiento** con los días transcurridos desde la última asesoría o la indicación de que no existen asesorías registradas.
- **CA-24.4:** Autorización estricta: Acceso exclusivo para usuarios con permiso `academic.read.global` (`PROGRAM_COORDINATOR`). `STUDENT`, `TUTOR` y `SYSTEM_ADMIN` reciben `403 Forbidden`.
- **CA-24.5:** El umbral de rezago de seguimiento es de 21 días naturales y debe evaluarse con la fecha local del sistema.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint del Dashboard
- **Ruta:** `GET /api/v1/monitoring/dashboard/`
- **Autenticación:** `Bearer <access_token>`
- **Permisos:** `IsAuthenticated` + `CanReadGlobalAcademics`

#### Response Payload (`200 OK`):
```json
{
  "kpis": {
    "total_estudiantes_activos": 5,
    "total_acuerdos_pendientes": 12,
    "total_acuerdos_vencidos": 3,
    "estudiantes_sin_tutoria_reciente": 2,
    "promedio_avance_tesis": 42.5
  },
  "distribucion_semestres": [
    { "semestre": 1, "total_alumnos": 2 },
    { "semestre": 2, "total_alumnos": 1 },
    { "semestre": 3, "total_alumnos": 2 }
  ],
  "distribucion_avance_tesis": {
    "rango_0_25": 1,
    "rango_26_50": 3,
    "rango_51_75": 1,
    "rango_76_100": 0
  },
  "estudiantes_en_rezago": [
    {
      "student_id": 4,
      "matricula": "DOC250002",
      "nombre_completo": "Diego Fuentes",
      "motivo_rezago": "1 acuerdo vencido; 22 días sin tutoría registrada",
      "asesor_principal": "Dr. Roberto Gómez"
    }
  ],
  "estudiantes_sin_tutoria_reciente": [
    {
      "student_id": 4,
      "matricula": "DOC250002",
      "nombre_completo": "Diego Fuentes",
      "motivo_rezago": "22 días sin tutoría registrada",
      "asesor_principal": "Dr. Roberto Gómez"
    }
  ]
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Servicio de Agregación (`DashboardService`)
- En `Backend/nexus/nexus/services/dashboard_service.py`:
  - Consultas de agregación SQL mediante `Count()`, `Avg()`, `Q()` sobre `Student`, `Agreement`, `TutoringSession` y `ThesisProgress`.
  - Determinación de última tutoría con subconsultas para calcular los días transcurridos respecto a `timezone.localdate()`.

### 4.2. Vista del Dashboard
- `DashboardView(APIView)` en `Backend/nexus/nexus/views.py`.
- Permiso `CanReadGlobalAcademics`.
- El servicio debe considerar tanto asesorías registradas como la fecha de próxima reunión (`proxima_reunion_fecha`) al determinar el rezago.

### 4.3. Pruebas Backend (`test_hu24.py`)
- Consulta autorizada por coordinador $\rightarrow$ `200 OK` con agregaciones numéricas exactas.
- Rechazo para rol `STUDENT` o `TUTOR` $\rightarrow$ `403 Forbidden`.
- Rechazo para rol `SYSTEM_ADMIN` $\rightarrow$ `403 Forbidden`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `CoordinatorDashboardComponent` (`src/app/coordinator/coordinator-dashboard.ts`).
  - Fila superior de **KPI Metric Cards**: números grandes con tipografía Inter, badges semafóricos y etiquetas explicativas.
  - Gráficos interactivos ligeros en SVG/Canvas:
    - Gráfico de dona para distribución por semestres.
    - Gráfico de barras para avances de tesis.
  - Tabla de estudiantes en rezago con botón directo `[routerLink]="['/expediente', student.id]"`.
  - Lista independiente de alumnos sin tutoría reciente, mostrando el motivo del rezago y acceso directo a su expediente.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Todos los gráficos cuentan con alternativa textual en tablas ocultas para screen readers (`sr-only`).
- Las tarjetas de métricas anuncian cambios dinámicos mediante `aria-live="polite"`.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/monitoring/dashboard/` implementado con agregaciones optimizadas.
- [ ] Aviso de rezago de seguimiento implementado para estudiantes sin asesoría registrada o agendada en 21 días.
- [ ] Control RBAC probado: solo accesible para coordinación y administración académica.
- [ ] Pruebas unitarias backend (`test_hu24.py`) y frontend aprobadas al 100%.
- [ ] Vista de dashboard integrada en el frontend bajo la ruta `/coordinator/dashboard`.
