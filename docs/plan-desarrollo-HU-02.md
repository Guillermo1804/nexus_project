# Plan de desarrollo: HU-02 Controlar acceso por rol

## 1. Objetivo

Implementar control de acceso basado en roles para que cada usuario pueda consultar y ejecutar únicamente las operaciones autorizadas para su rol dentro de N.E.X.U.S.

La solución tendrá dos capas coordinadas:

- **Backend:** Django será la autoridad de autenticación, autorización y protección de datos.
- **Frontend:** Angular ocultará opciones no permitidas y protegerá la navegación, sin sustituir las validaciones del backend.

## 2. Alcance funcional

1. Identificar al usuario autenticado y sus roles/permisos.
2. Consultar los permisos asociados al usuario desde la sesión o el token.
3. Restringir rutas y acciones en Angular mediante guards y directivas.
4. Rechazar en Django cualquier solicitud que no cumpla el permiso requerido.
5. Presentar un comportamiento claro para acceso denegado, sesión expirada y usuario no autenticado.
6. Registrar pruebas de autorización para los tres criterios de aceptación de la historia.

Fuera de alcance inicial: administración visual de roles y permisos, jerarquías entre roles, y un sistema de permisos por objeto o por expediente, salvo que una historia posterior lo requiera.

## 3. Diseño propuesto

### 3.1 Backend con Django

1. Crear el proyecto Django dentro de `Backend/` y separar la configuración, las aplicaciones de dominio y la API.
2. Usar el sistema de usuarios, grupos y permisos de Django como base. Crear los roles como grupos: `estudiante`, `asesor` y `coordinador`.
3. Definir permisos explícitos por operación, por ejemplo `view_authorized_records`, `create_tutoring` y `view_global_academic_information`.
4. Exponer un endpoint de sesión/perfil, por ejemplo `GET /api/auth/me`, que devuelva identidad, rol y permisos efectivos.
5. Aplicar autenticación y permisos en cada endpoint mediante clases de permiso o decoradores reutilizables. La autorización debe ejecutarse en servidor antes de consultar o mutar información.
6. Responder con `401` cuando falte autenticación o haya expirado la sesión, y con `403` cuando el usuario esté autenticado pero no tenga autorización.
7. Agregar migraciones, datos iniciales de roles/permisos y pruebas automatizadas de matriz de acceso.

### 3.2 Frontend con Angular

1. Crear el servicio de autenticación para conservar el estado de sesión y consumir `GET /api/auth/me`.
2. Crear un `authGuard` para impedir el acceso a rutas de usuarios no autenticados.
3. Crear un `roleGuard` o guard de permisos que reciba el permiso requerido en `route.data`.
4. Añadir un interceptor HTTP para adjuntar la credencial y centralizar el tratamiento de `401` y `403`.
5. Crear una directiva estructural o servicio de autorización para mostrar u ocultar acciones según permisos. Esto mejora la experiencia, pero no reemplaza el backend.
6. Definir una vista de acceso denegado y navegación de retorno segura.
7. Añadir pruebas unitarias para guards, interceptor, servicio y visibilidad de acciones.

## 4. Fases de implementación

### Fase 1: contratos y base técnica

- Confirmar mecanismo de autenticación, expiración y renovación de sesión.
- Definir nombres de roles, permisos, endpoints, payloads y códigos de respuesta.
- Crear la estructura inicial Django y la configuración de entorno.
- Definir tipos/interfaces equivalentes en Angular.

**Salida:** contrato de autorización aprobado y proyectos ejecutables.

### Fase 2: autorización del backend

- Configurar usuarios, grupos y permisos.
- Crear endpoint de perfil/sesión.
- Proteger endpoints existentes y los nuevos relacionados con expedientes, tutorías e información académica.
- Añadir migraciones, fixtures o comando de inicialización.
- Implementar pruebas de acceso permitido, denegado y no autenticado.

**Salida:** API que no permite evadir permisos modificando el cliente.

### Fase 3: integración Angular

- Implementar estado de autenticación, guard, interceptor y control de permisos.
- Configurar rutas protegidas y metadatos de permisos.
- Construir vistas de acceso denegado, sesión expirada y carga del perfil.
- Aplicar visibilidad condicional a menús, botones y acciones.
- Añadir pruebas unitarias y pruebas de navegación.

**Salida:** interfaz coherente con los permisos recibidos por la API.

### Fase 4: verificación y entrega

- Ejecutar pruebas Django y `ng test`.
- Ejecutar build de Angular y validación de migraciones.
- Probar manualmente la matriz completa con una cuenta de cada rol.
- Revisar que endpoints protegidos devuelvan `401/403` correctamente.
- Documentar variables de entorno, usuarios de prueba y pasos de despliegue.

**Salida:** HU-02 lista para revisión funcional y técnica.

## 5. Criterios de aceptación verificables

- Un estudiante solo puede consultar expedientes para los que tenga autorización; una solicitud fuera de alcance devuelve `403`.
- Un asesor puede registrar tutorías únicamente para estudiantes asociados a él; cualquier intento sobre otro estudiante es rechazado por el backend.
- Un coordinador puede consultar la información global académica sin recibir automáticamente permisos de edición.
- Un usuario sin sesión no puede acceder a rutas ni endpoints protegidos y recibe una respuesta `401` o es redirigido al inicio de sesión.
- La interfaz no muestra acciones no autorizadas y ofrece una respuesta clara ante un `403`.
- Los permisos se validan en servidor y no dependen de valores enviados por el navegador.

## 6. Pruebas y calidad

- **Django:** pruebas de modelos/permisos, endpoints y matriz rol-acción-recurso.
- **Angular:** pruebas de guards, interceptor, servicio de sesión y directiva de permisos.
- **Integración:** sesión válida, sesión expirada, `401`, `403`, permisos múltiples y usuario sin rol.
- **Regresión:** navegación pública, login y endpoints de historias anteriores.
- **Seguridad:** no confiar en roles enviados por el cliente, evitar filtrar información en respuestas `403`, y no registrar tokens o credenciales.

## 7. Dependencias y riesgos

- La implementación requiere confirmar la estrategia de autenticación (sesión Django o token) antes de cerrar el interceptor Angular.
- El alcance de “información autorizada” y la relación asesor-estudiante deben existir en el modelo de dominio o definirse como parte de esta historia.
- Si los endpoints de historias previas aún no existen, primero se implementarán los contratos y permisos sobre endpoints simulados o sobre los primeros endpoints reales.
- Los permisos de interfaz son solo una ayuda visual; la protección efectiva seguirá estando en Django.

## 8. Definición de terminado

La historia estará terminada cuando el backend y el frontend estén integrados, las migraciones y pruebas pasen, los tres criterios de aceptación se demuestren con cuentas de prueba, y la documentación de configuración permita reproducir el flujo en desarrollo.
