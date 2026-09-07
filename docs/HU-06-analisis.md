# HU-06 - Consultar expediente: resumen del estudiante

## Historia de usuario

Como usuario autorizado, quiero consultar el expediente resumido de un estudiante para conocer rápidamente su situación académica actual.

## Objetivo

Ofrecer una vista de consulta rápida, de solo lectura, con la información académica más relevante del estudiante sin obligar al usuario a navegar por cada módulo del expediente.

## Información que debe mostrar

- Semestre actual.
- Asesor y coasesor.
- Última tutoría.
- Acuerdos abiertos.
- Avance de tesis.
- Actividad académica reciente.

## Alcance funcional

### Incluido

- Buscar o seleccionar un estudiante autorizado.
- Consultar el resumen consolidado del expediente.
- Mostrar estados de carga, ausencia de datos y error.
- Indicar claramente cuándo no existen acuerdos, tutorías o actividad reciente.
- Restringir la información según la autorización del usuario.

### Fuera de alcance

- Editar datos del expediente desde esta vista.
- Crear tutorías, acuerdos o actividades.
- Reemplazar los módulos especializados de seguimiento académico.
- Mostrar información sensible que no sea necesaria para el resumen.

## Actores y permisos

El backend debe validar la identidad y el rol en cada solicitud; ocultar controles en Angular no constituye una medida de seguridad. Como mínimo, el permiso debe permitir consultar estudiantes que el usuario tenga asignados o cuyo expediente pueda supervisar según su rol.

La matriz exacta de roles debe confirmarse con las historias HU-01 y HU-02. La API debe responder `401` cuando no haya autenticación y `403` cuando exista autenticación, pero no autorización.

## Propuesta de contrato API

`GET /api/students/{student_id}/academic-summary/`

Respuesta `200`:

```json
{
  "student": {
    "id": 42,
    "full_name": "Nombre del estudiante",
    "identification": "0000000000"
  },
  "current_semester": {
    "id": 3,
    "name": "2026-1",
    "status": "active"
  },
  "advisors": {
    "advisor": { "id": 7, "full_name": "Asesor" },
    "coadvisor": { "id": 8, "full_name": "Coasesor" }
  },
  "last_tutoring": {
    "date": "2026-09-01",
    "topic": "Revisión de avance",
    "status": "completed"
  },
  "open_agreements": [
    {
      "id": 10,
      "description": "Entregar capítulo 2",
      "due_date": "2026-09-15",
      "status": "open"
    }
  ],
  "thesis_progress": {
    "percentage": 65,
    "stage": "Marco teórico",
    "updated_at": "2026-09-02"
  },
  "recent_academic_activity": [
    {
      "date": "2026-09-03",
      "type": "course",
      "description": "Actividad registrada",
      "status": "completed"
    }
  ]
}
```

Los nombres definitivos deben alinearse con los modelos existentes cuando el backend sea implementado. Los campos opcionales, como coasesor o última tutoría, deben aceptar `null` sin romper la vista.

## Reglas de negocio

1. El semestre actual debe corresponder al periodo activo asociado al estudiante.
2. La última tutoría es la tutoría registrada más reciente; si no existe, se muestra estado vacío.
3. Los acuerdos abiertos excluyen los acuerdos completados o cancelados.
4. El porcentaje de tesis debe estar entre `0` y `100`.
5. La actividad académica reciente debe tener un límite definido, recomendado: las últimas 5 actividades ordenadas de la más reciente a la más antigua.
6. La información debe ser consistente en una sola respuesta para evitar que el resumen combine lecturas de distintos momentos.
7. La consulta no debe modificar el expediente ni registrar cambios secundarios.

## Criterios de aceptación

- Un usuario autorizado puede abrir el resumen de un estudiante y visualizar las seis categorías solicitadas.
- Un usuario no autenticado recibe una respuesta de autenticación requerida.
- Un usuario autenticado sin permiso no puede consultar el resumen de otro estudiante.
- Cuando una categoría no tenga datos, la interfaz muestra un estado vacío comprensible y conserva las demás categorías.
- El avance de tesis se muestra como porcentaje y no permite valores fuera de `0` a `100`.
- Las actividades y acuerdos aparecen ordenados y con sus fechas/estados visibles.
- Los estados de carga y error son distinguibles y permiten reintentar la consulta cuando corresponda.
- La vista funciona en resoluciones de escritorio y móvil sin ocultar información esencial.

## Riesgos y decisiones pendientes

- `Backend/` está vacío actualmente; se debe confirmar si Django y Django REST Framework se crearán en esta rama o en una rama de infraestructura.
- Deben definirse los modelos fuente y sus relaciones antes de implementar el serializer para evitar duplicar datos.
- Debe confirmarse la matriz de roles y el mecanismo de autenticación de HU-01/HU-02.
- Debe decidirse si la selección del estudiante será por URL, buscador o navegación desde un listado existente.
- Si el expediente se compone de muchas relaciones, deben verificarse consultas SQL y paginación/límites para evitar problemas de rendimiento.
- Debe acordarse el formato de fechas y zona horaria mostrado al usuario.

## Dependencias

- Autenticación y autorización.
- Modelos de estudiante, semestre, tutoría, comité/asesores, acuerdos y tesis.
- Servicio HTTP de Angular y configuración de la URL base de API.
- Datos de prueba representativos, incluidos estudiantes sin información opcional.