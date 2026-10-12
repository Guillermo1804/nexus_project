# HU-25 — Plan de Implementación: Alertar Acuerdos por Vencer y Vencidos

## Metadatos
- **ID:** HU-25
- **Épica:** E08 — Seguimiento Longitudinal
- **Sprint:** Sprint 3
- **Equipo Responsable:** Equipo 3
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-12 (Asignar responsable y fecha límite), HU-13 (Actualizar estado del acuerdo)

---

## 1. Definición y Objetivo
**Como** responsable asignado a un acuerdo académico (estudiante o tutor) o coordinador del programa,  
**quiero** visualizar alertas tempranas y llamadas de atención sobre acuerdos próximos a vencer o ya vencidos,  
**para** priorizar oportunamente las tareas críticas y evitar retrasos en el calendario de seguimiento doctoral.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-25.1:** Clasificación semafórica de alertas:
  - **Crítica (Rojo / Vencido):** Fecha límite rebasada (`fecha_limite < hoy`) y estado $\neq$ `CONCLUIDO`.
  - **Advertencia (Ámbar / Próximo a vencer):** Fecha límite dentro de los próximos 7 días naturales (`hoy <= fecha_limite <= hoy + 7 días`) y estado $\neq$ `CONCLUIDO`.
  - **Informativa (Azul / Normal):** Fecha límite a más de 7 días.
- **CA-25.2:** Alcance de entrega: **Alertas visuales dentro de la plataforma web** (banners, badges de alerta en header/sidebar y tarjetas destacadas). No se requiere integración externa con SMS, WhatsApp ni correo en esta fase.
- **CA-25.3:** Alcance de usuario:
  - Estudiante / Tutor: Alertas de acuerdos donde figure como responsable o como parte de su comité.
  - Coordinador: Contador global y desglose de acuerdos en riesgo de todos los estudiantes.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint de Alertas de Acuerdos
- **Ruta:** `GET /api/v1/monitoring/alerts/agreements/`
- **Query Params opcionales:** `?student=4`
- **Autenticación:** `Bearer <access_token>`

#### Response Payload (`200 OK`):
```json
{
  "total_alertas": 3,
  "vencidos_count": 1,
  "proximos_vencer_count": 2,
  "alertas": [
    {
      "agreement_id": 85,
      "student_id": 4,
      "student_nombre": "Diego Fuentes",
      "descripcion": "Entregar versión preliminar del capítulo 3.",
      "responsable_nombre": "Diego Fuentes",
      "fecha_limite": "2026-08-30",
      "nivel": "CRITICO",
      "dias_retraso": 16,
      "mensaje": "Acuerdo vencido hace 16 días."
    },
    {
      "agreement_id": 92,
      "student_id": 4,
      "student_nombre": "Diego Fuentes",
      "descripcion": "Completar análisis de correlación.",
      "responsable_nombre": "Dr. Roberto Gómez",
      "fecha_limite": "2026-09-18",
      "nivel": "ADVERTENCIA",
      "dias_restantes": 4,
      "mensaje": "Vence en 4 días."
    }
  ]
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Servicio de Reglas de Alerta
- En `Backend/nexus/nexus/services/alert_service.py`:
  - Cálculo eficiente en base de datos mediante queries `Q(fecha_limite__lt=today) & ~Q(estado='CONCLUIDO')` y `Q(fecha_limite__range=[today, today + timedelta(days=7)]) & ~Q(estado='CONCLUIDO')`.
  - Agrupación por nivel de severidad.

### 4.2. Vista de Alertas
- `AgreementAlertsView(APIView)` en `Backend/nexus/nexus/views.py`.
- Permiso `IsAuthenticated` + filtrado relacional por rol de usuario.

### 4.3. Pruebas Backend (`test_hu25.py`)
- Acuerdo con fecha hace 3 días $\rightarrow$ reportado con nivel `CRITICO`.
- Acuerdo con fecha en 4 días $\rightarrow$ reportado con nivel `ADVERTENCIA`.
- Acuerdo con fecha en 15 días $\rightarrow$ no entra en alertas críticas/advertencias.
- Acuerdo en estado `CONCLUIDO` $\rightarrow$ excluido de alertas independientemente de la fecha.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `AlertBadgeCounterComponent` en el navbar/header mostrando el número de alertas pendientes.
- Componente: `AgreementAlertsBannerComponent` en el dashboard o inicio del expediente:
  - Banner dismissible con resumen: *"Tienes 1 acuerdo vencido y 2 por vencer esta semana."*
  - Enlace directo a la lista filtrada de acuerdos (`/agreements?vencido=true`).
- Integración en `StudentOverviewComponent`: indicadores semafóricos en la sección de acuerdos abiertos.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Banners con `role="region"` y `aria-label="Alertas de compromisos académicos"`.
- Los niveles de alerta combinan color, texto explícito e icono representativo (no depender únicamente del color para usuarios daltónicos).

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/monitoring/alerts/agreements/` implementado y probado con SimpleJWT.
- [ ] Lógica temporal de 7 días y acuerdos vencidos aprobada en pruebas backend (`test_hu25.py`).
- [ ] Indicadores de alerta web visibles en header y expediente con diseño Inter responsivo.
