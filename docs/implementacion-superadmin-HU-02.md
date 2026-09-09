# Implementación del superadministrador HU-02

## Objetivo

Implementar el flujo administrativo para que un usuario autorizado pueda crear cuentas institucionales, asignar roles y vincular asesores o miembros del comité con estudiantes.

## Backend implementado

### Cuentas institucionales

Se agregó:

```http
POST /api/admin/users/
```

El endpoint permite crear cuentas con estos roles:

- `TUTOR`
- `COMMITTEE_MEMBER`
- `PROGRAM_COORDINATOR`
- `ACADEMIC_ADMIN`

El endpoint exige autenticación con token y el permiso `users.role.assign`. No permite crear `STUDENT` ni `SYSTEM_ADMIN` desde este flujo administrativo; los estudiantes usan el registro público y el superadministrador inicial se crea con Django.

El backend valida correo único, contraseña y rol permitido antes de crear la cuenta.

### Asociaciones académicas

Se agregaron:

```http
GET /api/admin/committee/
POST /api/admin/committee/
PATCH /api/admin/committee/<id>/
```

Estas operaciones permiten:

- Consultar asociaciones existentes.
- Vincular una cuenta `TUTOR` o `COMMITTEE_MEMBER` con un estudiante.
- Registrar el tipo de participación: `ASESOR_PRINCIPAL`, `COASESOR`, `VOCAL` o `SECRETARIO`.
- Activar o desactivar una asociación sin eliminarla.

La desactivación conserva el historial y provoca que la relación deje de autorizar consultas o registros de tutoría.

Todas las operaciones están protegidas en Django con `CanAssignRoles`; Angular solo controla la experiencia visual.

## Frontend implementado

### Vista de roles

Ruta:

```text
/admin/roles
```

Permite consultar usuarios, cambiar su rol y visualizar sus permisos efectivos.

### Vista de cuentas institucionales

Ruta:

```text
/admin/users
```

Incluye un formulario para nombre, apellidos, correo, contraseña temporal y rol institucional. Muestra estados de guardado, éxito y error.

### Vista de asociaciones académicas

Ruta:

```text
/admin/committee
```

Incluye un formulario para identificar la cuenta, identificar al estudiante y seleccionar la participación. También muestra las asociaciones existentes y permite activar o desactivar cada una.

Las tres rutas usan `authGuard` y `permissionGuard` con `users.role.assign`.

### Navegación

Los enlaces a roles, cuentas institucionales y asociaciones solo aparecen en `/home` para usuarios que tienen el permiso administrativo.

## Flujo completo

1. El administrador del sistema se crea con `python manage.py createsuperuser`.
2. Inicia sesión usando el formulario normal de Angular.
3. Accede a `/admin/users` y crea una cuenta `TUTOR` o `COMMITTEE_MEMBER`.
4. Accede a `/admin/committee` y vincula la cuenta con un estudiante.
5. La cuenta vinculada puede consultar o registrar operaciones únicamente dentro de su ámbito.
6. Si termina la asignación, el administrador desactiva la asociación sin borrar el historial.

## Validación ejecutada

- `python manage.py test nexus`: **17 pruebas exitosas**.
- `pnpm build`: compilación Angular exitosa.
- Las nuevas pruebas backend cubren creación institucional, asociación, desactivación y rechazo de usuarios sin permiso.

## Pruebas manuales recomendadas

1. Iniciar sesión con `SYSTEM_ADMIN` y confirmar los tres enlaces administrativos.
2. Iniciar sesión con estudiante y confirmar que los enlaces no aparecen.
3. Crear una cuenta `TUTOR` desde `/admin/users`.
4. Intentar crear una cuenta con correo duplicado y confirmar el error.
5. Crear una asociación `ASESOR_PRINCIPAL` desde `/admin/committee`.
6. Confirmar que el tutor puede registrar tutorías para el estudiante vinculado.
7. Desactivar la asociación y confirmar que el tutor deja de tener ese acceso.
8. Crear una cuenta `COMMITTEE_MEMBER` y asociarla como `COASESOR`, `VOCAL` o `SECRETARIO`.
9. Intentar acceder a los endpoints administrativos con una cuenta sin `users.role.assign` y confirmar `403`.
10. Confirmar que una sesión vencida produce `401`, limpia la sesión y redirige al login.

## Pendiente

- Añadir pruebas unitarias específicas para los componentes Angular administrativos.
- Reemplazar los identificadores numéricos de usuario y estudiante por selectores con datos cargados desde el backend.
- Añadir auditoría histórica de cambios de roles y asociaciones.