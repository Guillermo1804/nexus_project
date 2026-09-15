# HU-08 — Plan de Implementación: Registrar Asistencia y Participantes de Sesión

## Metadatos
- **ID:** HU-08
- **Épica:** E03 — Tutorías
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 1
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 3 SP
- **Prerrequisitos de Dominio:** HU-04 (Asignar comité académico), HU-07 (Registrar sesión de tutoría)

---

## 1. Definición y Objetivo
**Como** asesor o integrante del comité tutor que coordina la sesión,  
**quiero** registrar la asistencia de los participantes y el rol desempeñado en la reunión (estudiante, asesor principal, coasesor, miembro del comité),  
**para** documentar formalmente la representatividad colegiada de la tutoría doctoral y respaldar las minutas académicas.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-08.1:** Los participantes registrados deben ser obligatoriamente: el estudiante evaluado o usuarios con membresía activa en el comité del estudiante (`CommitteeMembership`).
- **CA-08.2:** No se permite registrar participantes que no pertenezcan al comité ni al expediente del estudiante.
- **CA-08.3:** No se puede duplicar un mismo participante en una misma sesión de tutoría (unicidad `session + user`).
- **CA-08.4:** El rol desempeñado en la sesión debe seleccionarse exclusivamente del catálogo oficial: `ESTUDIANTE`, `ASESOR_PRINCIPAL`, `COASESOR`, `MIEMBRO_COMITE`.
- **CA-08.5:** Solo los integrantes autorizados a modificar la tutoría pueden registrar participantes.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Listar Participantes
- **Ruta:** `GET /api/v1/tutoring-sessions/{id}/participants/`
- **Autenticación:** `Bearer <access_token>`
- **Response (`200 OK`):** Lista de participantes con ID, usuario, nombre completo y rol en la sesión.

### 3.2. Agregar Participante
- **Ruta:** `POST /api/v1/tutoring-sessions/{id}/participants/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "user": 5,
  "rol_en_sesion": "COASESOR"
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 18,
  "user": 5,
  "user_nombre": "Dra. Elena Soto",
  "user_email": "elena.soto@nexus.edu",
  "rol_en_sesion": "COASESOR"
}
```

#### Respuestas de Error:
- `400 Bad Request`: Usuario no autorizado para este estudiante o participante ya registrado en la sesión.
- `403 Forbidden`: Usuario autenticado no tiene permisos de edición sobre la sesión.
- `404 Not Found`: Sesión de tutoría inexistente.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_tutoringparticipant`)
- Modelo: `TutoringParticipant` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `session`: ForeignKey(`TutoringSession`, on_delete=CASCADE, related_name='participants')
  - `user`: ForeignKey(`CustomUser`, on_delete=CASCADE, related_name='tutoring_attendances')
  - `rol_en_sesion`: CharField(max_length=30, choices=SessionRole.choices)
- Constraints:
  - `UniqueConstraint(fields=['session', 'user'], name='unique_tutoring_session_participant')`

### 4.2. Serializers y Vistas
- `TutoringParticipantSerializer`: Validación de que `user` pertenece a `session.student.user` o a `session.student.academic_committee.memberships`.
- Acción anidada en `TutoringSessionViewSet`: `@action(detail=True, methods=['get', 'post'], url_path='participants')`.
- Manejo controlado de unicidad para retornar `400 Bad Request` antes de colisiones en base de datos.

### 4.3. Pruebas Backend (`test_hu08.py`)
- Agregar participante válido del comité $\rightarrow$ `201 Created`.
- Intentar agregar usuario ajeno al comité $\rightarrow$ `400 Bad Request`.
- Intentar agregar el mismo usuario dos veces $\rightarrow$ `400 Bad Request`.
- Usuario sin permiso de tutoría intentando registrar $\rightarrow$ `403 Forbidden`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `TutoringParticipantsComponent` integrado en el detalle de la tutoría.
- Multi-select o lista de checkboxes con los miembros del comité disponibles para selección inmediata.
- Badge visual semafórico por rol de participante (ej. Azul: Asesor, Violeta: Coasesor, Gris: Miembro).

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Lista semántica `<ul>` con `aria-label="Participantes registrados en la sesión"`.
- Botón de eliminación accesible con `aria-label="Quitar a [Nombre] de la sesión"`.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/tutoring-sessions/{id}/participants/` probado y validado.
- [ ] Validación de pertenencia al comité activa y probada en backend.
- [ ] Pruebas unitarias backend (`test_hu08.py`) cubriendo duplicados y rechazo de usuarios ajenos.
- [ ] Interfaz de selección de participantes integrada en el flujo de tutoría del frontend.
