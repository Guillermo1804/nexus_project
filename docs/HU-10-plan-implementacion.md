# HU-10 — Plan de Implementación: Programar Próxima Reunión

## Metadatos
- **ID:** HU-10
- **Épica:** E03 — Tutorías
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 1
- **Prioridad:** Medium (Valor Medio)
- **Story Points:** 3 SP
- **Prerrequisitos de Dominio:** HU-07 (Registrar sesión de tutoría)

---

## 1. Definición y Objetivo
**Como** participante autorizado de una sesión de tutoría,  
**quiero** programar la fecha tentativa y notas preparatorias de la siguiente reunión de seguimiento,  
**para** asegurar la continuidad del acompañamiento doctoral y clarificar los entregables esperados para la próxima sesión.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-10.1:** La fecha de próxima reunión debe ser estrictamente posterior a la fecha en que se celebró la tutoría actual.
- **CA-10.2:** La fecha tentativa debe ser futura: no se permiten fechas anteriores ni iguales al día actual, aunque sean posteriores a la tutoría registrada.
- **CA-10.3:** Las notas de la próxima reunión son opcionales, pero si se proporcionan, debe haberse definido obligatoriamente una fecha de próxima reunión.
- **CA-10.4:** Las notas no pueden exceder 500 caracteres y deben almacenar indicaciones concisas de preparación.
- **CA-10.5:** Esta funcionalidad no implementa un calendario interactivo ni sincronización con servicios externos (Google Calendar/Outlook); documenta el compromiso acordado en la sesión.
- **CA-10.6:** La información debe poder registrarse al momento de crear la sesión (HU-07) o actualizarse posteriormente por integrantes autorizados.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Campos en `TutoringSession`
Los campos forman parte integral del recurso de sesión:
- `proxima_reunion_fecha`: `date` (`YYYY-MM-DD` nullable)
- `proxima_reunion_notas`: `string` (nullable, max 500)

### 3.2. Payload de Ejemplo (`POST` o `PATCH /api/v1/tutoring-sessions/{id}/`)
```json
{
  "proxima_reunion_fecha": "2026-10-20",
  "proxima_reunion_notas": "Revisión final de la formulación de hipótesis para envío a comité de bioética."
}
```

#### Validaciones de Error:
- `400 Bad Request` si `proxima_reunion_fecha <= fecha_sesion`.
- `400 Bad Request` si `proxima_reunion_notas` está presente pero `proxima_reunion_fecha` es nula.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Modelo `TutoringSession`
- `proxima_reunion_fecha = models.DateField(null=True, blank=True)`
- `proxima_reunion_notas = models.CharField(max_length=500, blank=True, default='')`

### 4.2. Validación en Serializer
- En `TutoringSessionCreateSerializer` y `TutoringSessionSerializer`:
  ```python
  def validate(self, attrs):
      fecha_sesion = attrs.get('fecha_sesion') or getattr(self.instance, 'fecha_sesion', None)
      prox_fecha = attrs.get('proxima_reunion_fecha')
      prox_notas = attrs.get('proxima_reunion_notas')

      if prox_notas and not prox_fecha:
          raise serializers.ValidationError({
              'proxima_reunion_fecha': 'Debe especificar una fecha si incluye notas preparatorias.'
          })
      if prox_fecha and fecha_sesion and prox_fecha <= fecha_sesion:
          raise serializers.ValidationError({
              'proxima_reunion_fecha': 'La fecha de próxima reunión debe ser posterior a la fecha de la sesión.'
          })
      return attrs
  ```

### 4.3. Pruebas Backend (`test_hu10.py`)
- Programación válida con fecha y notas $\rightarrow$ `200/201 OK`.
- Fecha igual o anterior a la sesión $\rightarrow$ `400 Bad Request`.
- Notas sin fecha $\rightarrow$ `400 Bad Request`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Decisión de experiencia de usuario
Los campos de HU-10 se eliminarán del formulario de registro de tutoría (`TutoringFormComponent`):
- `Próxima reunión (opcional)`.
- `Notas próxima reunión (opcional)`.

La creación de una tutoría quedará enfocada en los datos propios de la sesión celebrada. La programación del seguimiento se realizará después de crearla, dentro del apartado **Condiciones de tutoría** de cada sesión.

Esta decisión modifica la ubicación y el momento de captura en la interfaz, pero no elimina los campos del recurso `TutoringSession` ni cambia sus nombres en la API.

### 5.2. Flujo funcional objetivo
1. El usuario registra la tutoría sin ingresar datos de la próxima reunión.
2. La sesión creada aparece en el historial del estudiante.
3. El usuario autorizado abre **Condiciones de tutoría** para esa sesión.
4. El apartado presenta dos bloques diferenciados:
   - **Asistencia:** conserva el registro de participantes correspondiente a HU-08.
   - **Próxima reunión:** incorpora la fecha tentativa y las notas preparatorias de HU-10.
5. El usuario guarda la programación mediante `PATCH /api/v1/tutoring-sessions/{id}/`.
6. Tras una actualización exitosa, se refresca el expediente para mostrar los datos guardados en el historial y en el resumen de próxima reunión.

El guardado de la próxima reunión será independiente del guardado de asistencia: registrar o editar HU-10 no debe volver a crear participantes ni quedar bloqueado cuando la asistencia ya fue registrada.

### 5.3. Cambios previstos por archivo

#### `FrontEnd/nexus_project/src/app/expediente/tutoring-form.ts`
- Retirar del template los controles `proxima_reunion_fecha` y `proxima_reunion_notas`.
- Retirar ambos controles del `FormGroup`.
- Eliminar de `submit()` la validación de notas sin fecha y excluir ambos campos del payload de creación.
- Mantener intactas las validaciones y el envío propios de HU-07.

#### `FrontEnd/nexus_project/src/app/expediente/tutoring-conditions.ts`
- Añadir un formulario reactivo específico para HU-10.
- Recibir la fecha de la sesión y los valores actuales de próxima reunión para inicializar el formulario.
- Incorporar:
  - `proxima_reunion_fecha` con `<input type="date">`.
  - `proxima_reunion_notas` con `<textarea maxlength="500">`.
  - contador visible y accesible de caracteres `0/500`.
  - botón independiente **Guardar próxima reunión**.
- Permitir crear y actualizar la programación mientras el usuario tenga el permiso requerido.
- Emitir un evento al componente padre después de guardar para refrescar el expediente.
- Mantener separado el estado de carga, error y éxito de HU-10 del estado del registro de asistencia.

#### `FrontEnd/nexus_project/src/app/expediente/student-overview.html`
- Entregar al componente de condiciones el identificador, la fecha de la sesión y los valores actuales de HU-10.
- Escuchar el evento de actualización para recargar la información mostrada.
- Conservar la visualización de la próxima reunión en el resumen y en el historial.

#### `FrontEnd/nexus_project/src/app/core/academic/academic.models.ts`
- Definir un tipo de actualización limitado a:
  - `proxima_reunion_fecha`.
  - `proxima_reunion_notas`.
- Mantener estos campos en los modelos de lectura de tutorías y del expediente.

#### `FrontEnd/nexus_project/src/app/core/academic/academic.service.ts`
- Añadir un método de actualización parcial que invoque:
  - `PATCH /api/v1/tutoring-sessions/{id}/`.
- Tipar tanto el payload como la respuesta.

#### `FrontEnd/nexus_project/src/app/expediente/tutoring-form.spec.ts`
- Ajustar las pruebas de HU-07 para confirmar que el registro ya no envía campos de HU-10.
- Retirar de esta suite la prueba cruzada de notas sin fecha, porque pasa al componente de condiciones.

#### `FrontEnd/nexus_project/src/app/expediente/tutoring-conditions.spec.ts`
- Crear pruebas unitarias específicas de HU-10 para validar:
  - carga de valores previamente registrados;
  - fecha estrictamente posterior a `fecha_sesion`;
  - rechazo de notas sin fecha;
  - límite de 500 caracteres;
  - construcción del `PATCH` correcto;
  - actualización posterior de una programación existente;
  - independencia entre el guardado de asistencia y el de próxima reunión;
  - mensajes accesibles de error y confirmación.

#### `FrontEnd/nexus_project/src/app/core/academic/academic.service.spec.ts`
- Verificar la URL, el método HTTP y el payload de la nueva operación `PATCH`.

#### `Backend/nexus/nexus/test_hu10.py`
- Conservar los casos actuales del contrato de creación.
- Añadir cobertura de actualización parcial para:
  - programación válida;
  - fecha igual o anterior a la sesión;
  - notas sin fecha;
  - edición de una programación existente;
  - notas con más de 500 caracteres.

#### Backend de dominio
- Verificar que `proxima_reunion_notas` aplique realmente el máximo de 500 caracteres definido por CA-10.3.
- Si el modelo continúa como `TextField` sin límite, ajustar modelo/serializer y generar la migración correspondiente sin renombrar el campo.
- No crear un endpoint nuevo: `TutoringSessionViewSet` ya admite `partial_update`.

### 5.4. Reglas de validación en el nuevo apartado
- Si existe `proxima_reunion_notas`, `proxima_reunion_fecha` es obligatoria.
- Si existe `proxima_reunion_fecha`, debe ser estrictamente posterior a `fecha_sesion`.
- La fecha tentativa también debe ser posterior al día actual; hoy y cualquier fecha pasada son inválidos.
- El `<input type="date">` debe configurar `min` con el día posterior al mayor valor entre la fecha actual y `fecha_sesion`.
- La misma restricción se valida en el formulario reactivo y en el serializer para impedir que se omita modificando manualmente la petición.
- Las notas admiten como máximo 500 caracteres.
- Debe ser válido guardar ambos campos vacíos cuando todavía no se haya programado una reunión.
- La validación frontend mejora la experiencia, pero el backend conserva la autoridad sobre las reglas de negocio.

### 5.5. Accesibilidad (WCAG 2.1 AA)
- Asociar cada control con su `<label>` y sus ayudas mediante `for`, `id` y `aria-describedby`.
- Publicar errores de validación con `role="alert"` o una región `aria-live`.
- Exponer el contador de caracteres de las notas a tecnologías de asistencia.
- Marcar controles inválidos con `aria-invalid`.
- Mantener el foco y un mensaje de estado comprensible después del guardado.

### 5.6. Compatibilidad y contrato
- No se renombrarán los campos ni se eliminarán de serializers o respuestas.
- No se requiere un endpoint adicional ni una migración por la reubicación visual.
- El backend podrá conservar compatibilidad con clientes que envíen los campos durante `POST`, aunque la interfaz oficial los gestionará posteriormente mediante `PATCH`.
- La eventual migración por el límite de 500 caracteres es un ajuste de cumplimiento de CA-10.3, no una consecuencia de mover los controles.

### 5.7. Orden recomendado de implementación
1. Completar validación backend y pruebas de `PATCH` de HU-10.
2. Añadir modelos y método `PATCH` en `AcademicService`.
3. Incorporar el bloque **Próxima reunión** en `TutoringConditionsComponent`.
4. Conectar entradas y evento de recarga en `StudentOverviewComponent`.
5. Retirar los campos y la lógica HU-10 de `TutoringFormComponent`.
6. Actualizar y ejecutar pruebas unitarias Angular.
7. Ejecutar la suite backend de HU-10 y una regresión de HU-07/HU-08.
8. Realizar una verificación manual del flujo completo y de accesibilidad básica.

---

## 6. Definition of Done (DoD)
- [ ] El registro de tutoría ya no muestra ni envía los campos de próxima reunión.
- [ ] El apartado **Condiciones de tutoría** presenta un bloque diferenciado para HU-10.
- [ ] La programación puede guardarse y editarse mediante `PATCH` sin afectar la asistencia.
- [ ] Se aplican las validaciones de fecha, dependencia de notas y máximo de 500 caracteres en frontend y backend.
- [ ] El expediente refleja la información actualizada después de guardar.
- [ ] Las validaciones cruzadas pasan en `test_hu10.py`, incluyendo actualización parcial.
- [ ] Las pruebas de `TutoringFormComponent`, `TutoringConditionsComponent` y `AcademicService` están actualizadas.
- [ ] Las regresiones de HU-07 y HU-08 continúan aprobando.
- [ ] Los mensajes y controles nuevos cumplen los criterios de accesibilidad definidos.
