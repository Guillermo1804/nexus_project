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