# HU-01 - Autenticarse

## Historia de usuario

Como usuario autorizado, quiero iniciar sesion para acceder a la informacion correspondiente a mi rol.

## Objetivo

Permitir que un usuario registrado valide sus credenciales y acceda al sistema de forma segura. El flujo debe distinguir entre una autenticacion exitosa, unas credenciales invalidas y el cierre de sesion, sin exponer informacion sensible.

## Estado actual del esqueleto

### Backend

El backend es un proyecto Django ubicado en `Backend/nexus/`. Para esta implementacion rapida se utilizara SQLite como unica base de datos.

La estructura actual relevante es:

```text
Backend/
|-- Dockerfile
|-- docker-compose.yml
|-- requirements.txt
`-- nexus/
	|-- manage.py
	`-- nexus/
		|-- settings.py
		|-- urls.py
		`-- views/
			|-- alumnos.py
			|-- asesor.py
			|-- auth.py
			`-- comite.py
```

Situacion actual:

- `django.contrib.auth` y `django.contrib.sessions` estan instalados como parte de la configuracion base de Django.
- El middleware de sesiones y autenticacion esta habilitado como parte de la configuracion base de Django.
- Para esta historia se propone autenticacion por token de Django REST Framework (`TokenAuthentication`), siguiendo el patron probado en el proyecto similar; no es JWT.
- `Backend/nexus/nexus/views/auth.py` contiene las vistas `CustomAuthToken` y `Logout` para login y cierre de sesion.
- La autenticacion se registra directamente en `nexus/urls.py` bajo `/api/auth/login/` y `/api/auth/logout/`; no se utiliza una app `auth_api` separada.
- `docker-compose.yml` ejecuta unicamente el servicio web; SQLite se almacena en el archivo local configurado por Django.
- No hay modelos, serializadores, endpoints protegidos ni pruebas propias de autenticacion.

### Frontend

El frontend es una aplicacion Angular 20 standalone ubicada en `FrontEnd/nexus_project/`.

Situacion actual:

- `src/app/app.ts` solo renderiza el `RouterOutlet` y conserva el titulo base.
- `src/app/app.routes.ts` no define rutas.
- No existen aun pagina de login, servicio de autenticacion, guard, interceptor HTTP ni modelo de tokens/sesion.
- El proyecto ya incluye `@angular/forms`, `@angular/router` y `rxjs`, por lo que pueden utilizarse para implementar el flujo sin agregar dependencias inicialmente.

Esta historia describe el comportamiento objetivo; no debe interpretarse que los endpoints o componentes anteriores ya estan implementados.

## Criterios de aceptacion

### CA-01.1 - Inicio de sesion exitoso

- Dado un usuario activo con credenciales validas.
- Cuando inicia sesion.
- Entonces el sistema valida sus credenciales, crea el contexto de autenticacion y le permite acceder a los recursos autorizados.

### CA-01.2 - Credenciales incorrectas

- Dado un usuario que proporciona credenciales invalidas.
- Cuando intenta ingresar.
- Entonces el acceso es rechazado.
- El sistema muestra un mensaje generico y no revela si el usuario existe, cual credencial fallo ni otros datos internos.

### CA-01.3 - Cierre de sesion

- Dado un usuario autenticado.
- Cuando cierra sesion.
- Entonces se invalida su contexto de autenticacion y deja de tener acceso a recursos protegidos.
- Si intenta volver a un recurso protegido, debe ser redirigido al inicio de sesion.

## Alcance funcional

### Incluido

- Formulario de inicio de sesion.
- Validacion de campos obligatorios y formato basico.
- Envio de credenciales al backend mediante HTTPS en los entornos correspondientes.
- Gestion de respuestas exitosas y fallidas.
- Persistencia segura del estado de autenticacion durante la sesion.
- Proteccion de rutas y recursos privados.
- Cierre de sesion y limpieza del estado local.
- Mensajes de error comprensibles y no reveladores.

### Fuera de alcance inicial

- Recuperacion o cambio de contrasena.
- Registro de nuevos usuarios.
- Autenticacion multifactor.
- Inicio de sesion con proveedores externos.
- Administracion de roles y permisos, salvo el consumo de la autorizacion ya definida por el backend.

## Analisis tecnico

### Flujo propuesto

1. El usuario introduce su correo electronico y contrasena en el formulario.
2. El frontend valida que los campos sean obligatorios y envia la solicitud al endpoint de autenticacion.
3. El backend verifica que el usuario este activo y que las credenciales sean validas.
4. En caso exitoso, el backend emite un token DRF y devuelve la informacion minima del usuario autenticado, incluyendo el rol autorizado.
5. El frontend almacena el token segun la politica de seguridad del proyecto, actualiza el contexto de autenticacion y navega a la pantalla `HOME`.
6. En caso fallido, el frontend conserva el formulario, muestra un error generico y no guarda credenciales.
7. Si el token expira o deja de ser valido, el frontend limpia el estado local, muestra un modal informando que la sesion expiro y solicita volver a iniciar sesion.
8. Al cerrar sesion, el cliente solicita la invalidacion al backend, limpia el estado local y navega al inicio de sesion.

### Componentes a considerar

- **Frontend Angular:** pagina o componente standalone de login, servicio de autenticacion, interceptor HTTP, guard de rutas y modelo de usuario/sesion.
- **Backend Django:** app de autenticacion, rutas bajo `/api/auth/`, vistas de login/logout, validacion de usuario activo, emision y validacion de tokens DRF, roles por grupos, revocacion de tokens y proteccion de recursos.
- **Seguridad:** contrasenas almacenadas con hash seguro en backend, tokens revocables y almacenados en base de datos, transporte cifrado, respuestas de error uniformes y ausencia de credenciales o tokens en logs.

### Contrato definido y pendientes

- Identificador de acceso definido: correo electronico como unico identificador. El backend debe validar su formato y resolverlo contra un usuario activo con correo unico.
- Metodo y ruta final de login, tomando `/api/auth/` como prefijo existente en `nexus/urls.py`.
- Nombres de los campos enviados y estructura de la respuesta.
- Estrategia definida: `TokenAuthentication` de Django REST Framework y encabezado `Authorization: Token <token>`.
- Politica de expiracion o rotacion de tokens, si se requiere, y mecanismo de renovacion.
- Lugar de almacenamiento de los tokens en el frontend; no se deben guardar tokens en `localStorage`.
- Metodo y ruta de logout, incluyendo la eliminacion o invalidacion efectiva del token.
- Codigo y formato de errores.
- Ruta posterior al login definida: `HOME`. La ruta exacta del frontend debe ser `/home` o la que establezca el enrutamiento final.
- Comportamiento definido para la expiracion: mostrar un modal indicando que la sesion expiro y que el usuario debe volver a iniciar sesion.
- Politica ante multiples intentos fallidos: pendiente de definir.

## Plan de implementacion

### Fase 1 - Confirmar contrato y preparar el esqueleto

- Confirmar que el correo sea unico en el modelo de usuario y definir como se resolvera el correo antes de autenticarlo.
- Confirmar las rutas, los metodos HTTP, los campos de entrada y las respuestas del contrato.
- Definir el contrato del token: duracion, rotacion, formato de respuestas y mecanismo de revocacion.
- Confirmar el modelo de usuario Django, el campo que representa el estado activo y los permisos requeridos.
- Corregir la referencia de `nexus/urls.py` a `auth_api.urls` creando la app correspondiente o conectando las vistas al modulo real; no dejar un import a un modulo inexistente.
- Acordar la estrategia de expiracion, renovacion y logout. El ejemplo de referencia no usa refresh token; si se agrega, debe documentarse por separado.
- Definir la politica ante multiples intentos fallidos, incluyendo limites, ventana de tiempo y mensaje mostrado.
- Documentar ejemplos de solicitudes y respuestas.

### Fase 2 - Implementar backend Django

- Crear la app y los modulos necesarios siguiendo el esqueleto actual, manteniendo separadas las responsabilidades de autenticacion y de las vistas futuras de `alumnos`, `asesor` y `comite`.
- Incorporar Django REST Framework y `rest_framework.authtoken` en la configuracion y dependencias del backend.
- Crear los modelos y migraciones necesarias para los tokens y registrar `rest_framework.authtoken` en `INSTALLED_APPS`.
- Implementar el endpoint de login bajo el prefijo `/api/auth/` con correo, contrasena y validacion de credenciales mediante las APIs de Django REST Framework.
- Rechazar usuarios inactivos y credenciales invalidas con la misma respuesta generica; no incluir contrasenas ni datos sensibles en logs o respuestas.
- Crear `CustomAuthToken` a partir de `ObtainAuthToken`, verificando que el usuario este activo antes de responder.
- Obtener los roles desde `user.groups`, rechazar usuarios sin rol valido y devolver solo el perfil minimo asociado al rol junto con el token.
- Implementar logout como endpoint `POST` protegido por `IsAuthenticated`, eliminando el token del usuario y devolviendo una respuesta consistente.
- Proteger los endpoints privados con `TokenAuthentication` y validar permisos en backend, sin depender exclusivamente de las guardas de Angular.
- No usar `GET` para logout ni imprimir usuarios, tokens o credenciales en la salida del servidor.
- Agregar migraciones, datos de prueba controlados y pruebas unitarias/de integracion para emision, validacion, usuario inactivo, usuario sin rol, roles validos, logout, revocacion y acceso sin token.

### Fase 3 - Implementar frontend Angular

- Crear una pagina standalone de login y registrarla en `app.routes.ts` como ruta publica.
- Crear el modelo de usuario/token y un `AuthService` con `HttpClient` para login, consulta de identidad y logout.
- Implementar el formulario reactivo con correo electronico, contrasena, campos obligatorios, formato basico y estado de carga.
- Mostrar un mensaje generico para cualquier fallo de autenticacion y conservar los campos sin guardar contrasenas localmente.
- Mantener el token en memoria siempre que sea posible y evitar `localStorage` salvo decision documentada.
- Crear un guard para impedir la navegacion a rutas privadas sin un token valido y redirigir a `/login`.
- Crear un interceptor para adjuntar `Authorization: Token <token>` y reaccionar ante respuestas `401`.
- Implementar la ruta privada `HOME` y el cierre de sesion, eliminando el token en backend y limpiando el estado en memoria antes de navegar a `/login`.
- Implementar el modal de sesion expirada ante respuestas `401` o invalidacion del token, evitando mostrarlo repetidamente durante la misma expiracion.
- Agregar pruebas del formulario, servicio, guard, interceptor, revocacion y navegacion para los escenarios de aceptacion.

### Fase 4 - Integrar y verificar la historia

- Ejecutar Django con SQLite, aplicar migraciones y verificar que el proyecto cargue sin errores de URLs; ajustar el flujo de Docker si se necesita conservarlo como entorno de desarrollo.
- Ejecutar pruebas de backend para login valido, credenciales invalidas, usuario inactivo, usuario sin rol, roles validos, logout, revocacion y acceso a recursos protegidos.
- Ejecutar pruebas de Angular y el build de produccion.
- Probar manualmente el flujo integrado: login valido con correo, error generico, acceso a `HOME`, recarga, modal de sesion expirada y logout.
- Confirmar que una ruta privada no sea accesible sin un token DRF valido aunque se acceda directamente por URL.
- Confirmar que no se almacenen contrasenas ni tokens en `localStorage` o logs; el token debe permanecer en memoria salvo decision documentada.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Exposicion de credenciales o tokens | Usar HTTPS, no registrar secretos y aplicar la estrategia de almacenamiento acordada. |
| Enumeracion de usuarios por mensajes distintos | Responder con un mensaje generico para cualquier fallo de autenticacion. |
| Token reutilizable despues de logout | Eliminar el token en backend y limpiar todo el estado del cliente. |
| Acceso directo a rutas privadas | Aplicar guardas en frontend y autorizacion real en backend. |
| Contrato frontend/backend inconsistente | Definir ejemplos de API antes de integrar y cubrirlos con pruebas. |

## Definicion de terminado

- Los tres criterios de aceptacion pasan en pruebas automatizadas y manuales.
- Las rutas de autenticacion estan registradas directamente desde `nexus/views/auth.py` y el backend arranca correctamente con el esqueleto existente.
- El contrato de autenticacion esta documentado con rutas, metodos, campos, respuestas y estrategia `TokenAuthentication`.
- El login acepta correo electronico como unico identificador y navega a `HOME` tras una respuesta exitosa.
- Las rutas privadas requieren un token DRF valido tanto en frontend como en backend.
- Logout impide reutilizar el token eliminado y limpia el estado local.
- Una sesion expirada o un token invalido muestra el modal definido y devuelve al usuario al login.
- No se almacenan ni registran contrasenas.
- Los mensajes de error no permiten identificar usuarios ni credenciales validas.
- La documentacion del contrato de autenticacion esta actualizada.
- El build y las pruebas del proyecto finalizan correctamente.

## Pendientes de refinamiento

1. ¿Que politica se aplicara despues de varios intentos fallidos?
2. ¿Los tokens tendran expiracion y rotacion, o permaneceran validos hasta ejecutar logout?