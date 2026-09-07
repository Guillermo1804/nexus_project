# Implementacion HU-01 - Fase 1

## Estado

Fase 1 completada: preparacion del esqueleto backend para autenticacion por tokens de Django REST Framework usando SQLite.

## Cambios realizados

### Configuracion del backend

- Se agrego Django REST Framework a `Backend/requirements.txt`.
- Se agregaron `rest_framework` y `rest_framework.authtoken` a `INSTALLED_APPS`.
- Se configuro `TokenAuthentication` como mecanismo de autenticacion predeterminado para la API.
- Se dejo SQLite como unica base de datos configurada en `settings.py`.
- Se elimino la dependencia de PostgreSQL del archivo de dependencias.
- Se ajusto `docker-compose.yml` para ejecutar solamente el servicio web, sin levantar PostgreSQL.

### Estructura de autenticacion

- Se creo la app `Backend/nexus/auth_api/`.
- Se agrego `AuthApiConfig` para registrar la app de autenticacion.
- Se agrego `auth_api/urls.py` con el espacio de rutas bajo `/api/auth/`.
- Se agrego un modulo de vistas base para implementar login y logout en la siguiente fase.
- La referencia existente de `nexus/urls.py` a `auth_api.urls` ahora puede resolverse correctamente.

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

## Pendientes de la Fase 2

- Definir el modelo de usuario y garantizar el uso de correo electronico como identificador unico.
- Implementar `CustomAuthToken` para login.
- Resolver los roles mediante grupos de Django.
- Definir y crear las respuestas del endpoint de login.
- Implementar logout mediante `POST` y eliminar el token para revocarlo.
- Proteger endpoints privados con `TokenAuthentication` y permisos.
- Agregar pruebas para credenciales invalidas, usuarios inactivos, roles, logout y acceso sin token.
