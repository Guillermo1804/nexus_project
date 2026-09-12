# HU-05 - Gestionar semestres 1 a 6

## 1. Historia de usuario

**Como** coordinador o administrador académico,  
**quiero** registrar y consultar los periodos semestrales (1 a 6) de un estudiante de doctorado,  
**para** delimitar temporalmente su trayectoria académica, tutorías y seguimiento longitudinal.

## 2. Objetivo

Permitir la administración y consulta de los semestres de un doctorando dentro del rango reglamentario (semestres 1 a 6), asegurando la consistencia de fechas (inicio y fin) y permitiendo identificar el semestre activo para asociar actividades y evaluaciones.

## 3. Criterios de aceptación

### CA-05.1 — Rango semestral válido
- El sistema permite registrar únicamente semestres numerados del **1 al 6**.
- Se rechaza cualquier valor fuera de este rango con un código HTTP `400 Bad Request`.
- No se permiten semestres duplicados con el mismo número para un mismo estudiante.

### CA-05.2 — Consistencia de fechas
- La fecha de fin (`fecha_fin`) debe ser igual o posterior a la fecha de inicio (`fecha_inicio`).
- Si la fecha de fin es anterior a la fecha de inicio, el sistema rechaza la solicitud indicando el error de validación correspondiente.

### CA-05.3 — Semestre activo y consulta
- Se puede consultar la lista completa de semestres registrados para un estudiante (`GET /api/students/{id}/semesters/`).
- Se puede marcar un semestre como activo (`is_active: true`), sirviendo como referencia para la visualización del expediente y cálculo de avances.

### CA-05.4 — Control de acceso (RBAC)
- La creación y actualización de semestres requiere roles autorizados (`PROGRAM_COORDINATOR`, `ACADEMIC_ADMIN`, `SYSTEM_ADMIN`).
- Estudiantes asignados y comités autorizados pueden consultar en modo solo lectura.

## 4. Contrato de API

### Consulta de semestres
`GET /api/students/{student_id}/semesters/`

**Respuesta exitosa (`200 OK`):**
```json
[
  {
    "id": 1,
    "student": 14,
    "numero": 1,
    "fecha_inicio": "2024-01-15",
    "fecha_fin": "2024-06-30",
    "is_active": false
  },
  {
    "id": 2,
    "student": 14,
    "numero": 2,
    "fecha_inicio": "2024-08-15",
    "fecha_fin": "2024-12-20",
    "is_active": true
  }
]
```

### Registro de semestre
`POST /api/students/{student_id}/semesters/`

**Payload:**
```json
{
  "numero": 3,
  "fecha_inicio": "2025-01-15",
  "fecha_fin": "2025-06-30",
  "is_active": false
}
```

**Respuesta exitosa (`201 Created`):**
```json
{
  "id": 3,
  "student": 14,
  "numero": 3,
  "fecha_inicio": "2025-01-15",
  "fecha_fin": "2025-06-30",
  "is_active": false
}
```
