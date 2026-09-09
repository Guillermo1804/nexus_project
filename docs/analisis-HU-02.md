# Análisis de historia de usuario: HU-02 Controlar acceso por rol

## 1. Historia

**Como** administrador,
**quiero** asignar roles y permisos,
**para** garantizar que cada usuario solo acceda a la información autorizada.

## 2. Lectura funcional

La historia combina dos responsabilidades:

1. **Administración:** definir o asignar el rol que determina las capacidades del usuario.
2. **Autorización:** evaluar ese rol y sus permisos en cada operación y recurso solicitado.

El rol por sí solo no basta para resolver el alcance de los datos. En particular, la autorización debe considerar asociaciones de negocio como estudiante-asesor y, cuando corresponda, el alcance global del coordinador.

## 3. Actores y permisos iniciales

| Actor | Puede hacer | Restricción principal |
|---|---|---|
| Estudiante | Consultar expedientes | Solo expedientes para los que tenga autorización |
| Asesor | Registrar tutorías | Solo para estudiantes asociados al asesor |
| Coordinador | Consultar información global académica | No obtiene permisos de edición automáticamente |
| Administrador | Asignar roles y permisos | Debe ser una operación protegida y auditable |

La tabla es una propuesta inicial. Los nombres finales de roles y permisos deben mantenerse constantes entre Django, el contrato HTTP y Angular.

## 4. Reglas derivadas de los criterios

### CA-02.1
Un estudiante puede consultar un expediente únicamente cuando la relación de autorización existe. No se debe aceptar un identificador de expediente como prueba suficiente de acceso.

### CA-02.2
Un asesor puede registrar una tutoría únicamente si el estudiante pertenece a su ámbito. La validación debe realizarse durante la operación de escritura y dentro de una transacción cuando se creen registros relacionados.

### CA-02.3
Un coordinador puede consultar información global académica. Este permiso es de lectura y debe separarse de permisos de edición, eliminación o administración.

## 5. Decisiones técnicas recomendadas

- Django debe concentrar la decisión final de autorización con autenticación, grupos/permisos y validación del ámbito del recurso.
- Angular debe usar guards para navegación y una directiva o servicio para controlar acciones visibles.
- La API debe devolver un perfil mínimo con usuario, roles y permisos efectivos; no debe exponer datos sensibles innecesarios.
- Los errores deben distinguir autenticación (`401`) de autorización (`403`) sin revelar información del recurso protegido.
- Los permisos deben ser declarativos en rutas Angular, por ejemplo mediante `route.data.requiredPermission`, para evitar reglas duplicadas en cada componente.

## 6. Contrato mínimo sugerido

### Perfil de sesión

`GET /api/auth/me`

```json
{
  "id": 1,
  "username": "usuario",
  "roles": ["asesor"],
  "permissions": ["tutoring.create"]
}
```

### Convención de respuestas

- `200`: consulta o registro autorizado completado.
- `401`: no hay una sesión válida.
- `403`: la sesión es válida, pero el rol, permiso o ámbito del recurso no permite la operación.
- `422`: la operación es autorizada, pero los datos de entrada no cumplen reglas de validación.

Los nombres definitivos del endpoint y del payload deben confirmarse antes de implementar ambos clientes.

## 7. Supuestos

- Django será el backend oficial y Angular el cliente web oficial.
- Existirá un mecanismo de autenticación previo o se implementará como dependencia directa de esta historia.
- Un usuario puede tener uno o varios roles, pero la unión de permisos no debe superar las restricciones del recurso.
- La asignación de roles será persistente y no se aceptará desde el navegador como un dato confiable.
- La información académica global del coordinador seguirá siendo de solo lectura para esta historia.

## 8. Preguntas abiertas

1. ¿La autenticación usará sesión/cookies de Django o JWT/token?
2. ¿Un usuario puede tener múltiples roles simultáneos?
3. ¿Quién puede asignar roles: solo el administrador o también otro rol institucional?
4. ¿Qué relación de datos define que un estudiante está autorizado para un expediente?
5. ¿Qué relación define que un estudiante está asociado a un asesor?
6. ¿La asignación y modificación de roles necesita auditoría histórica?
7. ¿Cuáles son los endpoints de expedientes, tutorías e información global que deben quedar protegidos en esta entrega?

## 9. Riesgos y mitigaciones

- **Permisos solo en Angular:** un usuario podría llamar la API directamente. **Mitigación:** validar siempre en Django y probar solicitudes directas.
- **Rol sin alcance de datos:** el usuario tendría un permiso general, pero podría consultar recursos ajenos. **Mitigación:** combinar permiso con comprobación de ownership/asociación.
- **Desacuerdo entre frontend y backend:** la interfaz mostraría acciones incorrectas. **Mitigación:** contrato único de permisos y pruebas de integración.
- **Sesión vencida durante una operación:** la aplicación quedaría en un estado inconsistente. **Mitigación:** interceptor centralizado, limpieza de sesión y redirección controlada.
- **Exceso de privilegios del coordinador:** una consulta global podría habilitar cambios por error. **Mitigación:** separar permisos de lectura y escritura y cubrirlos en pruebas.

## 10. Resultado esperado del análisis

HU-02 debe implementarse como autorización de servidor basada en roles, permisos y alcance del recurso, acompañada por controles de navegación y visibilidad en Angular. Antes de cerrar el desarrollo deben resolverse las preguntas de autenticación y de relaciones de dominio, porque determinan el contrato técnico y la forma exacta de probar los criterios de aceptación.
