# Estándar de Diseño y Contrato de API REST v1.0
## Sistema N.E.X.U.S. (Núcleo de Expediente y Seguimiento Universitario Superior)
**Documento Normativo de Integración y Servicios Web**  
**Versión:** 1.0 — Canónica de Producción  
**Clasificación:** Restringido / Especificación Oficial de API  

---

## 1. Directrices Generales de Diseño

Todas las interfaces de programación de aplicaciones (API) del sistema N.E.X.U.S. deben apegarse de forma estricta a los siguientes lineamientos arquitectónicos:

1. **Prefijo Global y Versionado:**  
   Todos los endpoints deben estar expuestos bajo el espacio de nombres `/api/v1/`.
2. **Convención de Nombres en URLs:**  
   Las URLs deben redactarse en `kebab-case`, en plural para colecciones de recursos, y **con barra inclinada final obligatoria (*trailing slash*)**:
   - Correcto: `/api/v1/tutoring-sessions/`, `/api/v1/academic-output/research-stays/`
   - Incorrecto: `/api/v1/tutoringSessions`, `/api/v1/academic_output/research_stays`
3. **Formato de Cargas Útiles (*Payloads*):**  
   - En el backend (Django REST Framework), las propiedades JSON se transmiten en `snake_case` (ej. `fecha_sesion`, `porcentaje_avance`).
   - En el frontend (Angular 20), los modelos e interfaces TypeScript mapean de manera transparente estos campos conservando tipado estricto.

---

## 2. Autenticación y Autorización (SimpleJWT & RBAC)

El sistema utiliza autenticación basada en tokens web JSON (JWT) provistos por `djangorestframework-simplejwt` con control de acceso basado en roles.

### 2.1. Catálogo Oficial de Roles RBAC
* `STUDENT`: Estudiante / Doctorando matriculado.
* `TUTOR`: Tutor / Asesor Principal de tesis.
* `COMMITTEE_MEMBER`: Coasesor / Miembro del Comité Tutorial.
* `PROGRAM_COORDINATOR`: Coordinador del Programa de Posgrado.
* `ACADEMIC_ADMIN`: Administrador Académico y de Control Escolar.
* `SYSTEM_ADMIN`: Administrador del Sistema / Superusuario.

### 2.2. Encabezado de Solicitud
Todas las peticiones a rutas protegidas deben incluir el encabezado estándar:
```http
Authorization: Bearer <access_token>
```

### 2.3. Parámetros de Ciclo de Vida del Token
- **Token de Acceso (`access`):** Vigencia de 8 horas.
- **Token de Refresco (`refresh`):** Vigencia de 7 días con rotación automática (`ROTATE_REFRESH_TOKENS = True`).

### 2.4. Endpoints de Autenticación
* `POST /api/v1/auth/login/`  
  * **Payload Solicitud:**
    ```json
    {
      "email": "coordinador@nexus.edu",
      "password": "PasswordSeguro123!"
    }
    ```
  * **Respuesta Exitosa (HTTP 200 OK):**
    ```json
    {
      "access": "eyJhbGciOiJIUzI1NiIsIn...",
      "refresh": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": 1,
        "email": "coordinador@nexus.edu",
        "first_name": "Coordinador",
        "last_name": "Académico",
        "role": "PROGRAM_COORDINATOR"
      }
    }
    ```
* `POST /api/v1/auth/token/refresh/`  
  * **Payload Solicitud:**
    ```json
    {
      "refresh": "eyJhbGciOiJIUzI1NiIsIn..."
    }
    ```
  * **Respuesta Exitosa (HTTP 200 OK):**
    ```json
    {
      "access": "eyJhbGciOiJIUzI1NiIsIn...",
      "refresh": "eyJhbGciOiJIUzI1NiIsIn..."
    }
    ```

---

## 3. Estructura Estándar de Sobres de Respuesta HTTP

### 3.1. Respuestas Exitosas

#### A. Creación de Recurso (HTTP 201 Created)
Retorna la representación completa de la entidad creada e incluye el identificador generado:
```json
{
  "id": 14,
  "matricula": "DOC-2024-001",
  "nombre_completo": "Ana Laura Morales Vega",
  "programa_doctoral": "Doctorado en Ciencias",
  "cohorte": "2024-A",
  "estatus_activo": true,
  "created_at": "2026-09-01T14:30:00Z"
}
```

#### B. Consulta y Actualización (HTTP 200 OK)
Retorna la entidad con campos enriquecidos (anidados o agregados para optimizar el consumo del cliente):
```json
{
  "id": 5,
  "student": 14,
  "student_matricula": "DOC-2024-001",
  "student_nombre": "Ana Laura Morales Vega",
  "descripcion": "Entrega de protocolo de tesis revisado con asesor",
  "responsable": 2,
  "responsable_nombre": "Dr. Roberto Gómez",
  "fecha_limite": "2026-09-15",
  "estado": "PENDIENTE",
  "is_vencido": false,
  "created_at": "2026-09-01T10:00:00Z"
}
```

#### C. Eliminación de Recurso (HTTP 200 OK o HTTP 204 No Content)
```json
{
  "detail": "Registro eliminado exitosamente."
}
```

---

### 3.2. Respuestas de Error

#### A. Error de Validación de Datos (HTTP 400 Bad Request)
Los errores de validación de formulario o de serializador deben estructurarse como un diccionario donde cada clave corresponde al nombre del campo infractor y su valor es una lista de cadenas de texto con la causa:
```json
{
  "fecha_limite": [
    "La fecha límite es un campo obligatorio."
  ],
  "responsable": [
    "Este campo no puede ser nulo."
  ]
}
```

#### B. Error de Autenticación (HTTP 401 Unauthorized)
```json
{
  "detail": "Las credenciales de autenticación no se proveyeron o son inválidas."
}
```

#### C. Error de Permisos y Roles RBAC (HTTP 403 Forbidden)
```json
{
  "detail": "No tiene permisos suficientes para ejecutar esta acción. Rol requerido: PROGRAM_COORDINATOR."
}
```

#### D. Recurso No Encontrado (HTTP 404 Not Found)
```json
{
  "detail": "El recurso solicitado no existe o no se encuentra disponible."
}
```

---

## 4. Estándar de Paginación de Recursos

Las consultas a colecciones de recursos (`GET /api/v1/{recurso}/`) implementan `PageNumberPagination` de DRF con tamaño estándar de página de 10 elementos (configurable mediante parámetro `page_size`):

```json
{
  "count": 48,
  "next": "http://127.0.0.1:8000/api/v1/students/?page=3",
  "previous": "http://127.0.0.1:8000/api/v1/students/?page=1",
  "results": [
    {
      "id": 21,
      "matricula": "DOC-2024-021",
      "nombre_completo": "Carlos Mendoza Ruiz",
      "cohorte": "2024-A",
      "estatus_activo": true
    },
    {
      "id": 22,
      "matricula": "DOC-2024-022",
      "nombre_completo": "Elena Soto Paredes",
      "cohorte": "2024-A",
      "estatus_activo": true
    }
  ]
}
```

---

## 5. Catálogo Global de Rutas y Endpoints Canónicos

| Módulo | Prefijo URL | Métodos Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| **Identidad** | `/api/v1/auth/` | `POST` | `login/`, `logout/`, `token/refresh/`, `me/` |
| **Estudiantes** | `/api/v1/students/` | `GET`, `POST`, `PUT`, `DELETE` | Padrón, ficha técnica, semestres y comités |
| **Tutorías** | `/api/v1/tutoring-sessions/` | `GET`, `POST`, `PUT`, `DELETE` | Sesiones, asistencia y minutas de observación |
| **Acuerdos** | `/api/v1/agreements/` | `GET`, `POST`, `PATCH`, `DELETE` | Acuerdos, compromisos y cambio de estado con auditoría |
| **Tesis** | `/api/v1/thesis/` | `GET`, `POST`, `PUT` | Registro de avance porcentual y desglose JSON |
| **Salida Académica** | `/api/v1/academic-output/` | `GET`, `POST`, `PUT`, `DELETE` | `publications/`, `events/`, `research-stays/`, `other-products/` |
| **Evidencias** | `/api/v1/evidence/` | `GET`, `POST`, `DELETE` | `upload/` (Multipart hasta 15MB), metadatos y DOIs |
| **Monitoreo** | `/api/v1/monitoring/` | `GET` | `timeline/`, `dashboard/`, `alerts/`, `supervision-alerts/` |
| **Reportes** | `/api/v1/reporting/` | `GET` | `dossier/`, `dossier/pdf/`, `dossier/excel/` |
