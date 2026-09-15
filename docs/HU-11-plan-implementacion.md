# HU-11 — Plan de Implementación: Crear Acuerdos desde Tutoría

## Metadatos
- **ID:** HU-11
- **Épica:** E04 — Acuerdos y Compromisos
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-03 (Registrar estudiante), HU-07 (Registrar sesión de tutoría)

---

## 1. Definición y Objetivo
**Como** asesor o integrante del comité tutor,  
**quiero** generar uno o varios acuerdos y compromisos académicos a partir de una sesión de tutoría,  
**para** formalizar las metas pactadas y permitir su posterior seguimiento puntual y auditable.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-11.1:** Todo acuerdo generado en este flujo debe quedar asociado a la sesión de tutoría correspondiente y heredar el estudiante de dicha sesión.
- **CA-11.2:** Una sesión de tutoría puede concluir con cero, uno o múltiples acuerdos registrados.
- **CA-11.3:** La descripción del acuerdo es obligatoria, con una longitud mínima de 10 caracteres y máxima de 1000 caracteres.
- **CA-11.4:** El acuerdo inicia obligatoriamente en estado `PENDIENTE`.
- **CA-11.5:** Se registra de forma automática el usuario creador (`created_by`) y la fecha/hora de creación.
- **CA-11.6:** Al crearse un acuerdo, se genera automáticamente una entrada inicial en la bitácora de auditoría (`AgreementAuditLog`) con `estado_nuevo = 'PENDIENTE'`.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint Anidado a Tutoría
- **Ruta:** `POST /api/v1/tutoring-sessions/{id}/agreements/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "descripcion": "Entregar versión preliminar del capítulo 3 con análisis estadístico de la muestra B."
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 85,
  "session": 12,
  "student": 4,
  "descripcion": "Entregar versión preliminar del capítulo 3 con análisis estadístico de la muestra B.",
  "estado": "PENDIENTE",
  "estado_efectivo": "PENDIENTE",
  "responsable": null,
  "responsable_nombre": null,
  "fecha_limite": null,
  "created_by": 2,
  "created_at": "2026-09-14T11:45:00Z"
}
```

#### Respuestas de Error:
- `400 Bad Request`: Descripción menor a 10 caracteres o inválida.
- `403 Forbidden`: Usuario no vinculado al comité de la sesión.
- `404 Not Found`: Sesión de tutoría inexistente.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_agreement`)
- Modelo: `Agreement` en `Backend/nexus/nexus/models.py`.
- Campos principales:
  - `session`: ForeignKey(`TutoringSession`, null=True, blank=True, on_delete=SET_NULL, related_name='agreements')
  - `student`: ForeignKey(`Student`, on_delete=CASCADE, related_name='agreements')
  - `descripcion`: TextField()
  - `estado`: CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
  - `created_by`: ForeignKey(`CustomUser`, on_delete=SET_NULL, null=True)
  - `created_at`: DateTimeField(auto_now_add=True)

### 4.2. Lógica y Auditoría Inicial
- En `AgreementSerializer.create()` o en la acción anidada de la vista:
  ```python
  with transaction.atomic():
      agreement = Agreement.objects.create(
          session=session,
          student=session.student,
          descripcion=descripcion,
          created_by=request.user,
          estado=Agreement.Status.PENDING
      )
      AgreementAuditLog.objects.create(
          agreement=agreement,
          actor=request.user,
          estado_anterior='',
          estado_nuevo=Agreement.Status.PENDING,
          observaciones='Acuerdo generado desde sesión de tutoría.'
      )
  ```

### 4.3. Pruebas Backend (`test_hu11.py`)
- Creación de acuerdo desde sesión autorizada $\rightarrow$ `201 Created` y verificación de `student_id` heredado.
- Verificación de creación automática de registro en `AgreementAuditLog`.
- Creación múltiple de acuerdos en una sola sesión $\rightarrow$ todos asociados a la misma `session_id`.
- Intento por usuario no asignado al comité $\rightarrow$ `403 Forbidden`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `AgreementsCreateSectionComponent` integrado dentro del modal/página de tutoría.
- Tabla dinámica de acuerdos creados en caliente durante la minuta, permitiendo:
  - Textarea para capturar descripción.
  - Botón "Agregar a la minuta".
  - Lista interactiva de acuerdos pendientes por guardar.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Lista de acuerdos anunciada con `aria-live="polite"`.
- Tecla Enter en el campo de texto permite agregar el acuerdo a la lista sin recargar.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `POST /api/v1/tutoring-sessions/{id}/agreements/` validado y probado.
- [ ] Creación automática de la bitácora de auditoría en estado `PENDIENTE`.
- [ ] Pruebas unitarias backend (`test_hu11.py`) aprobadas al 100%.
- [ ] Captura de acuerdos integrada en la interfaz de tutoría del frontend.
