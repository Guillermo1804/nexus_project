# HU-07 - Estado de implementacion

## Estado general

**Estado:** funcionalmente cubierta; pendiente de cierre de calidad y verificacion visual.

La funcionalidad de registro de sesiones de tutoria esta implementada en backend y frontend. No se identifico un bloqueo funcional propio de HU-07. El porcentaje anterior del 90% estaba desactualizado porque marcaba como pendientes capacidades que ya existen, como el foco al primer campo invalido y la notificacion accesible de exito.

## Criterios de aceptacion

| Criterio | Estado | Evidencia |
| --- | --- | --- |
| CA-07.1 | Cubierto | El serializer valida que el semestre pertenezca al estudiante y este activo. |
| CA-07.2 | Cubierto | Se rechazan fechas futuras y fechas anteriores al inicio del semestre, en backend y formulario. |
| CA-07.3 | Cubierto | Se validan 10 caracteres significativos como minimo y 2000 como maximo, en backend y formulario. |
| CA-07.4 | Cubierto | `CanCreateTutoring` exige `tutoring.create`; la vista valida la pertenencia al comite antes de crear, actualizar o eliminar. |
| CA-07.5 | Cubierto | `created_by` se asigna desde el usuario autenticado, no es escribible y su inmutabilidad esta probada. |

## Implementacion confirmada

### Backend

- `TutoringSession` persiste estudiante, semestre, fecha, modalidad, resumen, proxima reunion, creador y fecha de alta.
- `POST /api/v1/tutoring-sessions/` esta registrado y devuelve la respuesta enriquecida con `created_by`, `created_at`, participantes, observaciones y acuerdos.
- `GET`, `PATCH` y `DELETE` respetan el alcance del expediente del usuario autenticado.
- La validacion de pertenencia, semestre activo, fechas, resumen y proxima reunion esta centralizada en `TutoringSessionCreateSerializer`.
- La prueba especifica de backend contiene 6 casos y cubre creacion, CRUD, semestre ajeno o inactivo, fechas invalidas, resumen invalido, permisos e inmutabilidad.

### Frontend

- `TutoringFormComponent` esta integrado en `StudentOverviewComponent`.
- `AcademicService.createTutoringSession` consume el endpoint canonico.
- El formulario valida semestre activo, fecha no futura, fecha no anterior al inicio del semestre y resumen de 10 a 2000 caracteres significativos.
- Ya estan implementados `aria-invalid`, `aria-describedby`, `role="alert"`, `role="status"` y el foco programatico al primer campo invalido.
- La prueba específica de HU-07 contiene 3 casos: resumen invalido, fecha anterior al semestre y envio valido.

## Verificaciones ejecutadas el 2026-09-26

- `back\\Scripts\\python.exe manage.py test nexus.test_hu07 --verbosity 1`: **6 pruebas OK**.
- `back\\Scripts\\python.exe manage.py check`: **sin problemas**.
- `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/expediente/tutoring-form.spec.ts`: **3 pruebas OK**.
- `npm run build`: **compilacion completada**. Produce advertencias de presupuesto, pero no error de build; `student-overview.scss` excede el warning de 4 kB.

## Pendientes reales

1. Medir la cobertura de HU-07 y comprobar el objetivo de cobertura superior al 90%; actualmente no hay evidencia de una medicion con `coverage`.
2. Ejecutar una verificacion visual del formulario dentro de `StudentOverviewComponent` en desktop y movil, incluyendo estados de error, carga, exito y responsive.
3. Decidir si se reduce el tamaño de `student-overview.scss` o se ajusta el warning de presupuesto. No bloquea la compilacion, pero mantiene advertencias de calidad.
4. Añadir pruebas de accesibilidad para comprobar el foco y los mensajes `role="alert"`/`role="status"`, ya que la implementacion existe pero esos comportamientos no tienen una prueba dedicada.
5. La suite frontend completa sigue teniendo 2 fallos de acuerdos HU-11/HU-12/HU-13. Son ajenos a HU-07, pero deben resolverse antes de declarar el release global completamente verde.
6. El entorno Python global no tiene Django; las verificaciones backend deben ejecutarse con `Backend/nexus/back/Scripts/python.exe` o tras activar ese entorno virtual.

## Dictamen

HU-07 puede considerarse **implementada a nivel funcional**. Para cerrarla formalmente faltan cobertura medible, verificacion visual y una decision sobre las advertencias de presupuesto. Los fallos de acuerdos deben mantenerse como trabajo separado y no deben usarse para atribuir un fallo a HU-07.

**Ultima actualizacion:** 2026-09-26