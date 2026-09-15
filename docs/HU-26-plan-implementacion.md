# HU-26 — Plan de Implementación: Alertar Falta de Seguimiento Académico

## Metadatos
- **ID:** HU-26
- **Épica:** E08 — Seguimiento Longitudinal
- **Sprint:** Sprint 5
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Should (Valor Estratégico)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-07 (Tutorías), HU-10 (Próxima reunión), HU-21 (Evidencias)

---

## 1. Definición y Objetivo
**Como** coordinador del programa doctoral o asesor principal,  
**quiero** recibir alertas automatizadas y centralizadas sobre situaciones de supervisión incompleta o en riesgo (retrasos en sesiones de tutoría mayores a 45 días o evidencias obligatorias no cargadas),  
**para** intervenir preventivamente antes del cierre semestral y garantizar el acompañamiento tutorial institucional.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-26.1:** Reglas canónicas de supervisión académica:
  - **Tutoría rezagada:** Estudiantes activos sin ninguna sesión de tutoría registrada en los últimos 45 días naturales (`dias_sin_tutoria > 45`).
  - **Reunión próxima:** Sesiones de tutoría con `proxima_reunion_fecha` programada para los siguientes 3 días hábiles.
  - **Evidencia pendiente:** Sesiones de tutoría concluidas hace más de 15 días que no cuenten con ninguna evidencia documental (`Evidence`) asociada.
- **CA-26.2:** Parámetros configurables de forma centralizada (umbrales de 45 días y 15 días definibles en configuración del sistema, no codificados de forma rígida en plantillas).
- **CA-26.3:** Visualización: Debe ofrecer vista agrupada por asesor y por cohorte/semestre.
- **CA-26.4:** Autorización: Exclusivo para coordinación (`academic.read.global`) y asesores principales (limitado a sus tutorados asignados).

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint de Alertas de Supervisión
- **Ruta:** `GET /api/v1/monitoring/supervision-alerts/`
- **Autenticación:** `Bearer <access_token>`

#### Response Payload (`200 OK`):
```json
{
  "total_casos_rezago": 2,
  "alertas": [
    {
      "student_id": 4,
      "matricula": "DOC250002",
      "nombre_completo": "Diego Fuentes",
      "tipo_alerta": "SIN_TUTORIA_PROLONGADA",
      "severidad": "ALTA",
      "dias_transcurridos": 52,
      "ultimo_registro_fecha": "2026-07-24",
      "asesor_principal": "Dr. Roberto Gómez",
      "detalle": "El estudiante acumula 52 días sin registrar sesión de tutoría."
    },
    {
      "student_id": 4,
      "matricula": "DOC250002",
      "nombre_completo": "Diego Fuentes",
      "tipo_alerta": "EVIDENCIA_FALTANTE",
      "severidad": "MEDIA",
      "tutoria_id": 12,
      "ultimo_registro_fecha": "2026-08-20",
      "detalle": "Tutoría del 20 de agosto sin evidencia documental adjunta tras 25 días."
    }
  ]
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Motor de Reglas de Supervisión (`SupervisionRulesEngine`)
- En `Backend/nexus/nexus/services/supervision_rules.py`:
  - Configuración centralizada de umbrales:
    ```python
    SUPERVISION_CONFIG = {
        'DIAS_MAX_SIN_TUTORIA': 45,
        'DIAS_MAX_SIN_EVIDENCIA_TUTORIA': 15,
        'DIAS_ANTICIPACION_PROXIMA_REUNION': 3,
    }
    ```
  - Subconsultas anotadas para obtener la fecha de la última tutoría por estudiante y verificar la existencia de evidencias asociadas.

### 4.2. Vista de Alertas de Supervisión
- `SupervisionAlertsView(APIView)` en `Backend/nexus/nexus/views.py`.
- Permiso `IsAuthenticated` + filtrado relacional.

### 4.3. Pruebas Backend (`test_hu26.py`)
- Estudiante con tutoría hace 50 días $\rightarrow$ genera alerta `SIN_TUTORIA_PROLONGADA`.
- Estudiante con tutoría hace 20 días $\rightarrow$ no genera alerta de rezago.
- Tutoría sin evidencia tras 16 días $\rightarrow$ genera alerta `EVIDENCIA_FALTANTE`.
- Usuario sin permiso $\rightarrow$ `403 Forbidden`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `SupervisionAlertsPanelComponent` (`src/app/coordinator/supervision-alerts-panel.ts`).
  - Tabla de alertas con filtros por tipo (`Tutoría rezagada`, `Evidencia pendiente`).
  - Badges semafóricos de severidad (Rojo: Alta / >45 días, Ámbar: Media / Evidencia).
  - Botón de acción rápida para contactar al asesor o abrir el expediente del estudiante.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/monitoring/supervision-alerts/` probado y validado con umbrales configurables.
- [ ] Reglas de 45 días de tutoría y 15 días de evidencia aprobadas en tests backend (`test_hu26.py`).
- [ ] Panel integrado en el módulo de coordinación del frontend con diseño accesible.
