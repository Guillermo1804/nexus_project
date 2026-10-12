# HU-13 — Plan de Implementación: Actualizar Estado del Acuerdo y Auditoría

## Metadatos
- **ID:** HU-13
- **Épica:** E04 — Acuerdos y Compromisos
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-11 (Crear acuerdos desde tutoría), HU-12 (Asignar responsable y fecha límite)

---

## 1. Definición y Objetivo
**Como** responsable asignado a un acuerdo académico (estudiante o tutor),  
**quiero** actualizar el estado de avance del compromiso según el flujo establecido (`PENDIENTE` $\rightarrow$ `EN_PROCESO` $\rightarrow$ `CONCLUIDO`),  
**para** transparentar el nivel de cumplimiento del trabajo y registrar una bitácora inmutable de cada cambio de estado.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-13.1:** El flujo de transiciones manuales válidas es:
  - `PENDIENTE` $\rightarrow$ `EN_PROCESO`
  - `EN_PROCESO` $\rightarrow$ `CONCLUIDO`
  - `PENDIENTE` $\rightarrow$ `CONCLUIDO` (cumplimiento directo)
  - `CONCLUIDO` $\rightarrow$ `EN_PROCESO` (reapertura justificada)
- **CA-13.2:** `VENCIDO` es un estado efectivo **derivado dinámicamente**: si la fecha actual es posterior a `fecha_limite` y el acuerdo no está `CONCLUIDO`, el sistema calcula y expone `estado_efectivo = 'VENCIDO'`, sin requerir mutación en la base de datos.
- **CA-13.3:** Solo el usuario designado como `responsable` (o el coordinador del programa) tiene autorización para cambiar el estado del acuerdo.
- **CA-13.4:** Todo cambio de estado debe registrar obligatoriamente una entrada inmutable en `AgreementAuditLog`, almacenando: `actor`, `estado_anterior`, `estado_nuevo`, `fecha_cambio` y `observaciones` opcionales.
- **CA-13.5:** Si el acuerdo pasa a `CONCLUIDO`, se registra automáticamente `fecha_conclusion = timezone.now()`.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint de Transición de Estado
- **Ruta:** `PATCH /api/v1/agreements/{id}/status/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "estado": "CONCLUIDO",
  "observaciones": "Se entregó el borrador completo y fue validado por el asesor."
}
```

#### Response Payload (`200 OK`):
```json
{
  "id": 85,
  "student": 4,
  "descripcion": "Entregar versión preliminar del capítulo 3.",
  "estado": "CONCLUIDO",
  "estado_efectivo": "CONCLUIDO",
  "responsable": 15,
  "fecha_conclusion": "2026-10-25T16:00:00Z",
  "is_vencido": false
}
```

#### Respuestas de Error:
- `400 Bad Request`: Transición de estado inválida o intento de enviar manualmente `VENCIDO`.
- `403 Forbidden`: El usuario autenticado no es el responsable del acuerdo ni coordinador.
- `404 Not Found`: Acuerdo inexistente.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia y Bitácora (`nexus_agreementauditlog`)
- Modelo `AgreementAuditLog`:
  - `agreement`: ForeignKey(`Agreement`, on_delete=CASCADE, related_name='audit_logs')
  - `actor`: ForeignKey(`CustomUser`, on_delete=SET_NULL, null=True)
  - `estado_anterior`: CharField(max_length=20)
  - `estado_nuevo`: CharField(max_length=20)
  - `observaciones`: TextField(blank=True, default='')
  - `fecha_cambio`: DateTimeField(auto_now_add=True)

### 4.2. Lógica de Transición Transaccional
```python
@action(detail=True, methods=['patch'], url_path='status')
def update_status(self, request, pk=None):
    agreement = self.get_object()
    if agreement.responsable_id != request.user.id and request.user.role != CustomUser.Role.PROGRAM_COORDINATOR:
        return Response({'detail': 'Solo el responsable o el coordinador pueden actualizar el estado.'}, status=status.HTTP_403_FORBIDDEN)

    nuevo_estado = request.data.get('estado')
    observaciones = request.data.get('observaciones', '')
    if nuevo_estado not in [Agreement.Status.PENDING, Agreement.Status.IN_PROGRESS, Agreement.Status.COMPLETED]:
        return Response({'detail': 'Estado inválido o no transicionable manualmente.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        estado_anterior = agreement.estado
        agreement.estado = nuevo_estado
        if nuevo_estado == Agreement.Status.COMPLETED:
            agreement.fecha_conclusion = timezone.now()
        else:
            agreement.fecha_conclusion = None
        agreement.save()

        AgreementAuditLog.objects.create(
            agreement=agreement,
            actor=request.user,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            observaciones=observaciones
        )
    return Response(AgreementSerializer(agreement).data)
```

### 4.3. Pruebas Backend (`test_hu13.py`)
- Transición válida por el responsable $\rightarrow$ `200 OK` y registro en `AgreementAuditLog`.
- Intento de actualización por un usuario distinto al responsable $\rightarrow$ `403 Forbidden`.
- Rechazo de valor `VENCIDO` en el payload $\rightarrow$ `400 Bad Request`.
- Verificación del cálculo de `is_vencido` cuando la fecha límite expiró.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `AgreementStatusControlComponent`.
- PillBadge interactivo con selector de cambio de estado rápido:
  - Dropdown o grupo de botones con los estados disponibles según la máquina de estados.
  - Diálogo modal accesible para ingresar `observaciones` del cambio (ej. "Entrega final aprobada").
- Visualización de la bitácora histórica en acordeón o drawer deslizable.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Menú de cambio de estado operable 100% por teclado con `aria-haspopup="true"` y `aria-expanded`.
- Anuncio accesible (`role="status"`) al confirmarse el cambio de estado.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `PATCH /api/v1/agreements/{id}/status/` implementado y probado con SimpleJWT.
- [ ] Bitácora de auditoría inmutable verificada en base de datos.
- [ ] Control de permisos: solo responsable asignado o coordinador puede ejecutar el cambio.
- [ ] Pruebas unitarias backend (`test_hu13.py`) aprobadas al 100%.
