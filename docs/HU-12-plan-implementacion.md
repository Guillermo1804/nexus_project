# HU-12 — Plan de Implementación: Asignar Responsable y Fecha Límite

## Metadatos
- **ID:** HU-12
- **Épica:** E04 — Acuerdos y Compromisos
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 3 SP
- **Prerrequisitos de Dominio:** HU-11 (Crear acuerdos desde tutoría)

---

## 1. Definición y Objetivo
**Como** asesor o integrante del comité tutorial,  
**quiero** asignar un responsable concreto y una fecha límite de entrega a cada acuerdo académico,  
**para** individualizar la responsabilidad operativa y fijar un marco temporal verificable para su cumplimiento.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-12.1:** El usuario designado como `responsable` debe pertenecer obligatoriamente al seguimiento del estudiante: el propio estudiante evaluado o un integrante activo de su comité tutorial (`CommitteeMembership`).
- **CA-12.2:** No se puede asignar como responsable a un usuario institucional ajeno al expediente del doctorando.
- **CA-12.3:** La `fecha_limite` debe ser válida y no puede ser anterior a la fecha de la sesión de tutoría (o fecha de creación del acuerdo).
- **CA-12.4:** La asignación de responsable y fecha puede efectuarse al momento de crear el acuerdo o mediante actualización posterior.
- **CA-12.5:** Cualquier cambio de responsable o fecha límite debe registrarse en la bitácora de auditoría.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint de Asignación / Actualización
- **Ruta:** `PATCH /api/v1/agreements/{id}/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "responsable": 15,
  "fecha_limite": "2026-10-31"
}
```

#### Response Payload (`200 OK`):
```json
{
  "id": 85,
  "session": 12,
  "student": 4,
  "descripcion": "Entregar versión preliminar del capítulo 3 con análisis estadístico de la muestra B.",
  "estado": "PENDIENTE",
  "estado_efectivo": "PENDIENTE",
  "responsable": 15,
  "responsable_nombre": "Diego Fuentes",
  "fecha_limite": "2026-10-31",
  "dias_restantes": 47,
  "is_vencido": false
}
```

#### Respuestas de Error:
- `400 Bad Request`: Responsable no vinculado al estudiante o fecha límite anterior a la sesión.
- `403 Forbidden`: Usuario autenticado no tiene permisos para reasignar el acuerdo.
- `404 Not Found`: Acuerdo inexistente.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_agreement`)
- Campos en modelo `Agreement`:
  - `responsable`: ForeignKey(`CustomUser`, null=True, blank=True, on_delete=SET_NULL, related_name='assigned_agreements')
  - `fecha_limite`: DateField(null=True, blank=True, db_index=True)

### 4.2. Validaciones en `AgreementSerializer`
```python
def validate(self, attrs):
    student = self.instance.student if self.instance else attrs.get('student')
    responsable = attrs.get('responsable')
    fecha_limite = attrs.get('fecha_limite')

    if responsable and student:
        es_estudiante = (responsable.id == student.user_id)
        es_comite = student.academic_committee.memberships.filter(user=responsable).exists()
        if not (es_estudiante or es_comite):
            raise serializers.ValidationError({
                'responsable': 'El responsable debe ser el estudiante o un miembro de su comité tutorial.'
            })

    if fecha_limite and self.instance and self.instance.session:
        if fecha_limite < self.instance.session.fecha_sesion:
            raise serializers.ValidationError({
                'fecha_limite': 'La fecha límite no puede ser anterior a la fecha de la sesión de tutoría.'
            })
    return attrs
```

### 4.3. Pruebas Backend (`test_hu12.py`)
- Asignación válida al estudiante $\rightarrow$ `200 OK`.
- Asignación válida al asesor $\rightarrow$ `200 OK`.
- Intento de asignar usuario no vinculado $\rightarrow$ `400 Bad Request`.
- Fecha límite retroactiva respecto a la sesión $\rightarrow$ `400 Bad Request`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente selector: `AgreementAssigneeSelectorComponent`.
  - Dropdown poblado exclusivamente con: el estudiante + los asesores del comité.
  - Datepicker para `fecha_limite` con bloqueo de fechas pasadas.
- Badge visual en la fila del acuerdo indicando:
  - Nombre del responsable asignado.
  - Fecha límite con formato legible y semáforo visual (verde >7 días, ámbar $\le$7 días, rojo vencido).

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Selector con `aria-label="Seleccionar persona responsable del acuerdo"`.
- Etiqueta de fecha con formato accesible (`aria-describedby="hint-fecha-limite"`).

---

## 6. Definition of Done (DoD)
- [ ] Validación estricta de pertenencia del responsable al expediente implementada en backend.
- [ ] Validación temporal de fecha límite aprobada en pruebas unitarias (`test_hu12.py`).
- [ ] Interfaz de selección en Angular vinculada a los miembros del comité y estudiante.
