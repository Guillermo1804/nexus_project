# HU-01 - Autenticarse

## Historia de usuario

Como usuario autorizado, quiero iniciar sesion para acceder a la informacion correspondiente a mi rol.

## Objetivo

Permitir que un usuario registrado valide sus credenciales y acceda al sistema de forma segura. El flujo debe distinguir entre una autenticacion exitosa, unas credenciales invalidas y el cierre de sesion, sin exponer informacion sensible.

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

1. El usuario introduce identificador y contrasena en el formulario.
2. El frontend valida que los campos sean obligatorios y envia la solicitud al endpoint de autenticacion.
3. El backend verifica que el usuario este activo y que las credenciales sean validas.
4. En caso exitoso, el backend devuelve el mecanismo de sesion definido por el proyecto y la informacion minima del usuario autenticado.
5. El frontend almacena el estado segun la politica de seguridad del proyecto, actualiza el contexto de autenticacion y navega al area protegida.
6. En caso fallido, el frontend conserva el formulario, muestra un error generico y no guarda credenciales.
7. Al cerrar sesion, el cliente solicita la invalidacion al backend cuando aplique, limpia el estado local y navega al inicio de sesion.

### Componentes a considerar

- **Frontend Angular:** pagina o componente de login, servicio de autenticacion, interceptor HTTP, guard de rutas y modelo de usuario/sesion.
- **Backend:** endpoint de login, validacion de usuario activo, emision o gestion de sesion, endpoint de logout y middleware de proteccion.
- **Seguridad:** contrasenas almacenadas con hash seguro en backend, transporte cifrado, respuestas de error uniformes y ausencia de credenciales en logs.

### Contrato pendiente de confirmar

- Ruta y metodo del endpoint de login.
- Nombres de los campos enviados y estructura de la respuesta.
- Uso de cookie de sesion o token y su tiempo de expiracion.
- Codigo y formato de errores.
- Endpoint y comportamiento esperado para logout.
- Ruta inicial despues de autenticar y ruta de redireccion para usuarios no autenticados.

## Plan de desarrollo

### Fase 1 - Confirmar contrato

- Revisar el backend existente y definir los endpoints de login/logout.
- Confirmar el modelo de usuario, estado activo y permisos.
- Acordar la estrategia de sesion, expiracion y renovacion.
- Documentar ejemplos de solicitudes y respuestas.

### Fase 2 - Implementar backend

- Crear o completar la validacion de credenciales.
- Rechazar usuarios inactivos y credenciales invalidas con una respuesta uniforme.
- Implementar la creacion, validacion e invalidacion de sesion.
- Proteger los endpoints que requieran autenticacion.
- Añadir pruebas unitarias y de integracion para los escenarios de aceptacion.

### Fase 3 - Implementar frontend

- Crear el formulario y sus validaciones.
- Integrar el servicio de autenticacion con el contrato del backend.
- Gestionar estados de carga, exito y error.
- Añadir guardas e interceptor para proteger la navegacion y reaccionar a sesiones expiradas.
- Implementar logout y limpieza del estado.

### Fase 4 - Verificar la historia

- Probar login valido, credenciales invalidas, usuario inactivo y logout.
- Verificar que una ruta privada no sea accesible sin sesion.
- Confirmar que los mensajes no filtran informacion sensible.
- Ejecutar pruebas automatizadas, build del frontend y pruebas manuales del flujo completo.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Exposicion de credenciales o tokens | Usar HTTPS, no registrar secretos y aplicar la estrategia de almacenamiento acordada. |
| Enumeracion de usuarios por mensajes distintos | Responder con un mensaje generico para cualquier fallo de autenticacion. |
| Sesion persistente despues de logout | Invalidar la sesion en backend y limpiar todo el estado del cliente. |
| Acceso directo a rutas privadas | Aplicar guardas en frontend y autorizacion real en backend. |
| Contrato frontend/backend inconsistente | Definir ejemplos de API antes de integrar y cubrirlos con pruebas. |

## Definicion de terminado

- Los tres criterios de aceptacion pasan en pruebas automatizadas y manuales.
- Las rutas privadas requieren una sesion valida tanto en frontend como en backend.
- Logout impide reutilizar la sesion invalidada.
- No se almacenan ni registran contrasenas.
- Los mensajes de error no permiten identificar usuarios ni credenciales validas.
- La documentacion del contrato de autenticacion esta actualizada.
- El build y las pruebas del proyecto finalizan correctamente.

## Preguntas para refinamiento

1. ¿El identificador de acceso sera correo electronico, nombre de usuario o ambos?
2. ¿La sesion se gestionara mediante cookies HttpOnly o tokens?
3. ¿Que pantalla debe mostrarse inmediatamente despues del login?
4. ¿Que politica se aplicara despues de varios intentos fallidos?
5. ¿Como se debe informar al usuario cuando la sesion expire?