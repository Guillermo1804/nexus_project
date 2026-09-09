# Estado de integracion entre backend y frontend

**Fecha de revision:** 2026-09-09  
**Alcance:** revision de conexion y contratos. No se implementaron cambios de codigo.

## 1. Resumen ejecutivo

Actualmente el backend y el frontend **no estan conectados funcionalmente**.

El frontend ya contiene llamadas HTTP para autenticacion contra:

- `http://localhost:8000/api/auth/login/`
- `http://localhost:8000/api/auth/register/`
- `http://localhost:8000/api/auth/logout/`

Sin embargo, el backend solo registra la ruta `admin/`. No existen rutas `/api/auth/...`, vistas REST, serializers ni configuracion activa de Django REST Framework y CORS en el codigo revisado.

La compilacion de ambos proyectos es correcta de forma aislada, pero una prueba funcional de login fallaria porque los endpoints esperados por Angular no estan publicados por Django.

## 2. Estado comprobado

| Area | Estado | Evidencia |
| --- | --- | --- |
| Django inicia la comprobacion del proyecto | Correcto | `python manage.py check` termina sin errores. |
| Angular compila | Correcto | `pnpm build` termina correctamente. |
| Ruta HTTP de login | Pendiente | Angular la consume, Django no la registra. |
| Ruta HTTP de registro | Pendiente | Angular la consume, Django no la registra. |
| Ruta HTTP de logout | Pendiente | Angular la consume, Django no la registra. |
| CORS | Pendiente | `django-cors-headers` aparece en `requirements.txt`, pero no esta en `INSTALLED_APPS` ni en `MIDDLEWARE`. |
| Autenticacion por token | Pendiente | El frontend envia `Authorization: Token ...`, pero el backend no configura DRF ni una clase de autenticacion para recibirlo. |
| Persistencia de sesion | Pendiente | El frontend guarda el token solo en un `signal`; al recargar la pagina se pierde. |
| Contrato de respuesta | Pendiente | Angular espera `token`, `id`, `email`, `first_name`, `last_name` y `rol`; el backend no tiene una vista o serializer que lo garantice. |

## 3. Bloqueos encontrados en el backend

### 3.1 No hay API publicada

`Backend/nexus/nexus/urls.py` solo contiene la ruta de administracion:

```text
/admin/
```

Faltan, como minimo:

- Vistas o viewsets para autenticacion.
- Serializers para validar y convertir solicitudes/respuestas.
- Rutas para login, registro y logout.
- Rutas para las operaciones de dominio.
- Politicas de autenticacion y permisos.

### 3.2 Dependencias instaladas pero no conectadas

`requirements.txt` incluye Django REST Framework, Simple JWT, CORS y filtros, pero `settings.py` no configura actualmente:

- `rest_framework` en `INSTALLED_APPS`.
- `corsheaders` en `INSTALLED_APPS`.
- `CorsMiddleware`.
- `REST_FRAMEWORK`.
- Clases de autenticacion.
- Permisos por rol.

Esto significa que la presencia de las dependencias no representa una API funcional.

### 3.3 CORS para el desarrollo local

El `docker-compose.yml` define `CORS_ALLOWED_ORIGINS`, pero `settings.py` no consume esa variable ni activa CORS. El navegador podria bloquear las peticiones desde `http://localhost:4200` aunque el backend estuviera escuchando en el puerto 8000.

### 3.4 Configuracion de hosts

`ALLOWED_HOSTS` esta vacio en `settings.py`. En desarrollo local puede funcionar con ciertas solicitudes, pero debe definirse de forma coherente con Docker (`localhost`, `127.0.0.1` y el nombre del servicio cuando aplique).

### 3.5 Documentacion desfasada respecto al codigo

`Backend/DOCUMENTACION.md` describe una API GTEA con entidades como eventos, sedes, aulas, categorias e inscripciones, ademas de serializers y vistas que no existen en el codigo actual revisado.

El `models.py` actual define otro dominio: estudiantes de doctorado, semestres, comite academico, tutorias, acuerdos, evidencias, publicaciones, estancias y productos academicos.

Antes de implementar endpoints se debe decidir cual dominio es el vigente y actualizar la documentacion y los contratos en consecuencia.

## 4. Bloqueos encontrados en el frontend

### 4.1 Servicios de autenticacion duplicados

Hay dos implementaciones de `AuthService`:

- `src/app/core/auth/auth.service.ts`: usada por las pantallas nuevas `login` y `register`.
- `src/app/auth.service.ts`: implementacion anterior, usada por componentes antiguos.

Tambien hay dos interceptores y dos guards con contratos distintos. La ruta activa usa los archivos dentro de `core/auth`, pero mantener ambas versiones aumenta el riesgo de corregir una y dejar la otra inconsistente.

### 4.2 Token no persistente

El servicio activo guarda el token en un Angular `signal`. No usa `localStorage`, `sessionStorage` ni una estrategia equivalente. Al recargar el navegador:

1. El token desaparece.
2. El guard considera que no hay sesion.
3. Se redirige al login.

Esto debe definirse como decision funcional antes de conectar pantallas protegidas.

### 4.3 Contrato de roles no alineado

El frontend activo espera un campo `rol` como texto libre. La arquitectura y los componentes antiguos mencionan roles `admin`, `alumno` y `organizador`.

El backend actual define valores diferentes en `CustomUser.Role`:

- `STUDENT`
- `TUTOR`
- `COMMITTEE_MEMBER`
- `PROGRAM_COORDINATOR`
- `ACADEMIC_ADMIN`
- `SYSTEM_ADMIN`

Se necesita un contrato unico de roles y una tabla de autorizacion antes de proteger rutas por perfil.

### 4.4 URL fija de la API

La URL `http://localhost:8000/api/auth` esta escrita directamente en el servicio activo y en el servicio anterior. No se esta usando una configuracion por entorno, aunque la documentacion de arquitectura indica que deberia existir.

Esto impedira cambiar entre desarrollo local, Docker, pruebas y produccion sin modificar codigo fuente.

### 4.5 Logout dependiente de un endpoint inexistente

El frontend espera `POST /api/auth/logout/`. Si se utiliza autenticacion por token sin revocacion en backend, el logout debera definirse como:

- revocacion/eliminacion del token en el backend, o
- limpieza local del token, si el sistema acepta tokens no revocables.

La decision afecta el contrato y la seguridad de la sesion.

## 5. Funcionalidades del frontend que requieren backend

Estas capacidades no deben quedarse solo en estado o validacion del navegador:

| Funcionalidad | Requerimiento backend |
| --- | --- |
| Login | Validacion de credenciales, usuario activo, token y rol. |
| Registro | Creacion de `CustomUser` y `Student`, hash de password, validacion de email y matricula unica. |
| Logout | Definir revocacion del token o contrato de cierre local. |
| Guards por rol | Permisos reales en cada endpoint; el guard del frontend no es una medida de seguridad suficiente. |
| Perfil y datos del usuario | Endpoint autenticado para consultar y actualizar informacion permitida. |
| Semestres | CRUD restringido por estudiante o rol autorizado. |
| Comite academico | Alta, consulta, cambios y bajas con permisos. |
| Sesiones de tutoria | CRUD, participantes, asistencia, observaciones y control de acceso. |
| Acuerdos | CRUD, responsables, estados, vencimientos e historial de cambios. |
| Avance de tesis | Registro y consulta por estudiante y semestre. |
| Evidencias | Subida de archivos, validacion de extension/tamano, almacenamiento y descarga protegida. |
| Publicaciones y productos academicos | CRUD, asociacion con semestre/evidencia y permisos. |
| Reportes o dashboard | Consultas agregadas y endpoints optimizados para las pantallas. |

La arquitectura del frontend tambien menciona eventos, sedes, aulas, categorias, inscripciones y listas de espera. Esas funcionalidades requieren modelos y endpoints compatibles, pero no corresponden a los modelos actuales del backend. Debe confirmarse si son parte del alcance vigente o si pertenecen a una version anterior del sistema.

## 6. Contrato minimo que debe acordarse

Antes de implementar la conexion, se debe aprobar al menos lo siguiente:

### Autenticacion

```json
POST /api/auth/login/
{
  "email": "usuario@dominio.test",
  "password": "********"
}
```

Respuesta esperada por el frontend actual:

```json
{
  "token": "...",
  "id": 1,
  "email": "usuario@dominio.test",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "rol": "STUDENT"
}
```

### Registro

Definir si `POST /api/auth/register/` crea simultaneamente el usuario y el perfil `Student`, y definir los errores de validacion para email y matricula duplicados.

### Autorizacion

Definir una matriz de permisos por rol para cada recurso. El backend debe aplicar esa matriz incluso si el frontend oculta rutas o botones.

### Formato de errores

Se recomienda acordar una respuesta consistente, por ejemplo:

```json
{
  "detail": "Descripcion general del error",
  "errors": {
    "email": ["Este correo ya esta registrado."]
  }
}
```

## 7. Orden recomendado para la siguiente etapa

1. Confirmar el dominio vigente: sistema academico actual o GTEA de eventos.
2. Elegir una sola implementacion de autenticacion en Angular.
3. Definir el contrato de roles, tokens y errores.
4. Implementar en backend la base comun: DRF, CORS, autenticacion, serializers y rutas de auth.
5. Probar login, registro, logout y persistencia de sesion de extremo a extremo.
6. Implementar los endpoints de dominio por prioridad de pantalla.
7. Sustituir URLs fijas del frontend por configuracion de entorno.
8. Agregar pruebas de contrato y permisos para cada recurso.

## 8. Resultado de esta revision

No se modifico la implementacion. Se documentaron:

- Los puntos que impiden la conexion actual.
- Los errores y riesgos observables.
- La duplicidad existente en autenticacion del frontend.
- El desfase entre la documentacion GTEA, las pantallas descritas y los modelos actuales.
- Las funcionalidades que necesitan persistencia, endpoints y autorizacion en backend.
- El contrato minimo y el orden sugerido para continuar.

La conexion puede comenzar cuando se confirme el dominio funcional y se autorice implementar la primera etapa, empezando por autenticacion.
