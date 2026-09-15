# HU-14 — Plan de Implementación: Consultar Acuerdos Pendientes y Vencidos

## Metadatos
- **ID:** HU-14
- **Épica:** E04 — Acuerdos y Compromisos
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 3
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-11 (Crear acuerdos desde tutoría), HU-12 (Asignar responsable y fecha límite), HU-13 (Actualizar estado del acuerdo)

---

## 1. Definición y Objetivo
**Como** estudiante, asesor o coordinador del programa doctoral,  
**quiero** consultar un listado consolidado y filtrable de acuerdos y compromisos académicos (pendientes, en proceso, concluidos y vencidos),  
**para** monitorear el avance de las tareas críticas, prevenir rezagos y auditar el historial de cumplimiento.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-14.1:** Debe permitir filtrar acuerdos combinando al menos los siguientes criterios:
  - Estudiante (`student_id`).
  - Semestre académico (`semester_id`).
  - Estado del acuerdo (`PENDIENTE`, `EN_PROCESO`, `CONCLUIDO`, `VENCIDO` derivado).
  - Persona responsable (`responsable_id`).
  - Fecha límite (`fecha_limite`).
- **CA-14.2:** El resultado debe entregarse paginado según el estándar DRF (`count`, `next`, `previous`, `results`).
- **CA-14.3:** Regla RBAC "rol + relación con el estudiante":
  - Estudiante: solo consulta acuerdos de su propio expediente.
  - Asesor / Coasesor / Miembro de comité: solo consulta acuerdos de sus estudiantes asignados.
  - Coordinador del programa: consulta global de todos los acuerdos.
  - Administrador del Sistema (`SYSTEM_ADMIN`): sin acceso a acuerdos académicos (`403 Forbidden`).
- **CA-14.4:** Cada acuerdo debe incluir un endpoint o subrecurso de solo lectura para consultar su bitácora histórica de auditoría (`audit-log`).

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Listado Paginado y Filtrable
- **Ruta:** `GET /api/v1/agreements/?student=4&estado=PENDIENTE&vencido=true&page=1&page_size=10`
- **Autenticación:** `Bearer <access_token>`
- **Response (`200 OK`):**
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 85,
      "student": 4,
      "student_matricula": "DOC250002",
      "student_nombre": "Diego Fuentes",
      "session": 12,
      "descripcion": "Entregar versión preliminar del capítulo 3.",
      "estado": "PENDIENTE",
      "estado_efectivo": "VENCIDO",
      "responsable": 15,
      "responsable_nombre": "Diego Fuentes",
      "fecha_limite": "2026-08-30",
      "is_vencido": true,
      "created_at": "2026-08-01T10:00:00Z"
    }
  ]
}
```

### 3.2. Consulta de Bitácora de Auditoría
- **Ruta:** `GET /api/v1/agreements/{id}/audit-log/`
- **Response (`200 OK`):** Lista cronológica de cambios de estado con actor, fecha y observaciones.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Vistas y Filtros
- `AgreementViewSet` con `mixins.ListModelMixin` y `mixins.RetrieveModelMixin`.
- Filtro de queryset con RBAC estricto:
  ```python
  def get_queryset(self):
      user = self.request.user
      permissions = permissions_for_user(user)
      if 'academic.read.global' in permissions:
          qs = Agreement.objects.all()
      elif 'records.read.assigned' in permissions:
          qs = Agreement.objects.filter(student__academic_committee__memberships__user=user)
      elif 'records.read.own' in permissions:
          qs = Agreement.objects.filter(student__user=user)
      else:
          return Agreement.objects.none()

      # Filtros query params
      student = self.request.query_params.get('student')
      if student:
          qs = qs.filter(student_id=student)
      estado = self.request.query_params.get('estado')
      if estado:
          qs = qs.filter(estado=estado)
      vencido = self.request.query_params.get('vencido')
      if vencido == 'true':
          qs = qs.filter(~Q(estado=Agreement.Status.COMPLETED), fecha_limite__lt=timezone.localdate())
      return qs.distinct().order_by('-created_at')
  ```

### 4.2. Pruebas Backend (`test_hu14.py`)
- Filtro por estudiante y estado $\rightarrow$ `200 OK` con registros correctos.
- Filtro `vencido=true` $\rightarrow$ solo acuerdos vencidos calculados por fecha.
- Verificación de aislamiento RBAC: estudiante no ve acuerdos de otros.
- Verificación de paginación estándar DRF `{count, results}`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `AgreementsListComponent` (`src/app/agreements/agreements-list.ts`).
- Barra de filtros: `FilterBarComponent` con selectores para estudiante, estado, vencido y fecha.
- Tabla accesible con paginador (`PaginatorComponent`) conectado a signals reactivos.
- Badges semafóricos de estado:
  - Verde: `CONCLUIDO`
  - Azul: `EN_PROCESO`
  - Ámbar: `PENDIENTE` (en tiempo)
  - Rojo: `VENCIDO` (retrasado)
- Modal o drawer deslizable para consultar la bitácora de auditoría al hacer clic en un acuerdo.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Tabla con `<caption>`, encabezados con `scope="col"`.
- Estado de carga anunciado con `role="status"` y estado vacío contextual si no hay acuerdos con los filtros seleccionados.

---

## 6. Definition of Done (DoD)
- [ ] Endpoints de listado y auditoría probados con SimpleJWT y paginación.
- [ ] Filtros combinables validados en tests backend (`test_hu14.py`).
- [ ] Servicio Angular `AcademicService.getAgreements` y tabla responsiva integrada en frontend.
- [ ] Pruebas unitarias de filtros y paginación aprobadas en frontend.
