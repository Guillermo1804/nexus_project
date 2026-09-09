# Avance de integracion frontend-backend

**Fecha:** 2026-09-09
**Etapa:** autenticacion HU-01 y registro de cuentas de estudiantes

## Cambios realizados

- Se dejo una sola implementacion de autenticacion en `src/app/core/auth/`.
- Se eliminaron los servicios, guard, interceptor y prueba antiguos que duplicaban la seguridad.
- Se eliminaron las pantallas antiguas de login e inicio que ya no forman parte de las rutas activas.
- El frontend ahora usa `role`, alineado con `CustomUser.role` del backend.
- Se tiparon los seis roles definidos por Django:
  - `STUDENT`
  - `TUTOR`
  - `COMMITTEE_MEMBER`
  - `PROGRAM_COORDINATOR`
  - `ACADEMIC_ADMIN`
  - `SYSTEM_ADMIN`
- El token y el usuario permanecen solo en memoria, conforme a HU-01; no se usa `localStorage`.
- La URL base de la API se movio a `src/environments/environment.ts`.
- Se corrigio el import del componente de sesion expirada para usar el servicio unico.
- Se resolvio un conflicto de merge en `app.spec.ts`.
- Se agrego `Backend/requirements.txt` con Django, DRF y CORS fijados por version.
- Se habilito Django REST Framework con `TokenAuthentication` y `IsAuthenticated` por defecto.
- Se habilito `django-cors-headers` usando `CORS_ALLOWED_ORIGINS` del entorno Docker.
- Se publicaron los endpoints:
  - `POST /api/auth/login/`
  - `POST /api/auth/logout/`
  - `GET /api/auth/me/`
- El login autentica por correo, rechaza usuarios inactivos y devuelve un error generico.
- El logout elimina el token DRF y el token deja de funcionar inmediatamente.
- Se agregaron pruebas de login valido, credenciales invalidas, usuario inactivo, endpoint protegido y revocacion.
- Se habilito `POST /api/auth/register/` para el formulario existente del frontend.
- El registro crea de forma atomica un `CustomUser` y su perfil `Student`.
- Las cuentas nuevas reciben el rol `STUDENT` y una sesion por token automaticamente.
- Se validan contrasena, correo unico y matricula unica.

## Validacion

Desde `FrontEnd/nexus_project`:

- `pnpm build`: correcto.
- `pnpm test -- --watch=false --browsers=ChromeHeadless`: 4 pruebas correctas.

Desde `Backend/nexus`:

- `python manage.py check`: correcto.
- `python manage.py migrate --noinput`: correcto; se aplicaron las migraciones de `authtoken`.
- `python manage.py test nexus`: 5 pruebas correctas.
- `python manage.py test nexus`: 7 pruebas correctas, incluyendo registro y duplicados.

## Estado de la conexion

La API de HU-01 ya esta implementada. El flujo soporta login, acceso a un recurso protegido de identidad y logout con revocacion. Adicionalmente, la aplicacion ya permite crear cuentas de estudiantes desde la ruta `/register`.

El registro se implemento como funcionalidad complementaria solicitada: no cambia la historia HU-01 ni agrega roles administrativos. Toda cuenta creada desde el frontend queda como estudiante.

## Siguiente etapa propuesta

Ejecutar una prueba manual extremo a extremo con Django y Angular activos: crear cuenta, login, acceso a `/home`, credenciales invalidas, respuesta `401`, modal de sesion expirada y logout. Despues se puede pasar a la siguiente historia.

**Se requiere autorizacion para continuar con la siguiente historia de usuario.**
