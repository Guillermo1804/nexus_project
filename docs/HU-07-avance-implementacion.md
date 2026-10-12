# HU-07 - Estado de implementacion

## Estado general

**Estado:** COMPLETADA funcionalmente.

La funcionalidad de registro de sesiones de tutoria esta implementada y verificada en backend y frontend. La fase 4 quedo cerrada para los perfiles autorizados: tutor, asesor, miembro del comite y coordinador del programa.

## Criterios de aceptacion

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| CA-07.1 | Cubierto | El serializer valida que el semestre pertenezca al estudiante y este activo. |
| CA-07.2 | Cubierto | Se permiten fechas de hoy o futuras y se rechazan fechas anteriores a hoy, en backend y formulario. |
| CA-07.3 | Cubierto | Se validan 10 caracteres significativos como minimo y 2000 como maximo, en backend y formulario. |
| CA-07.4 | Cubierto | `CanCreateTutoring` exige `tutoring.create`; tutor y asesor requieren pertenencia al comite, mientras que el coordinador puede registrar sobre expedientes globales. |
| CA-07.5 | Cubierto | `created_by` se asigna desde el usuario autenticado, no es escribible y su inmutabilidad esta probada. |

## Implementacion confirmada

### Backend

- `TutoringSession` persiste estudiante, semestre, fecha, modalidad, resumen, proxima reunion, creador y fecha de alta.
- `POST /api/v1/tutoring-sessions/` esta registrado y devuelve la respuesta enriquecida con `created_by`, `created_at`, participantes, observaciones y acuerdos.
- `GET`, `PATCH` y `DELETE` respetan el alcance del expediente del usuario autenticado.
- La validacion de pertenencia, semestre activo, fechas, resumen y proxima reunion esta centralizada en `TutoringSessionCreateSerializer`.
- La prueba especifica de backend contiene 7 casos y cubre creacion, CRUD, semestre ajeno o inactivo, fechas invalidas, resumen invalido, permisos, coordinador e inmutabilidad.

### Frontend

- `TutoringFormComponent` esta integrado en `StudentOverviewComponent`.
- `AcademicService.createTutoringSession` consume el endpoint canonico.
- El formulario valida semestre activo, fecha de hoy o futura, fecha no anterior al inicio del semestre y resumen de 10 a 2000 caracteres significativos.
- Ya estan implementados `aria-invalid`, `aria-describedby`, `role="alert"`, `role="status"` y el foco programatico al primer campo invalido.
- La prueba específica de HU-07 contiene 4 casos: resumen invalido, fecha pasada, notas sin fecha de proxima reunion y envio valido con fecha futura.

### Avance de fase 4

- Se corrigio la matriz de permisos para que `PROGRAM_COORDINATOR` reciba `tutoring.create`, que es el permiso que usa el frontend para mostrar `Registrar tutoría`.
- Se ajusto la creacion en backend: coordinadores pueden registrar tutorias sobre cualquier expediente; tutores y asesores conservan la validacion de membresia del comite.
- Se agrego una prueba backend que verifica que el coordinador puede crear y queda registrado en `created_by`.
- El formulario Angular muestra el boton y el flujo de registro cuando el usuario tiene `tutoring.create`; coordinador, tutor y asesor usan el mismo flujo con sus alcances correspondientes.
- Se corrigio el formulario para calcular la fecha actual en hora local, evitar desfases UTC y validar que las notas de la proxima reunion incluyan su fecha.
- Se cambio la regla de fecha de sesion: se permiten hoy y fechas futuras; los dias pasados se bloquean en el navegador y se rechazan en backend.
- Se mejoro la presentacion de errores del endpoint para mostrar validaciones de fecha, semestre y proxima reunion en lugar del mensaje generico.

## Verificaciones ejecutadas el 2026-09-26

- `back\\Scripts\\python.exe manage.py check`: **sin problemas**.
- `back\\Scripts\\python.exe manage.py test nexus.test_hu07 --verbosity 1`: **7 pruebas OK**, incluida la creacion por coordinador.
- `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/expediente/tutoring-form.spec.ts`: **4 pruebas OK**.
- `npm run build`: **compilacion completada**. Produce advertencias de presupuesto, pero no error de build; `student-overview.scss` excede el warning de 4 kB.

## Seguimiento de calidad no bloqueante

1. Medir la cobertura de HU-07 con `coverage` para obtener el porcentaje formal.
2. Ejecutar una verificacion visual del formulario en desktop y movil.
3. Decidir si se reduce el warning de presupuesto de `student-overview.scss`.
4. Mantener separados los fallos de acuerdos HU-11/HU-12/HU-13, que no bloquean el cierre funcional de HU-07.

## Cierre

HU-07 queda **completada funcionalmente**. Las validaciones de negocio, permisos, registro de creador, fechas, formulario frontend y pruebas focalizadas estan implementadas y verificadas. El seguimiento de calidad restante no impide el cierre de la historia.

**Ultima actualizacion:** 2026-09-26