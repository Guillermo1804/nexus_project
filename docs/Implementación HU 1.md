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
- Agregar pruebas automatizadas para credenciales invalidas, usuarios inactivos, usuarios sin grupo, roles, logout y acceso sin token.
- Definir la politica de expiracion o rotacion de tokens.

## Validacion de la implementacion

- `python nexus/manage.py check`: correcto, sin errores.
- `python nexus/manage.py migrate --noinput`: correcto, incluyendo `authtoken`.
- La prueba funcional temporal de login/logout se ejecuto correctamente con Django REST Framework y SQLite: credenciales invalidas `401`, login valido `200`, rol devuelto, logout `200` y token eliminado.
