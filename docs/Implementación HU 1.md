# Implementacion HU-01 - Fases 1, 2 y 3

## Estado

Fases 1 y 2 de backend, y Fase 3 de frontend completadas para el flujo base de autenticacion. La Fase 4 de integracion queda pendiente.

## Estado por fase

| Fase | Estado | Alcance completado |
| --- | --- | --- |
| Fase 1 - Contrato y esqueleto | Completada | SQLite, DRF, `TokenAuthentication`, rutas directas y estructura base. |
| Fase 2 - Backend Django | Completada para autenticacion base | Login por correo, roles por grupos, tokens DRF, logout y revocacion. La proteccion de los modulos de dominio queda pendiente. |
| Fase 3 - Frontend Angular | Completada | Login, servicio, interceptor, guard, `HOME`, logout, modal de expiracion y pruebas frontend. |
| Fase 4 - Integracion y verificacion | Pendiente | Prueba completa desde navegador, Docker, endpoints privados y verificacion final. |

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

## Pendientes antes de cerrar la historia

- Definir o validar una restriccion de unicidad para el correo del usuario.
- Definir respuestas especificas para perfiles de dominio cuando existan modelos de `alumnos`, `asesor` y `comite`.
- Proteger los endpoints privados de cada modulo con `TokenAuthentication` y permisos.
- Agregar pruebas automatizadas permanentes para credenciales invalidas, usuarios inactivos, usuarios sin grupo, roles, logout y acceso sin token.
- Definir la politica de expiracion o rotacion de tokens.

## Validacion de la implementacion

- `python nexus/manage.py check`: correcto, sin errores.
- `python nexus/manage.py migrate --noinput`: correcto, incluyendo `authtoken`.
- La prueba funcional temporal de login/logout se ejecuto correctamente con Django REST Framework y SQLite: credenciales invalidas `401`, login valido `200`, rol devuelto, logout `200` y token eliminado.

## Implementacion de la Fase 3 - Frontend Angular

- Se creo `AuthService` para login, logout, almacenamiento del token en memoria y estado del usuario.
- Se creo el interceptor HTTP que adjunta `Authorization: Token <token>` y maneja respuestas `401`.
- Se creo el guard de rutas que protege `/home` y redirige a `/login` cuando no existe token.
- Se creo la pagina standalone de login con validacion de correo, contrasena, carga y mensaje generico de error.
- Se creo `HOME` con informacion basica del usuario, rol y accion de logout.
- Se creo el modal de sesion expirada y su redireccion al login.
- Se registraron las rutas `/login`, `/home` y la redireccion inicial.
- Se configuro `HttpClient` con el interceptor en la aplicacion standalone.

## Integracion y Docker

- Se agrego `django-cors-headers` al backend.
- CORS queda restringido a `http://localhost:4200` y `http://127.0.0.1:4200` por defecto.
- Se agrego `FrontEnd/nexus_project/Dockerfile` para ejecutar Angular en el puerto `4200`.
- `Backend/docker-compose.yml` ahora puede levantar backend y frontend juntos.

## Pruebas del frontend

- Se actualizaron las pruebas del componente raiz para el nuevo shell de rutas.
- Se agregaron pruebas de `AuthService` para login y logout.
- `npm run build`: correcto.
- `npm test -- --watch=false --browsers=ChromeHeadless`: 4 pruebas exitosas.

## Pendientes de la Fase 4

- Levantar el stack completo con Docker y probar el flujo desde el navegador.
- Verificar login, acceso protegido a `HOME`, logout y modal de sesion expirada contra el backend real.
- Completar pruebas de endpoints privados de alumnos, asesor y comite.
- Definir expiracion o rotacion de tokens y politica ante multiples intentos fallidos.
