# Documentación Técnica del Backend - Sistema N.E.X.U.S.

## 1. Descripción General

N.E.X.U.S. (Núcleo de Expediente y Seguimiento Universitario Superior) es una plataforma institucional diseñada para la gestión integral del expediente académico de estudiantes de posgrado (maestría y doctorado), comités tutoriales, sesiones de tutoría, acuerdos, avance de tesis y producción científica.

El backend está construido con **Python 3.14**, **Django 6.0** y **Django REST Framework (DRF)**, proporcionando una arquitectura de API REST robusta, segura y modular basada en el estándar canónico institucional.

---

## 2. Estructura del Directorio Backend

El proyecto backend se encuentra estructurado en el directorio `Backend/nexus`:

```text
Backend/
├── docker-compose.yml           # Orquestación de servicios locales
├── Dockerfile                   # Definición de contenedor para backend
├── DOCUMENTACION.md             # Especificación técnica oficial del backend
├── requirements.txt             # Dependencias del proyecto Python
└── nexus/                       # Proyecto Django principal
    ├── manage.py                # Interfaz CLI de comandos Django
    ├── db.sqlite3               # Base de datos relacional local
    └── nexus/                   # Módulo central de la aplicación
        ├── apps.py              # Configuración del módulo Django
        ├── asgi.py              # Entrada para servidores ASGI
        ├── migrations/          # Migraciones del esquema de base de datos
        ├── models.py            # Modelos ORM de datos relacionales
        ├── permissions.py       # Clases de permisos y matriz RBAC
        ├── serializers.py       # Serializadores DRF para validación y DTOs
        ├── settings.py          # Configuración global de Django, DRF y CORS
        ├── tests.py             # Pruebas automatizadas unitarias y de integración
        ├── urls.py              # Enrutador canónico de endpoints API
        └── wsgi.py              # Entrada para servidores WSGI
```

---

## 3. Modelo de Dominio y Datos (ORM)

De acuerdo con la especificación canónica del esquema (`docs/architecture/database_schema_specification.md`), los modelos implementados en `models.py` comprenden:

### 3.1. Identidad y Control de Acceso (`identity`)
- **`CustomUser`**: Usuario del sistema extendido de `AbstractBaseUser` y `PermissionsMixin`.
  - Campos: `email` (PK/identificador único), `first_name`, `last_name`, `role`, `is_active`, `is_staff`, `created_at`, `updated_at`.
  - Roles RBAC soportados:
    - `STUDENT`: Estudiante matriculado.
    - `TUTOR`: Tutor o Asesor principal de tesis.
    - `COMMITTEE_MEMBER`: Coasesor o Vocal/Secretario del Comité Tutorial.
    - `PROGRAM_COORDINATOR`: Coordinador del Programa de Posgrado.
    - `ACADEMIC_ADMIN`: Administrador escolar y de expedientes.
    - `SYSTEM_ADMIN`: Administrador general del sistema / Superusuario.

### 3.2. Estudiantes, Semestres y Comités (`students`)
- **`Student`**: Ficha longitudinal del estudiante.
  - Campos: `user` (1:1 opcional con `CustomUser`), `matricula` (única), `nombre_completo`, `programa_doctoral`, `fecha_ingreso`, `cohorte`, `estatus_activo`.
- **`Semester`**: Registro de semestres cursados (1 a 6).
  - Campos: `student` (FK), `numero` (1..6), `fecha_inicio`, `fecha_fin`, `is_active`.
  - Restricción: Unicidad `(student, numero)` y validación `fecha_fin >= fecha_inicio`.
- **`AcademicCommittee`**: Asignación de comité tutorial por estudiante.
  - Campos: `student` (FK), `user` (FK a docente), `rol_comite` (`ASESOR_PRINCIPAL`, `COASESOR`, `VOCAL`, `SECRETARIO`), `fecha_asignacion`, `is_active`.
  - Restricción: Unicidad `(student, user, rol_comite)`.

### 3.3. Auditoría Administrativa (`audit`)
- **`AdminAuditLog`**: Bitácora inmutable de eventos sensibles de administración.
  - Campos: `action` (`ROLE_ASSIGNED`, `INSTITUTIONAL_USER_CREATED`, `COMMITTEE_ASSIGNED`, `COMMITTEE_STATUS_CHANGED`), `actor` (FK), `target_user` (FK), `committee_assignment` (FK), `details` (JSON), `created_at`.

### 3.4. Tutorías, Acuerdos, Tesis y Evidencias (Sprint 2 en adelante)
- **`TutoringSession`**, **`TutoringParticipant`**, **`TutoringObservation`**: Sesiones presenciales, virtuales o híbridas y seguimiento.
- **`Agreement`**, **`AgreementAuditLog`**: Acuerdos con fecha límite, responsable y máquina de estados (`PENDIENTE`, `EN_PROCESO`, `CONCLUIDO`, `VENCIDO`).
- **`ThesisProgress`**: Porcentaje de avance (0-100%) y desglose curricular.
- **`Evidence`**: Archivos y DOIs anexos al expediente.
- **`Publication`**, **`AcademicEvent`**, **`ResearchStay`**, **`OtherProduct`**: Producción académica asociada.

---

## 4. Seguridad, Autenticación y Matriz RBAC

El sistema protege los recursos mediante autenticación por tokens y permisos declarativos DRF (`permissions.py`):

| Permiso | Roles con Acceso | Acción Permitida |
|---|---|---|
| `CanAssignRoles` | `SYSTEM_ADMIN` | Consultar y actualizar roles de usuarios institucionales |
| `CanCreateInstitutionalUsers` | `SYSTEM_ADMIN` | Crear cuentas de usuario institucionales con rol asignado |
| `CanManageCommittee` | `SYSTEM_ADMIN`, `PROGRAM_COORDINATOR`, `ACADEMIC_ADMIN` | Asignar y modificar miembros del comité académico |
| `CanCreateStudents` | `SYSTEM_ADMIN`, `PROGRAM_COORDINATOR` | Dar de alta nuevos estudiantes y crear su expediente |
| `CanManageSemesters` | `SYSTEM_ADMIN`, `PROGRAM_COORDINATOR`, `ACADEMIC_ADMIN` | Registrar y gestionar periodos semestrales (1 al 6) |
| `CanReadGlobalAcademics` | `SYSTEM_ADMIN`, `PROGRAM_COORDINATOR`, `ACADEMIC_ADMIN` | Ver padrón completo de estudiantes |
| `CanReadStudentRecord` | Coordinador, Admin, Asesor asignado, Propio Estudiante | Consultar resumen y detalle del expediente longitudinal |

---

## 5. Contrato de Endpoints API (Sprint 1)

Los endpoints responden en JSON con códigos HTTP semánticos (200, 201, 400, 401, 403, 404):

### 5.1. Autenticación (`/api/auth/`)
- `POST /api/auth/login/`: Inicio de sesión (retorna token, datos del usuario y rol).
- `POST /api/auth/logout/`: Cierre de sesión.
- `GET /api/auth/me/`: Datos del usuario autenticado en sesión.
- `GET /api/auth/users/`: Listado de usuarios para gestión de roles y asignación de comités.
- `PATCH /api/auth/users/{user_id}/role/`: Actualización de rol institucional.

### 5.2. Administración y Comités (`/api/admin/`)
- `POST /api/admin/users/`: Creación de cuenta institucional.
- `GET /api/admin/audit/`: Consulta de bitácora de auditoría.
- `GET /api/admin/committee/`: Listado de asignaciones de comité académico.
- `POST /api/admin/committee/`: Asignar asesor, coasesor o miembro al comité de un estudiante.
- `PATCH /api/admin/committee/{id}/`: Actualizar estado o rol de asignación de comité.
- `GET /api/admin/students/`: Listado de estudiantes disponibles para comités.

### 5.3. Coordinación y Estudiantes (`/api/coordinator/` y `/api/students/`)
- `POST /api/coordinator/students/`: Alta de estudiante (HU-03).
- `GET /api/v1/students/`: Padrón y listado con filtrado estricto por relación RBAC (HU-04).
  - Coordinadores y administradores ven el padrón completo.
  - Tutores y miembros del comité ven **únicamente** los estudiantes donde son parte activa del comité tutorial (`committee_relationships__user=user`).
  - Estudiantes ven únicamente su propio registro.
- `GET /api/students/{id}/semesters/`: Consulta de semestres 1 a 6 de un estudiante (HU-05).
- `POST /api/students/{id}/semesters/`: Registro y activación de semestre (HU-05).
- `GET /api/records/{student_id}/` o `GET /api/students/{student_id}/academic-summary/`: Expediente resumido de estudiante con visión 70/30 (HU-06).
  - Acceso permitido: Coordinador, Asesor o Miembro asignado, o el propio estudiante.
  - **Seguridad RBAC:** El rol `SYSTEM_ADMIN` tiene el acceso estrictamente bloqueado con código `403 Forbidden`.

---

## 6. Comando de Poblado de Datos Representativos

Para poblar la base de datos simulando 2 semanas de actividad real de la plataforma:
```bash
cd Backend/nexus
python manage.py populate_data
# o directamente:
python populate_data.py
```
*Genera usuarios de todos los roles institucionales con contraseña por defecto `Admin1234!`, estudiantes, semestres reglamentarios 1 a 6, asignaciones tutoriales, sesiones de tutoría, acuerdos en los 4 estados semafóricos, avances de tesis y producción científica.*

---

## 7. Pruebas Automatizadas y Verificación

Para ejecutar la suite de pruebas del módulo de estudiantes y relaciones RBAC:
```bash
cd Backend/nexus
python manage.py test apps.students
```

Para ejecutar la suite completa de pruebas del backend (37 pruebas):
```bash
cd Backend/nexus
python manage.py test
```
