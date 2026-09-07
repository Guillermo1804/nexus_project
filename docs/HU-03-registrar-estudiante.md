# HU-03 - Registrar estudiante

## 1. Historia de usuario

**Como** coordinador,  
**quiero** registrar un estudiante de doctorado,  
**para** crear su expediente longitudinal.

## 2. Objetivo

Permitir que un coordinador autorizado registre un estudiante con la informacion minima necesaria y que el sistema cree un expediente longitudinal consultable, consistente y asociado al identificador institucional del estudiante.

## 3. Alcance

### Incluye

- Formulario de registro para coordinadores.
- Captura de datos de identificacion del estudiante.
- Seleccion o validacion del programa de doctorado.
- Registro de la fecha de ingreso.
- Validacion del identificador institucional definido.
- Deteccion de estudiantes duplicados.
- Creacion del expediente longitudinal despues de un registro exitoso.
- Confirmacion del registro y acceso al expediente creado.
- Registro de auditoria de la operacion.

### No incluye

- Creacion de cuentas de usuario o autenticacion.
- Edicion posterior de los datos del estudiante.
- Carga de documentos o evidencias academicas.
- Registro de avances, comites, evaluaciones o hitos del expediente.
- Eliminacion fisica de estudiantes.
- Importacion masiva de estudiantes, salvo que exista un flujo definido en otra historia.

## 4. Criterios de aceptacion

### CA-03.1 - Datos minimos

**Dado** un coordinador autenticado y autorizado,  
**cuando** inicie el registro de un estudiante,  
**entonces** el sistema solicitara como minimo datos de identificacion, programa y fecha de ingreso.

**Validaciones:**

- Los campos obligatorios se identifican claramente.
- No se permite enviar el formulario incompleto.
- El identificador institucional cumple el formato definido por la institucion.
- El programa seleccionado existe y se encuentra disponible para nuevos registros.
- La fecha de ingreso tiene un formato valido y respeta las reglas de negocio acordadas.
- Los errores se muestran junto al campo correspondiente sin perder los datos validos ya capturados.

### CA-03.2 - Identificador unico

**Dado** un estudiante previamente registrado,  
**cuando** el coordinador intente registrarlo utilizando el identificador institucional definido,  
**entonces** el sistema no permitira duplicar el estudiante.

**Validaciones:**

- La unicidad se valida en el backend y en la base de datos, no solo en el frontend.
- Se muestra un mensaje claro indicando que ya existe un registro asociado al identificador.
- No se crea un segundo estudiante ni un segundo expediente.
- La validacion evita condiciones de carrera entre solicitudes simultaneas.
- No se revelan mas datos de los permitidos por el rol del coordinador.

### CA-03.3 - Creacion del expediente

**Dado** un registro valido y no duplicado,  
**cuando** el coordinador confirme la operacion,  
**entonces** se creara un expediente longitudinal consultable.

**Validaciones:**

- El estudiante y su expediente se crean como una operacion consistente.
- El expediente queda vinculado al estudiante y al programa correcto.
- La respuesta confirma el identificador del estudiante y del expediente creado.
- El coordinador puede navegar al expediente desde la confirmacion.
- Si ocurre un error durante la creacion, no queda un estudiante sin expediente ni un expediente huerfano.

## 5. Datos y reglas de negocio

### Datos minimos propuestos

| Dato | Regla |
|---|---|
| Identificador institucional | Obligatorio, unico y con formato validado. |
| Nombres | Obligatorio; longitud y caracteres definidos por el dominio. |
| Apellidos | Obligatorio; longitud y caracteres definidos por el dominio. |
| Programa de doctorado | Obligatorio; debe existir y estar activo. |
| Fecha de ingreso | Obligatoria; formato de fecha valido y regla temporal acordada. |

Los nombres exactos de los campos, sus tipos y restricciones deben confirmarse con el modelo de datos y el contrato del backend antes de implementar.

### Reglas

- Solo un coordinador con permisos de registro puede crear estudiantes.
- El identificador institucional es la clave de negocio para evitar duplicados.
- La comparacion del identificador debe aplicar la normalizacion acordada, por ejemplo espacios y mayusculas.
- Un registro exitoso siempre debe producir un expediente longitudinal asociado.
- Los reintentos de la misma solicitud no deben crear registros adicionales.
- La fecha de ingreso no debe permitir valores incompatibles con las reglas del programa.
- Las operaciones de creacion deben quedar auditadas con usuario, fecha, resultado e identificadores generados.

## 6. Propuesta tecnica

### Frontend

- Crear una vista de alta de estudiante accesible para el rol coordinador.
- Implementar un formulario reactivo con validaciones de requeridos, formato y fecha.
- Cargar los programas activos desde el backend en lugar de mantenerlos como valores fijos.
- Normalizar el identificador antes de enviarlo, manteniendo la regla definitiva en el backend.
- Deshabilitar el envio mientras la solicitud esta en curso y prevenir envios duplicados.
- Presentar errores de validacion, duplicidad, permisos y red con mensajes accionables.
- Mostrar una confirmacion con enlaces al estudiante y al expediente longitudinal creado.
- Proteger la ruta y ocultar la accion de registro a usuarios sin permisos, sin sustituir la autorizacion del backend.

### Backend

- Exponer un endpoint de registro que reciba los datos minimos definidos.
- Validar autenticacion, rol y permisos del coordinador.
- Validar el esquema, formato, referencias al programa y reglas de fecha.
- Aplicar una restriccion unica sobre el identificador institucional en la base de datos.
- Crear estudiante y expediente dentro de una transaccion.
- Diseñar la operacion para que los reintentos sean idempotentes o respondan de forma controlada ante duplicidad.
- Devolver codigos HTTP y errores tipados para distinguir validacion, duplicidad, falta de permisos y fallos internos.
- Registrar auditoria sin almacenar datos innecesarios o sensibles.

### Modelo y consistencia

La creacion debe seguir esta secuencia logica:

1. Autenticar y autorizar al coordinador.
2. Validar los datos de entrada.
3. Normalizar y comprobar el identificador institucional.
4. Verificar programa y reglas de fecha.
5. Crear el estudiante.
6. Crear el expediente longitudinal vinculado.
7. Confirmar la transaccion.
8. Registrar el resultado de auditoria y devolver los identificadores.

Si falla cualquier paso entre la creacion y la confirmacion, la transaccion debe revertirse para evitar datos parciales.

## 7. Plan de desarrollo

1. Confirmar con producto y backend el modelo de estudiante, expediente y programa.
2. Confirmar el formato y alcance del identificador institucional, incluyendo normalizacion y unicidad.
3. Definir contrato del endpoint, errores, permisos y respuesta de exito.
4. Revisar las rutas y el sistema de permisos existente para el rol coordinador.
5. Implementar migracion o restriccion unica en la base de datos.
6. Implementar endpoint, validaciones, transaccion e idempotencia en backend.
7. Implementar el formulario y las validaciones del frontend.
8. Integrar la carga de programas y el envio del registro.
9. Implementar confirmacion, navegacion al expediente y manejo de errores.
10. Implementar o verificar auditoria de la operacion.
11. Agregar pruebas unitarias, de integracion y de flujo completo.
12. Ejecutar build, pruebas, validacion de permisos y revision de datos duplicados antes de integrar.

## 8. Casos de prueba previstos

| ID | Escenario | Resultado esperado |
|---|---|---|
| CP-03.1 | Registro con datos validos | Se crea el estudiante y su expediente en una sola operacion. |
| CP-03.2 | Falta un dato obligatorio | No se envia o rechaza la solicitud y se indica el campo faltante. |
| CP-03.3 | Identificador con formato invalido | Se rechaza el registro con un mensaje de formato. |
| CP-03.4 | Identificador ya existente | No se crea ningun registro nuevo y se informa la duplicidad. |
| CP-03.5 | Dos solicitudes simultaneas con el mismo identificador | Solo una crea el registro; la otra recibe una respuesta controlada. |
| CP-03.6 | Programa inexistente o inactivo | Se rechaza el registro sin crear datos parciales. |
| CP-03.7 | Fecha de ingreso invalida | Se rechaza el registro y se explica la regla incumplida. |
| CP-03.8 | Usuario sin permiso de coordinador | Se deniega la operacion desde backend. |
| CP-03.9 | Falla al crear el expediente | Se revierte la creacion del estudiante y se registra el error. |
| CP-03.10 | Reenvio o reintento de la misma solicitud | No se generan estudiantes ni expedientes duplicados. |
| CP-03.11 | Registro exitoso | Se muestra confirmacion y se puede consultar el expediente creado. |
| CP-03.12 | Auditoria | Se registra actor, fecha, resultado y referencias de la operacion. |

## 9. Riesgos y decisiones pendientes

- **Modelo incompleto:** se debe confirmar que atributos adicionales no sean obligatorios para el expediente.
- **Identificador institucional:** falta definir formato, normalizacion, longitud y fuente oficial.
- **Consistencia:** crear estudiante y expediente fuera de una transaccion puede dejar datos huerfanos.
- **Concurrencia:** una consulta previa no reemplaza la restriccion unica de base de datos.
- **Privacidad:** los mensajes de duplicidad no deben exponer informacion de estudiantes a usuarios no autorizados.
- **Permisos:** se debe confirmar si todos los coordinadores pueden registrar en cualquier programa o solo en programas asignados.
- **Fecha de ingreso:** se debe acordar si puede ser futura, retroactiva y cual es la zona horaria aplicable.
- **Auditoria:** se debe definir retencion, consulta y nivel de detalle de los eventos.

## 10. Definicion de terminado

- Los tres criterios de aceptacion estan cubiertos por pruebas.
- El registro exige los datos minimos acordados y valida sus formatos.
- El identificador institucional tiene unicidad garantizada en backend y base de datos.
- Estudiante y expediente se crean de forma atomica, sin registros parciales.
- Solo un coordinador autorizado puede ejecutar la operacion.
- El flujo muestra confirmacion y permite consultar el expediente creado.
- La operacion queda auditada sin exponer informacion sensible.
- Frontend y backend compilan, las pruebas pasan y la documentacion del contrato esta actualizada.
- La rama queda lista para revision mediante pull request.
