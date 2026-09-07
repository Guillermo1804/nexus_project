# Implementacion HU-01 - Fases 1 y 2

## Estado

Fase 2 de autenticacion backend iniciada: login y logout implementados en `nexus/views/auth.py` usando tokens de Django REST Framework y SQLite.

## Cambios realizados

### Configuracion del backend

- Se agrego Django REST Framework a `Backend/requirements.txt`.
- Se agregaron `rest_framework` y `rest_framework.authtoken` a `INSTALLED_APPS`.
- Se configuro `TokenAuthentication` como mecanismo de autenticacion predeterminado para la API.
- Se dejo SQLite como unica base de datos configurada en `settings.py`.
- Se elimino la dependencia de PostgreSQL del archivo de dependencias.
- Se ajusto `docker-compose.yml` para ejecutar solamente el servicio web, sin levantar PostgreSQL.

### Estructura de autenticacion

- Se elimino la app contenedora `Backend/nexus/auth_api/`.
- Se implementaron las vistas `CustomAuthToken` y `Logout` directamente en `Backend/nexus/nexus/views/auth.py`.
- Se registraron directamente las rutas `/api/auth/login/` y `/api/auth/logout/` en `nexus/nexus/urls.py`.
- `CustomAuthToken` recibe correo y contrasena, valida que el usuario este activo y devuelve el token DRF junto con datos basicos y el primer grupo del usuario como rol.
- `Logout` requiere autenticacion y elimina el token del usuario mediante `POST`.
- Las credenciales invalidas responden con un mensaje generico y estado `401`.

### Base de datos

- Se aplicaron las migraciones iniciales de Django.
- Se aplicaron las migraciones de `rest_framework.authtoken`.
- Se verifico la creacion y actualizacion de la base SQLite mediante las migraciones de Django; el archivo local de base de datos no se versiona.

## Actualizacion de base de datos

- SQLite queda definida como la unica base de datos del proyecto para esta implementacion.
- Se elimino la configuracion de PostgreSQL de `settings.py`, `docker-compose.yml` y `requirements.txt`.
- Docker ya no levanta un servicio de base de datos externo.

## Validacion realizada

Desde `Backend/` se ejecutaron correctamente:

```text
python nexus/manage.py check
python nexus/manage.py migrate --noinput
```

Resultado:

- El chequeo del sistema finalizo sin problemas.
- Las migraciones de `admin`, `auth`, `authtoken`, `contenttypes` y `sessions` finalizaron correctamente.

## Pendientes posteriores

- Definir o validar una restriccion de unicidad para el correo del usuario.
- Definir respuestas especificas para perfiles de dominio cuando existan modelos de `alumnos`, `asesor` y `comite`.
- Proteger los endpoints privados de cada modulo con `TokenAuthentication` y permisos.
- Definir la politica de expiracion o rotacion de tokens.

## Fase 3 - Frontend Angular

- Se creo la ruta publica `/login` con un formulario reactivo para correo y contrasena.
- Se agrego la ruta publica `/register` para crear una cuenta y su expediente de estudiante. Captura nombre, correo, matricula, cohorte y programa doctoral; crea `CustomUser` con rol inicial `STUDENT` y su registro `Student` asociado antes de autenticarlo.
- El token y los datos minimos de usuario se mantienen solo en memoria; no se usa `localStorage` ni se persiste la contrasena.
- La ruta privada `/home` usa una guarda de Angular y contiene el cierre de sesion.
- Un interceptor agrega `Authorization: Token <token>` a las solicitudes autenticadas. Una respuesta `401` limpia la sesion, redirige a `/login` y muestra un unico aviso de sesion expirada.
- Para desarrollo local, el frontend consume `http://localhost:8000/api/auth/` y el backend permite solo el origen `http://localhost:4200`. El origen se puede cambiar mediante `CORS_ALLOWED_ORIGINS`.

## Contrato de autenticacion

| Metodo | Ruta | Cuerpo / encabezado | Respuesta |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login/` | `{ "email", "password" }` | `200` con `token`, datos minimos y `rol`; `401` generico para credenciales no validas. |
| `POST` | `/api/auth/register/` | `{ "first_name", "last_name", "email", "password", "matricula", "cohorte", "programa_doctoral" }` | `201` con `token`, datos minimos y rol `STUDENT`; `400` si no se puede crear la cuenta. |
| `GET` | `/api/auth/me/` | `Authorization: Token <token>` | `200` con la identidad minima; `401` sin token valido. |
| `POST` | `/api/auth/logout/` | `Authorization: Token <token>` | `200` y elimina el token; `401` sin token valido. |

La vigencia actual del token termina cuando se ejecuta logout; una politica de expiracion o rotacion queda pendiente de refinamiento.

## Validacion de la implementacion

- `python nexus/manage.py check`: correcto, sin errores.
- `python nexus/manage.py migrate --noinput`: correcto, incluyendo `authtoken`.
- La prueba funcional temporal de login/logout se ejecuto correctamente con Django REST Framework y SQLite: credenciales invalidas `401`, login valido `200`, rol devuelto, logout `200` y token eliminado.
