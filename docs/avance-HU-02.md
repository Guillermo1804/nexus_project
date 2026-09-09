# Avance de implementación HU-02

## Implementado

### Backend Django

- Se definió un catálogo único de permisos efectivos por rol en `nexus/permissions.py`.
- `GET /api/auth/me/` ahora devuelve `role`, `roles` y `permissions`, además de los datos mínimos del usuario.
- Se protegieron las operaciones de administración de roles:
  - `GET /api/auth/users/`
  - `PATCH /api/auth/users/<id>/role/` con payload `{ "role": "TUTOR" }`.
- Solo `ACADEMIC_ADMIN` y `SYSTEM_ADMIN` pueden listar usuarios o asignar roles.
- Las solicitudes autenticadas sin privilegios reciben `403`; las solicitudes sin sesión válida deben recibir `401`.
- La asignación de rol valida los valores permitidos por `CustomUser.Role`.
- `GET /api/records/<student_id>/` valida propietario, comité activo o permiso global; un recurso ajeno responde `404`.
- `POST /api/tutoring/` valida el permiso de escritura, la asociación activa asesor-estudiante y que el semestre pertenezca al estudiante.
- `GET /api/academic/overview/` permite consulta global únicamente con `academic.read.global`.
- El registro de tutoría se crea dentro de una transacción atómica.

### Frontend Angular

- Los modelos de autenticación consumen `roles` y `permissions`.
- `AuthService.hasPermission()` centraliza la visibilidad de acciones.
- Se agregó `permissionGuard` para proteger rutas mediante `route.data.requiredPermission`.
- La ruta `/admin/roles` está protegida por `users.role.assign`.
- La pantalla de administración permite listar usuarios y cambiar su rol.
- La pantalla de inicio muestra los permisos efectivos y el acceso a administración solo cuando corresponde.

## Permisos definidos

| Rol | Permisos |
|---|---|
| `STUDENT` | `records.read.own` |
| `TUTOR` | `tutoring.create` |
| `COMMITTEE_MEMBER` | `records.read.assigned`, `tutoring.create` |
| `PROGRAM_COORDINATOR` | `academic.read.global` |
| `ACADEMIC_ADMIN` | `users.role.assign` |
| `SYSTEM_ADMIN` | Todos los permisos definidos |

## Validaciones ejecutadas

- Backend inicial: `python manage.py test nexus` -> 9 pruebas exitosas.
- Frontend: `pnpm build` -> compilación exitosa.
- Frontend: `pnpm test -- --watch=false --browsers=ChromeHeadless` -> 4 pruebas exitosas.
- Backend alcance: `python manage.py test nexus.tests.ScopeAuthorizationApiTests` -> 5 pruebas exitosas.
- Backend completo final: `python manage.py test nexus` -> 14 pruebas exitosas.

## Pruebas pendientes para aceptación completa

1. Crear un usuario estudiante, iniciar sesión y comprobar que `/api/auth/me/` devuelve únicamente `records.read.own`.
2. Intentar `GET /api/auth/users/` con estudiante y tutor; ambos deben recibir `403`.
3. Con un administrador académico, listar usuarios y cambiar un rol; comprobar que el nuevo perfil devuelve permisos consistentes.
4. Intentar asignar un valor de rol inexistente; debe responder `400` sin modificar el usuario.
5. Probar cada ruta Angular protegida con sesión, sin sesión y con sesión insuficiente.
6. Verificar en la interfaz que el enlace de administración no aparece para roles sin `users.role.assign`.
7. Confirmar que el interceptor conserva la distinción `401`/`403`: `401` limpia la sesión y `403` mantiene la sesión activa.
8. Comprobar manualmente `GET /api/records/<id>/` con propietario, asesor asignado, coordinador y usuario sin relación.
9. Comprobar manualmente `POST /api/tutoring/` con asesor asignado, asesor no asignado y semestre perteneciente a otro estudiante.
10. Comprobar que `academic.read.global` del coordinador solo habilite `GET /api/academic/overview/` y no operaciones de escritura.
11. Verificar que una asociación `AcademicCommittee.is_active=False` deje de autorizar expedientes y tutorías.

## Alcance pendiente

Los endpoints mínimos de expedientes, tutorías y consulta global ya están implementados sobre los modelos existentes. Queda pendiente la validación manual desde el navegador/API con datos representativos y decidir si el expediente debe incluir más entidades académicas además de la ficha base del estudiante.

## Medidas de seguridad para cuentas y roles

### Principio general

El registro público no permite elegir el rol. Toda cuenta creada desde el formulario público recibe el rol `STUDENT` en el backend. El navegador nunca debe ser una fuente confiable para asignar privilegios.

Esto evita que una persona cree directamente una cuenta como administrador, coordinador, asesor o miembro del comité modificando la petición HTTP.

### Creación inicial del administrador

La primera cuenta con privilegios elevados se crea directamente en Django, fuera del registro público:

```powershell
cd Backend\nexus
python manage.py createsuperuser
```

Esta cuenta debe utilizar un correo institucional, una contraseña robusta y acceso restringido. Django la crea con `is_superuser=True`, `is_staff=True` y el rol `SYSTEM_ADMIN` configurado por el administrador de usuarios.

La cuenta inicial debe utilizarse para configurar el sistema y crear o habilitar las cuentas institucionales. No debe compartirse entre varias personas.

### Alta de cuentas institucionales

El flujo planeado es:

1. El administrador crea la cuenta de la persona o la persona se registra mediante el flujo controlado disponible.
2. La cuenta inicia con permisos mínimos, normalmente `STUDENT`.
3. El administrador accede a la administración de roles.
4. El administrador asigna el rol institucional correspondiente.
5. El sistema devuelve los permisos efectivos asociados al nuevo rol.
6. Cuando el rol requiere relación con estudiantes, el administrador crea también la asociación de ámbito.

El cambio de rol se realiza mediante:

```http
PATCH /api/auth/users/<id>/role/
Authorization: Token <token-del-administrador>
Content-Type: application/json

{ "role": "TUTOR" }
```

Solo los usuarios con `users.role.assign`, actualmente `ACADEMIC_ADMIN` o `SYSTEM_ADMIN`, pueden ejecutar esta operación. Un estudiante, tutor o coordinador recibe `403`.

### Roles institucionales

| Tipo de cuenta | Rol técnico | Cómo se habilita |
|---|---|---|
| Asesor | `TUTOR` | El administrador asigna el rol y crea una relación activa en `AcademicCommittee`. |
| Coasesor | `TUTOR` | Utiliza el mismo rol técnico de asesor; la diferencia se registra en `AcademicCommittee.rol_comite` como `COASESOR`. |
| Miembro del comité | `COMMITTEE_MEMBER` | El administrador asigna el rol y crea la relación con el estudiante usando el tipo de participación correspondiente. |
| Coordinador | `PROGRAM_COORDINATOR` | El administrador asigna el rol; obtiene consulta académica global de solo lectura. |
| Administrador académico | `ACADEMIC_ADMIN` | Se asigna únicamente a personal autorizado; puede administrar roles. |
| Administrador del sistema | `SYSTEM_ADMIN` | Se reserva para la cuenta inicial y personal técnico autorizado. |

El rol define la capacidad general, pero no sustituye la relación de negocio. Por ejemplo, un `TUTOR` solo puede registrar tutorías para estudiantes con una asociación activa en `AcademicCommittee`.

### Asociación con estudiantes

La relación `AcademicCommittee` determina el alcance individual del asesor, coasesor o miembro del comité:

- `student`: estudiante al que se vincula la persona.
- `user`: cuenta institucional de la persona.
- `rol_comite`: `ASESOR_PRINCIPAL`, `COASESOR`, `VOCAL` o `SECRETARIO`.
- `is_active`: permite suspender la autorización sin eliminar el historial.

La comprobación se realiza en el backend durante cada operación. Ocultar opciones en Angular mejora la experiencia, pero no reemplaza esta validación.

### Estado actual y siguiente componente administrativo

Actualmente están implementados:

- Registro público limitado a `STUDENT`.
- Creación técnica de la primera cuenta administrativa mediante `createsuperuser`.
- Asignación protegida de roles mediante `/api/auth/users/<id>/role/`.
- Validación de asociaciones activas para consultar expedientes y registrar tutorías.

Para completar el flujo operativo falta una pantalla y endpoint administrativo para crear cuentas institucionales y administrar asociaciones `AcademicCommittee`. Ese componente deberá permitir seleccionar una cuenta, un estudiante, el tipo de participación y el estado activo, manteniendo la autorización únicamente en Django.

### Recomendaciones operativas

- No permitir que el registro público reciba o conserve un campo `role` confiable.
- No asignar `SYSTEM_ADMIN` para tareas académicas cotidianas.
- Usar cuentas individuales, nunca credenciales compartidas.
- Revisar y desactivar asociaciones cuando cambie la asignación de un asesor.
- Registrar auditoría de cambios de roles y asociaciones antes de usar el sistema en producción.
- Probar siempre las operaciones con solicitudes directas a la API, además de probarlas desde Angular.

## Plan de vistas para el superadministrador

### Objetivo

Crear una experiencia administrativa para que un usuario con rol `SYSTEM_ADMIN` pueda iniciar sesión, consultar las cuentas existentes y asignar roles institucionales sin que esas capacidades estén disponibles para usuarios comunes.

El superadministrador no se crea desde Angular. Su cuenta se crea inicialmente en Django con `createsuperuser` y después utiliza el mismo formulario de inicio de sesión que el resto de usuarios.

### 1. Inicio de sesión del superadministrador

La vista será la pantalla de login existente:

1. El administrador introduce correo institucional y contraseña.
2. Angular envía `POST /api/auth/login/`.
3. Django valida las credenciales y la cuenta activa.
4. La respuesta incluye el token, el rol `SYSTEM_ADMIN` y los permisos efectivos, incluido `users.role.assign`.
5. Angular guarda la sesión en `AuthService`.
6. El usuario es enviado a `/home` o directamente a `/admin/roles`.

La navegación y las acciones se controlan con permisos, no solamente con el texto visible del rol. El interceptor añade el token a las solicitudes protegidas.

Estados que debe mostrar la vista:

- Credenciales incorrectas: mensaje genérico, sin revelar si el correo existe.
- Cuenta inactiva: rechazo del inicio de sesión.
- Sesión vencida o token inválido: limpieza de sesión y redirección a `/login`.
- Inicio exitoso: acceso al menú administrativo.

### 2. Vista principal administrativa

La vista `/home` debe mostrar para el superadministrador:

- Identidad y correo de la sesión actual.
- Rol actual: `SYSTEM_ADMIN`.
- Acceso visible a "Administrar roles".
- Acceso futuro a "Cuentas institucionales" y "Asociaciones académicas".
- Acción para cerrar sesión.

Un usuario sin `users.role.assign` no debe ver el enlace administrativo y tampoco debe poder entrar escribiendo manualmente la URL.

### 3. Vista para cambiar roles

La ruta propuesta es:

```text
/admin/roles
```

La vista debe contener:

- Título y contexto de administración.
- Tabla o lista de usuarios.
- Correo, nombre, rol actual y permisos efectivos.
- Selector de rol por usuario.
- Indicador de guardado.
- Mensaje de éxito después de una actualización.
- Mensaje de error si la API rechaza la operación.

El flujo de cambio será:

1. Angular carga `GET /api/auth/users/`.
2. El administrador selecciona un nuevo rol.
3. Angular envía `PATCH /api/auth/users/<id>/role/`.
4. Django valida nuevamente el permiso `users.role.assign`.
5. Django valida que el rol pertenezca a `CustomUser.Role`.
6. El backend actualiza el usuario y devuelve su nuevo perfil.
7. Angular reemplaza la fila actualizada y muestra sus permisos efectivos.

El frontend puede facilitar la operación, pero la autorización real siempre ocurre en Django.

### 4. Reglas de seguridad de la vista

- La ruta debe usar `authGuard` y `permissionGuard`.
- El permiso requerido debe declararse en la ruta como `requiredPermission: 'users.role.assign'`.
- El selector no debe permitir valores fuera del catálogo de roles.
- Un `401` debe cerrar la sesión y llevar al login.
- Un `403` debe mantener la sesión, mostrar un error de autorización y no modificar la tabla.
- Un `404` debe informar que el usuario ya no existe o no está disponible.
- La interfaz no debe asumir que un cambio fue exitoso hasta recibir respuesta `200`.
- El cambio de `SYSTEM_ADMIN` debe reservarse para personal técnico autorizado.

### 5. Flujo visual propuesto

```text
Login
  |
  v
Home administrativa
  |
  +--> Administrar roles
          |
          +--> Cargar usuarios
          |
          +--> Seleccionar nuevo rol
          |
          +--> Confirmar cambio
          |
          +--> Actualizar permisos mostrados
```

### 6. Vistas administrativas posteriores

Después de terminar la vista de roles, el siguiente orden recomendado es:

1. **Cuentas institucionales:** crear usuarios sin exponer el registro público y asignarles datos básicos.
2. **Asociaciones académicas:** vincular asesor, coasesor o miembro del comité con un estudiante.
3. **Estado de asociaciones:** activar o desactivar vínculos sin borrar historial.
4. **Auditoría:** consultar quién cambió roles o asociaciones y cuándo.

Estas vistas deben conservar la misma protección por permisos y no deben confiar en datos enviados por Angular.

### 7. Pruebas del superadministrador

#### Inicio de sesión

- Iniciar sesión con credenciales válidas de `SYSTEM_ADMIN`.
- Confirmar que la respuesta contiene `role`, `roles`, `permissions` y `token`.
- Confirmar que un correo o contraseña incorrectos producen un error genérico.
- Confirmar que una cuenta inactiva no puede iniciar sesión.

#### Acceso a la vista

- Entrar a `/admin/roles` como `SYSTEM_ADMIN`.
- Entrar como estudiante, tutor y coordinador; todos deben ser redirigidos o recibir acceso denegado.
- Intentar llamar directamente a `GET /api/auth/users/` sin token y con un token sin permiso.

#### Cambio de rol

- Cambiar un usuario de `STUDENT` a `TUTOR` y comprobar `tutoring.create`.
- Cambiarlo a `COMMITTEE_MEMBER` y comprobar `records.read.assigned` y `tutoring.create`.
- Cambiarlo a `PROGRAM_COORDINATOR` y comprobar `academic.read.global`.
- Enviar un rol inexistente directamente a la API y comprobar `400` sin cambios.
- Simular una respuesta `403` y comprobar que la sesión permanece activa.

### 8. Criterio de finalización del plan

La primera entrega del superadministrador se considerará lista cuando el login, la ruta protegida, la carga de usuarios, el cambio de rol, la actualización de permisos y los estados `401`/`403` estén cubiertos por pruebas automatizadas y una validación manual desde Angular.