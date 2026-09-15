# HU-07 — Plan de Implementación: Registrar Sesión de Tutoría

## Metadatos
- **ID:** HU-07
- **Épica:** E03 — Tutorías
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 1
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 8 SP
- **Prerrequisitos de Dominio:** HU-03 (Registrar estudiante), HU-04 (Asignar comité académico), HU-05 (Gestionar semestres)

---

## 1. Definición y Objetivo
**Como** asesor o integrante autorizado del comité tutorial,  
**quiero** registrar una sesión formal de tutoría indicando el estudiante, semestre académico, fecha y resumen ejecutivo,  
**para** formalizar el seguimiento periódico de la investigación doctoral y habilitar la captura de minutas y compromisos.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-07.1:** La sesión debe asociarse obligatoriamente a un estudiante existente y a un semestre académico activo perteneciente a dicho estudiante.
- **CA-07.2:** La fecha de la sesión no puede ser posterior a la fecha actual del sistema ni anterior a la fecha de inicio del semestre correspondiente.
- **CA-07.3:** El resumen de la sesión debe contener al menos 10 caracteres significativos y un máximo de 2000 caracteres.
- **CA-07.4:** Solo los asesores y miembros de comité formalmente vinculados al estudiante (`CommitteeMembership`) pueden registrar tutorías (`tutoring.create`). `SYSTEM_ADMIN` y usuarios no asociados no tienen permitido el registro.
- **CA-07.5:** Al crearse la sesión, se debe registrar automáticamente el identificador del usuario autenticado que la dio de alta (`created_by`), el cual es inmutable.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint de Creación
- **Ruta:** `POST /api/v1/tutoring-sessions/`
- **Autenticación:** `Authorization: Bearer <access_token>`
- **Permisos:** `IsAuthenticated` + `CanCreateTutoring` + Validación relacional de membresía activa.

#### Request Payload (`application/json`):
```json
{
  "student": 4,
  "semester": 1,
  "fecha_sesion": "2026-09-14",
  "modalidad": "PRESENCIAL",
  "resumen": "Revisión del marco teórico y ajuste metodológico del protocolo doctoral.",
  "proxima_reunion_fecha": "2026-10-14",
  "proxima_reunion_notas": "Traer avance del capítulo 2"
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 12,
  "student": 4,
  "semester": 1,
  "fecha_sesion": "2026-09-14",
  "modalidad": "PRESENCIAL",
  "resumen": "Revisión del marco teórico y ajuste metodológico del protocolo doctoral.",
  "proxima_reunion_fecha": "2026-10-14",
  "proxima_reunion_notas": "Traer avance del capítulo 2",
  "created_by": 2,
  "created_at": "2026-09-14T10:00:00Z",
  "participants": [],
  "observations": [],
  "agreements": []
}
```

#### Respuestas de Error:
- `400 Bad Request`: Semestre no pertenece al estudiante, fecha futura o datos incompletos.
- `401 Unauthorized`: Token ausente o expirado.
- `403 Forbidden`: Usuario no vinculado al comité del estudiante o sin permiso `tutoring.create`.
- `404 Not Found`: Estudiante o semestre inexistente.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_tutoringsession`)
- Modelo: `TutoringSession` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `student`: ForeignKey(`Student`, on_delete=CASCADE, related_name='tutoring_sessions')
  - `semester`: ForeignKey(`Semester`, on_delete=CASCADE, related_name='tutoring_sessions')
  - `fecha_sesion`: DateField(db_index=True)
  - `modalidad`: CharField(max_length=20, choices=Modality.choices, default=PRESENCIAL)
  - `resumen`: TextField()
  - `created_by`: ForeignKey(`CustomUser`, on_delete=SET_NULL, null=True)
  - `created_at`: DateTimeField(auto_now_add=True)

### 4.2. Serializers y Vistas
- `TutoringSessionCreateSerializer`: Validación estricta cruzada (`semester.student_id == student.id`), asignación automática de `created_by = request.user`.
- `TutoringSessionViewSet`: Hereda de `GenericViewSet`, `CreateModelMixin`, `RetrieveModelMixin`, `ListModelMixin`.
- Métodos `PUT`, `PATCH`, `DELETE` restringidos o protegidos con validación relacional específica.

### 4.3. Pruebas Backend (`test_hu07.py`)
- Crear tutoría como asesor asignado $\rightarrow$ `201 Created`.
- Intentar crear como tutor no asignado $\rightarrow$ `403 Forbidden`.
- Intentar asociar un semestre ajeno $\rightarrow$ `400 Bad Request`.
- Fecha de sesión futura $\rightarrow$ `400 Bad Request`.
- Verificar que la respuesta devuelva `id` y `created_by`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y Servicios
- Componente: `TutoringFormComponent` (`src/app/expediente/tutoring-form.ts`).
- Servicio: `AcademicService.createTutoringSession(payload: TutoringSessionPayload): Observable<TutoringSession>`.
- Formulario reactivo tipado con validaciones:
  - `student`: required, hidden o inyectado desde contexto.
  - `semester`: required.
  - `fecha_sesion`: required, no posterior a hoy.
  - `modalidad`: required (select con opciones cerradas).
  - `resumen`: minLength(10), maxLength(2000).

### 5.2. Accesibilidad (WCAG 2.1 AA)
- `aria-invalid` y `aria-describedby` para mensajes de error por campo.
- Notificación accesible de éxito mediante `role="status"` y errores mediante `role="alert"`.
- Enfoque programático al primer campo con error en caso de rechazo.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/tutoring-sessions/` probado y verificado con SimpleJWT.
- [ ] Validaciones de pertenencia de semestre y fecha aplicadas en serializer y formulario.
- [ ] Pruebas unitarias backend (`test_hu07.py`) con cobertura >90% de casos positivos y negativos.
- [ ] Pruebas unitarias frontend con `HttpTestingController` para `createTutoringSession`.
- [ ] Integración verificada en `StudentOverviewComponent` sin desbordamientos de layout.
