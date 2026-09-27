# Diagnostico de errores del frontend

Fecha: 2026-09-26

## Estado final de esta intervencion

Se modifico codigo fuente con autorizacion. `pnpm` no esta disponible en el entorno, pero las dependencias locales permitieron ejecutar `npm run build`.

## Hallazgos

### 1. Conflictos Git sin resolver

Se encontraron marcadores `<<<<<<<`, `=======` y `>>>>>>>` en:

- `FrontEnd/nexus_project/src/app/admin/institutional-users.html`
- `FrontEnd/nexus_project/src/app/core/academic/academic.models.ts`
- `FrontEnd/nexus_project/src/app/core/academic/academic.service.ts`
- `FrontEnd/nexus_project/src/app/expediente/student-overview.ts`

Estos conflictos impiden que Angular compile. No basta con agregar imports: hay que integrar las dos versiones conservando las funcionalidades de las HU existentes.

### 2. `institutional-users.ts`

- `RouterLink` aparece en `imports`, pero el warning indica que la plantilla no utiliza el directive.
- La correccion mecanica seria retirar `RouterLink` del array de imports, salvo que se decida conservar el enlace `routerLink` de la plantilla.
- La plantilla tiene un conflicto entre dos textos y dos versiones de la etiqueta `<form>`. Hay que conservar una sola version. La version que usa `#userForm` es necesaria porque el boton referencia `userForm.invalid`.
- El error de cierre de `main` probablemente es un efecto del HTML conflictivo o de la estructura resultante; debe comprobarse despues de resolver los marcadores.

### 3. `academic.models.ts`

Hay que integrar:

- `TutoringObservation` y sus datos de creacion.
- `RolParticipanteTutoria`, `ParticipanteTutoria` y `DatosParticipanteTutoria`.
- La propiedad del estudiante usada por cada funcionalidad: `user_id` en la HU de acuerdos/evidencias y `usuario_id` en la HU de participantes.
- Los tipos de acuerdos, auditoria, evidencias y `AcademicRole`.

Esto requiere una decision de contrato de datos, no solo un import. La opcion mas compatible parece soportar ambas propiedades mientras se verifica el contrato real del backend.

### 4. `academic.service.ts`

Hay que integrar los metodos de ambas versiones:

- Observaciones, acuerdos, auditoria y evidencias.
- Participantes de tutoria: `getParticipantesTutoria` y `registrarParticipanteTutoria`.
- La definicion de `getAgreements` debe unificarse para no perder filtros ni tipos.

Esto implica codigo de servicio y debe hacerse con permiso.

### 5. `student-overview.ts`

Hay que conservar simultaneamente:

- Imports de observaciones, acuerdos y evidencias.
- Import de `TutoringConditionsComponent`.
- Estado y metodos de acuerdos.
- Estado `tutoriaCondicionesId` y `alternarCondicionesTutoria`.

Ademas, el template requiere que `TutoringConditionsComponent` este en `@Component.imports`. La propiedad reportada como inexistente es consecuencia directa del conflicto sin resolver.

### 6. `tutoring-conditions.ts`

El componente ya existe y su logica usa:

- `RolParticipanteTutoria`.
- `StudentOverview['student'].usuario_id`.
- `AcademicService.getParticipantesTutoria`.
- `AcademicService.registrarParticipanteTutoria`.

Por tanto, los errores de este archivo dependen principalmente de resolver modelos y servicio. Cambiar `usuario_id` a `user_id` seria una modificacion de contrato y no debe hacerse automaticamente sin confirmar el backend.

## Clasificacion

### Correcciones mecanicas o de integracion

- Eliminar marcadores de conflicto y conservar una integracion coherente.
- Retirar `RouterLink` de `InstitutionalUsers` si se confirma que no se usa.
- Registrar `TutoringConditionsComponent` en los imports del componente principal.
- Mantener `#userForm` en la plantilla porque se utiliza en `[disabled]`.

### Cambios que requieren autorizacion

- Elegir como unificar los contratos `user_id` y `usuario_id`.
- Integrar y conservar todos los metodos del servicio academico.
- Ajustar o crear tipos/interfaces para que coincidan con la respuesta real del backend.
- Resolver cualquier discrepancia funcional entre HU-07, HU-08 y las funcionalidades de acuerdos/evidencias.

## Cambios realizados

- Se integraron los tipos de observaciones, acuerdos, evidencias y participantes de tutoria en `academic.models.ts`.
- Se integraron en `AcademicService` los endpoints de observaciones, acuerdos, evidencias y participantes.
- Se agrego `TutoringConditionsComponent` a los imports de `StudentOverviewComponent` y se conservaron sus estados y metodos de acuerdos.
- Se mantuvieron `user_id` y `usuario_id` como propiedades compatibles del expediente, usando fallback para identificar al estudiante en condiciones de tutoria.
- Se resolvio el conflicto de la plantilla de cuentas institucionales conservando `#userForm`, requerido por `userForm.invalid`.
- Se eliminaron todos los marcadores de conflicto del frontend.

## Validacion

- El analizador de VS Code no reporta errores en los cinco archivos corregidos.
- No quedan marcadores `<<<<<<<`, `=======` o `>>>>>>>` bajo `FrontEnd/nexus_project/src/app`.
- `npm run build` ya no reporta errores de TypeScript, Angular, imports o templates.
- El build de produccion termina con error unicamente por presupuesto de estilos: `student-overview.scss` mide 8.72 kB y el maximo configurado es 8 kB. Tambien aparecen advertencias de presupuesto para otros estilos y el bundle inicial.
- Ese presupuesto de CSS es independiente de los errores solicitados y no se modifico.

## Pendiente de autorizacion

La correccion de los errores reportados queda terminada. Solicito autorizacion antes de realizar cualquier trabajo adicional, como reducir el CSS para cumplir el presupuesto o ajustar la configuracion de Angular.
