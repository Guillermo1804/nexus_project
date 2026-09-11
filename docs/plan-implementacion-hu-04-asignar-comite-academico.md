# Plan de implementación de la historia de usuario HU-04

## 1. Objetivo técnico

Implementar el flujo para que un coordinador consulte un expediente, asigne asesor, coasesor y miembros elegibles del comité académico, y consulte posteriormente los participantes autorizados. La solución se dividirá entre un frontend Angular 20 standalone y un backend Django con una API HTTP autenticada.

## 2. Dependencias y prerrequisitos

- Confirmar las reglas pendientes del [análisis de HU-04](analisis-hu-04-asignar-comite-academico.md), especialmente roles y cardinalidades.
- Identificar las entidades ya existentes de usuarios, estudiantes/expedientes y autenticación.
- Confirmar el mecanismo de autenticación y autorización que consumirá Angular.
- Definir la URL base de la API por ambiente.
- Si `Backend/` continúa vacío, crear el proyecto Django, su entorno de dependencias y la configuración de base de datos antes de desarrollar el módulo.

## 3. Diseño de API propuesto

### 3.1 Consulta de expediente y asignación

`GET /api/expedientes/{expediente_id}/comite/`

Devuelve la asignación vigente, si existe, junto con asesor, coasesor y miembros. Puede incluir el expediente mínimo necesario para identificarlo.

### 3.2 Consulta de candidatos

`GET /api/comites/candidatos/?rol=ASESOR|COASESOR|MIEMBRO&expediente={id}`

Devuelve usuarios activos y elegibles para el tipo de participación indicado. La elegibilidad debe volver a comprobarse al guardar.

### 3.3 Crear o reemplazar la asignación

`PUT /api/expedientes/{expediente_id}/comite/`

Payload propuesto:

```json
{
  "asesor_id": 12,
  "coasesor_id": 18,
  "miembro_ids": [25, 31]
}
```

Respuesta `200 OK` con la asignación guardada. Usar `400` para datos inválidos, `401` para falta de autenticación, `403` para falta de permiso, `404` para expediente inexistente y `409` para conflicto de concurrencia si se implementa control de versión.

### 3.4 Participantes autorizados

`GET /api/expedientes/{expediente_id}/participantes-autorizados/`

Devuelve una lista normalizada para que tutorías pueda limitar sus participantes:

```json
[
  { "usuario_id": 12, "nombre": "...", "rol_comite": "ASESOR", "activo": true }
]
```

## 4. Plan de backend con Django

### Fase B1 — Estructura y dominio

1. Confirmar o crear una app Django de expedientes/comités.
2. Reutilizar el modelo de usuario y el modelo existente de estudiante/expediente.
3. Crear los modelos `AsignacionComite` y `ParticipanteComite`, o adaptar nombres equivalentes ya presentes.
4. Usar un campo de tipo de participación con elecciones cerradas y restricciones de unicidad para evitar duplicados.
5. Agregar migraciones y restricciones de base de datos para la relación con el expediente.

### Fase B2 — Reglas y permisos

1. Implementar validadores de expediente vigente, usuario activo y rol compatible.
2. Rechazar duplicados entre asesor, coasesor y miembros.
3. Aplicar permiso de coordinador en las vistas o clases de permisos de DRF.
4. Limitar la respuesta a datos personales mínimos.
5. Ejecutar la escritura dentro de una transacción atómica; si falla una relación, no debe persistirse una asignación parcial.
6. Si se requiere concurrencia, añadir control mediante versión, `select_for_update` o la estrategia que use el proyecto.

### Fase B3 — API

1. Crear serializers para lectura, candidatos y escritura.
2. Implementar endpoints con el estilo del proyecto; si se usa Django REST Framework, preferir `APIView`, `GenericAPIView` o `ViewSet` según la convención existente.
3. Filtrar candidatos por rol y estado en la consulta.
4. Devolver errores de validación con campos identificables para que Angular pueda mostrarlos.
5. Añadir documentación de endpoints mediante el mecanismo adoptado por el proyecto.

### Fase B4 — Pruebas backend

- Usuario sin permiso no puede leer ni modificar el comité.
- Usuario con rol incompatible es rechazado.
- No se aceptan expediente, usuario o miembro inexistentes.
- No se aceptan duplicados.
- La operación es atómica ante un error.
- La consulta devuelve la asignación persistida y los participantes autorizados.
- Una actualización reemplaza correctamente la composición previa sin dejar relaciones huérfanas.

## 5. Plan de frontend con Angular

### Fase F1 — Modelos y acceso a datos

1. Crear interfaces TypeScript para expediente, candidato, participante y payload de asignación.
2. Crear un servicio `ComiteService` con métodos para consultar asignación, candidatos, guardar y obtener participantes autorizados.
3. Centralizar la URL base y reutilizar el interceptor de autenticación existente.
4. Tipar respuestas y errores para evitar lógica basada en objetos sin forma conocida.

### Fase F2 — Componente de asignación

1. Crear una ruta protegida para la pantalla de asignación de comité.
2. Implementar un componente standalone con `ReactiveFormsModule`.
3. Usar un control para asesor, otro para coasesor y un control múltiple para miembros.
4. Cargar el expediente y la asignación existente al entrar en la ruta.
5. Cargar candidatos por rol y excluir en la interfaz las selecciones incompatibles o repetidas.
6. Mostrar estado de carga, vacío, guardado exitoso y error de API.
7. Deshabilitar el envío mientras se guarda y mostrar confirmación de la operación.
8. Conservar los errores de backend junto al campo o regla que corresponda.

### Fase F3 — Integración con participantes autorizados

1. Exponer en el servicio la consulta de participantes autorizados.
2. Dejar el contrato listo para que el módulo de tutorías lo consuma.
3. No duplicar en frontend la fuente de verdad del permiso: la API de tutorías debe validar también la autorización.

### Fase F4 — Pruebas frontend

- Renderiza correctamente la asignación existente.
- Solicita candidatos con los filtros esperados.
- Valida campos obligatorios y evita duplicados antes de enviar.
- Envía el payload correcto.
- Presenta errores `400`, `403` y `404` de forma comprensible.
- Deshabilita el botón durante el guardado y actualiza la vista tras una respuesta exitosa.
- Permite consultar los participantes autorizados.

## 6. Orden recomendado de entrega

1. Confirmar decisiones funcionales pendientes.
2. Identificar entidades, autenticación y convenciones actuales.
3. Implementar modelos y migraciones Django.
4. Implementar validadores, permisos y pruebas backend.
5. Publicar y probar los endpoints.
6. Implementar interfaces y `ComiteService` en Angular.
7. Implementar la pantalla y sus estados.
8. Añadir pruebas Angular y ejecutar build/pruebas de ambos proyectos.
9. Realizar una prueba integrada del flujo completo.
10. Revisar accesibilidad, mensajes de error, permisos y datos expuestos antes de solicitar revisión.

## 7. Definition of Done propuesta

- Los criterios CA-04.1, CA-04.2 y CA-04.3 están cubiertos por pruebas automatizadas o de integración.
- Las reglas confirmadas por negocio están validadas en backend.
- La asignación se guarda de manera atómica y queda asociada al expediente.
- La interfaz permite crear y editar la asignación con estados de carga y error.
- Los endpoints están protegidos y documentados.
- Las migraciones se ejecutan correctamente en una base limpia.
- El backend pasa su suite de pruebas y Angular pasa `npm test` y `npm run build`.
- No se exponen datos personales innecesarios.
- La documentación de decisiones finales queda actualizada antes de mezclar la rama.

## 8. Validación posterior a la implementación

Desde la raíz del frontend:

```powershell
npm test
npm run build
```

Desde el backend, usando el entorno configurado para Django:

```powershell
python manage.py test
```

Los comandos concretos pueden ajustarse a los scripts y entorno que se incorporen en `Backend/`.
