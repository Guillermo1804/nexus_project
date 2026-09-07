# Implementacion HU 1

## Estado

Fase 2 - Backend implementado y entorno Docker preparado.

La fase 1 definio un contrato inicial basado en sesiones Django. En esta fase se implemento ese contrato en el backend y se preparo un entorno reproducible con Docker Compose para ejecutar Django junto con PostgreSQL.

## Tecnologias confirmadas

- Frontend: Angular 20.
- Backend: Django.
- Base de datos de desarrollo: SQLite.
- Comunicacion: API HTTP; en entornos no locales debe utilizar HTTPS.

## Hallazgos del repositorio

- El proyecto Django base existe en `Backend/nexus/` y utiliza el modelo `User` integrado de Django.
- No se requiere un modelo propio ni migraciones de la aplicacion de autenticacion, porque la autenticacion usa las migraciones incluidas por Django.
- Angular ya tiene configurado el router, pero `routes` esta vacio.
- Angular tiene disponible `@angular/forms` como dependencia.
- La pantalla actual es el contenido de bienvenida generado por Angular y aun no representa el flujo de autenticacion.

## Implementacion de fase 2

### Backend Django

- Se creo la aplicacion `auth_api`.
- Se expusieron `POST /api/auth/login/`, `POST /api/auth/logout/` y `GET /api/auth/session/`.
- El login usa `authenticate()` y `login()` de Django, acepta JSON y devuelve solamente `id`, `username` e `is_staff`.
- Las credenciales invalidas, los usuarios inexistentes, los usuarios inactivos y las solicitudes incompletas devuelven el mismo `401` con `Credenciales invalidas.`.
- Logout valida que exista una sesion, la invalida y responde `204`.
- La consulta de sesion responde `401` con `No autenticado.` cuando no hay sesion valida.
- La vista de sesion entrega la cookie CSRF para que el cliente pueda preparar solicitudes de cambio de estado.
- Se mantuvo la cookie de sesion `HttpOnly` y se parametrizaron secreto, hosts, cookies seguras y origenes CSRF mediante variables de entorno.

### Base de datos y Docker

- SQLite continua siendo la base de datos predeterminada para desarrollo local.
- Se agrego soporte para PostgreSQL mediante `DATABASE_ENGINE=postgres` y variables `POSTGRES_*`.
- `Backend/docker-compose.yml` levanta `web` y `db` usando `postgres:16-alpine`, un volumen persistente y un healthcheck antes de iniciar Django.
- `Backend/Dockerfile` instala las dependencias, ejecuta migraciones y arranca Django en el puerto `8000`.
- Las dependencias Python quedaron declaradas en `Backend/requirements.txt`.

Para levantar el backend y la base de datos con Docker:

```bash
cd Backend
docker compose up --build
```

La API queda disponible en `http://localhost:8000/`. En un entorno real se debe definir un `DJANGO_SECRET_KEY` seguro, restringir `DJANGO_ALLOWED_HOSTS`, usar HTTPS y configurar `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` y `CSRF_TRUSTED_ORIGINS`.

### Pruebas implementadas

Se agregaron pruebas para:

- Login exitoso y respuesta mínima del usuario.
- Respuesta uniforme ante contraseña incorrecta y usuario inexistente.
- Rechazo de usuarios inactivos.
- Consulta de sesión, logout y rechazo posterior al logout.

Validaciones ejecutadas correctamente:

```bash
cd Backend/nexus
python manage.py test auth_api
python manage.py check
```

Resultado: 4 pruebas correctas y sin errores de comprobación Django. La validación `docker compose config` no pudo ejecutarse en este entorno porque Docker CLI no está instalado o no está disponible en el `PATH`.

## Contrato propuesto

La primera implementacion utilizara el sistema de autenticacion integrado de Django y sesiones del servidor. No se almacenara un token en `localStorage` ni `sessionStorage`.

### Usuario e identificador

- Se utilizara el modelo `User` integrado de Django inicialmente.
- El identificador provisional sera `username`, porque permite empezar sin crear un modelo de usuario personalizado.
- La contrasena sera recibida unicamente por el endpoint de login y nunca se devolvera ni se registrara.
- Solo los usuarios activos (`is_active=true`) podran autenticarse.

### Endpoints

| Metodo | Ruta | Requiere autenticacion | Proposito |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login/` | No | Validar credenciales y crear la sesion. |
| `POST` | `/api/auth/logout/` | Si | Invalidar la sesion actual. |
| `GET` | `/api/auth/session/` | No | Consultar si existe una sesion valida y devolver el usuario minimo. |

Las rutas se consideran provisionales y deberan mantenerse bajo un prefijo `/api/`.

### Solicitud de login

```json
{
  "username": "usuario.ejemplo",
  "password": "contrasena"
}
```

### Respuesta exitosa

`200 OK`

```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "usuario.ejemplo",
    "is_staff": false
  }
}
```

La respuesta incluira solamente la informacion minima necesaria para el contexto del frontend. Los permisos detallados se resolveran en fases posteriores con el backend.

### Respuesta de autenticacion fallida

`401 Unauthorized`

```json
{
  "detail": "Credenciales invalidas."
}
```

Se utilizara la misma respuesta para usuario inexistente, contrasena incorrecta y usuario inactivo. No se revelara cual dato fallo ni si el usuario existe.

### Respuesta de sesion no autenticada

`401 Unauthorized`

```json
{
  "detail": "No autenticado."
}
```

### Respuesta de logout

`204 No Content`

El backend invalidara la sesion y eliminara la cookie de sesion cuando corresponda.

## Politica de sesion y seguridad

- Django administrara la sesion en el servidor.
- El navegador recibira una cookie de sesion `HttpOnly`.
- En produccion se configuraran `Secure`, `SameSite` y HTTPS de acuerdo con el despliegue.
- El frontend no guardara contrasenas ni tokens persistentes.
- Las vistas protegidas del backend validaran la sesion; las guardas de Angular solo controlaran la navegacion y no reemplazaran la autorizacion del servidor.
- Las respuestas de error de login seran uniformes.
- No se registraran contrasenas, cookies ni datos sensibles.
- Para solicitudes que modifiquen estado se contemplara la proteccion CSRF de Django, especialmente para login y logout con cookies.

## Flujo acordado para implementar

1. El formulario Angular valida que `username` y `password` sean obligatorios.
2. Angular envia `POST /api/auth/login/` con credenciales y credenciales de navegador habilitadas.
3. Django valida usuario activo y credenciales, crea la sesion y responde con el usuario minimo.
4. Angular conserva el estado de autenticacion solo durante la sesion de la aplicacion y navega a la ruta protegida inicial.
5. Ante un `401`, Angular muestra un mensaje generico sin limpiar ni exponer datos sensibles.
6. Logout envia `POST /api/auth/logout/`, limpia el estado local y navega al login.
7. Una guardia Angular consulta el estado de sesion y redirige a `/login` cuando no existe una sesion valida.

## Rutas frontend previstas

- `/login`: pantalla publica de autenticacion.
- `/inicio`: primera ruta protegida despues de un login exitoso.

Estas rutas aun no estan implementadas.

## Decisiones pendientes antes de la fase 3

1. Confirmar si el identificador definitivo sera `username`, correo electronico o ambos.
2. Confirmar la politica de expiracion, renovacion y duracion de la sesion.
3. Confirmar el dominio y configuracion CORS/CSRF entre Angular y Django durante desarrollo.
4. Confirmar la pantalla protegida inicial despues del login.
5. Definir la politica ante multiples intentos fallidos.
6. Confirmar como se expondran los roles y permisos consumidos por Angular.

## Resultado de la fase 1

Se dejo definido un contrato inicial de autenticacion basado en sesiones Django, SQLite para desarrollo, respuestas JSON uniformes y proteccion tanto en frontend como en backend.

## Resultado de la fase 2

El backend Django ya implementa el contrato de autenticacion y cuenta con pruebas automatizadas para los criterios principales. El entorno de despliegue local con Docker Compose permite ejecutar Django con PostgreSQL y conserva los datos en un volumen. El frontend Angular aun no consume estos endpoints y la configuracion de Docker debe validarse en un equipo con Docker instalado.

## Permiso requerido

Solicito autorizacion para continuar con la fase 3: implementar en Angular el formulario de login, el servicio de autenticacion, la gestion CSRF/sesion, la guardia de rutas, el interceptor HTTP, la ruta protegida `/inicio` y el cierre de sesion.
