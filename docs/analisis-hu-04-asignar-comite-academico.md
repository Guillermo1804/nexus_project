# Análisis de la historia de usuario HU-04

## 1. Identificación

- **Historia:** HU-04 — Asignar comité académico
- **Actor principal:** Coordinador
- **Propósito:** Asociar un asesor, un coasesor y miembros del comité académico a un estudiante para determinar quién participará en su seguimiento.
- **Estado del análisis:** Propuesta previa a la implementación.

## 2. Enunciado y alcance

> Como coordinador, quiero asociar asesor, coasesor y miembros del comité a un estudiante, para determinar quién participa en su seguimiento.

El alcance contempla:

- Consultar un expediente/estudiante al que se asignará el comité.
- Seleccionar usuarios que tengan roles compatibles.
- Asignar un asesor, un coasesor y los miembros adicionales del comité.
- Validar la asignación antes de guardarla.
- Persistir las asociaciones vinculadas al expediente.
- Consultar y modificar la asignación mientras el expediente lo permita.

Queda fuera de esta historia la gestión de usuarios, la definición de roles institucionales, el seguimiento académico posterior y la selección de participantes en tutorías (estos pueden consumir la asignación guardada).

## 3. Reglas de negocio derivadas

1. Solo usuarios con roles compatibles pueden aparecer como opciones de selección (CA-04.1).
2. Una asignación debe quedar vinculada al expediente del estudiante y no ser una relación independiente (CA-04.2).
3. El coordinador debe poder elegir posteriormente a los participantes autorizados en las tutorías (CA-04.3); la asignación debe exponer una fuente consultable de participantes autorizados.
4. El asesor es obligatorio y debe ser un usuario elegible.
5. El coasesor es obligatorio según el enunciado; no puede ser la misma persona que el asesor.
6. Debe existir al menos un miembro adicional del comité. El asesor y el coasesor no deben duplicarse como miembros adicionales.
7. Un mismo expediente debe tener como máximo una asignación vigente. Una edición reemplaza la composición vigente de forma atómica.
8. No se debe permitir modificar una asignación desde una cuenta sin permiso de coordinación ni asociarla a un expediente inexistente.
9. La disponibilidad, estado activo y pertenencia institucional de los usuarios deben validarse nuevamente en backend; ocultarlos en frontend no es una medida de seguridad.

> Las reglas 4 a 7 son supuestos de análisis y deben confirmarse con el responsable funcional antes de implementar. Si la institución permite coasesor o comité vacío, deben ajustarse las validaciones y pruebas.

## 4. Criterios de aceptación normalizados

### CA-04.1 — Usuarios elegibles

- Al abrir el formulario, el sistema muestra únicamente usuarios activos con roles permitidos para cada posición.
- El backend rechaza una selección con rol incompatible, aunque el cliente manipule la petición.
- Las opciones no elegibles no pueden guardarse mediante una llamada directa a la API.

### CA-04.2 — Asociación al expediente

- Al guardar, cada relación queda vinculada al expediente seleccionado.
- Al consultar el expediente, se devuelve su asignación vigente y los datos mínimos de cada participante.
- No se crean relaciones huérfanas ni se asigna un usuario a otro expediente por error.
- La creación o actualización completa falla como una sola operación si alguna validación no se cumple.

### CA-04.3 — Participación posterior en tutorías

- La API permite consultar los participantes autorizados para un expediente.
- La respuesta identifica al menos el usuario, su rol dentro del comité y su estado.
- El módulo de tutorías podrá consumir esa consulta para limitar sus selecciones; la integración de tutorías no forma parte de esta entrega.

## 5. Modelo conceptual propuesto

- **Expediente/Estudiante:** entidad existente que recibe la asignación.
- **Usuario:** entidad autenticada del sistema.
- **Asignación de comité:** entidad vigente asociada uno a uno con el expediente.
- **Participante de comité:** relación entre asignación y usuario, con un tipo de participación: `ASESOR`, `COASESOR` o `MIEMBRO`.

Restricciones recomendadas:

- Un expediente no debe tener dos asignaciones vigentes.
- Un usuario no debe repetirse dentro de la misma asignación.
- El tipo de participación debe ser un conjunto cerrado.
- Las claves foráneas deben impedir relaciones con expedientes o usuarios inexistentes.

## 6. Riesgos y decisiones pendientes

- **Nombres reales de entidades:** confirmar si el proyecto denomina la entidad `Expediente`, `Estudiante` o usa otra representación.
- **Roles autorizados:** definir el catálogo exacto para asesor, coasesor y miembro.
- **Cardinalidad:** confirmar si coasesor y miembro adicional son obligatorios y cuántos miembros máximos se permiten.
- **Ciclo de vida:** definir si una asignación puede editarse cuando el expediente está cerrado, aprobado o en tutoría.
- **Auditoría:** decidir si se requiere historial de cambios y quién realizó cada modificación.
- **Concurrencia:** definir el comportamiento si dos coordinadores editan el mismo expediente simultáneamente.
- **Privacidad:** limitar los campos personales devueltos al frontend a los estrictamente necesarios.

## 7. Resultado esperado

El coordinador podrá abrir un expediente, seleccionar participantes válidos por rol, guardar una única asignación consistente y consultar los participantes autorizados para usos posteriores. La autorización y la integridad de los datos serán responsabilidad del backend; Angular se encargará de la experiencia de formulario, validación inmediata y presentación de errores.
