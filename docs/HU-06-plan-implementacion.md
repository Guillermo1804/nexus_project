# HU-06 - Plan de implementación

## Resultado esperado

Construir una consulta de solo lectura que entregue desde Django el resumen académico de un estudiante y lo presente en Angular con estados completos de carga, éxito, vacío y error.

## Fase 1: Preparación y contrato

1. Confirmar la matriz de permisos con las historias HU-01 y HU-02.
2. Identificar los modelos existentes y sus relaciones; si aún no existen, diseñar los modelos mínimos sin duplicar la identidad del estudiante.
3. Fijar el contrato de `GET /api/students/{student_id}/academic-summary/`, incluidos campos opcionales, errores y formato de fechas.
4. Definir datos semilla o fixtures para un caso completo y casos sin tutoría, coasesor, acuerdos y actividad.

## Fase 2: Backend Django

### Estructura sugerida

- Crear o utilizar una app Django de dominio académico.
- Definir modelos y relaciones para las fuentes del resumen, si no existen.
- Añadir serializers de respuesta específicos para el resumen; no exponer directamente todos los campos de los modelos.
- Implementar una vista DRF de solo lectura para el endpoint.
- Registrar la ruta bajo `/api/`.

### Lógica y seguridad

1. Autenticar la solicitud mediante el mecanismo acordado por HU-01.
2. Aplicar una permission class o filtro de queryset que valide el acceso del usuario al estudiante solicitado.
3. Resolver el semestre activo, la tutoría más reciente, acuerdos abiertos, avance de tesis y actividad limitada en el servidor.
4. Usar `select_related` y `prefetch_related` cuando corresponda, y medir las consultas para evitar N+1.
5. Devolver `404` para un estudiante inexistente y `403` para un estudiante existente pero no accesible, según la política de seguridad definida.
6. Mantener la respuesta estable aunque las relaciones opcionales sean nulas o estén vacías.

### Pruebas backend

- Acceso autorizado con respuesta completa.
- Solicitud sin autenticación.
- Usuario autenticado sin permiso.
- Estudiante inexistente.
- Estudiante sin datos opcionales.
- Exclusión de acuerdos completados/cancelados.
- Orden y límite de actividad reciente.
- Validación del rango del avance de tesis.
- Verificación de que la consulta no modifica datos.

## Fase 3: Frontend Angular

### Estructura sugerida

- Crear una ruta de consulta de expediente, por ejemplo `students/:studentId/academic-summary`.
- Crear un componente de página para el resumen.
- Crear un servicio `AcademicSummaryService` usando `HttpClient` y tipos TypeScript para la respuesta.
- Configurar la URL base de API mediante la estrategia de entornos existente o una configuración equivalente.
- Añadir guardas o resolvers solo como apoyo de navegación; la autorización definitiva permanece en Django.

### Presentación

1. Mostrar la identidad del estudiante y el semestre actual en la cabecera.
2. Separar las seis categorías en bloques legibles y consistentes.
3. Representar acuerdos y actividad como listas con fecha, estado y descripción.
4. Mostrar el avance de tesis con porcentaje, etapa y fecha de actualización.
5. Renderizar estados vacíos explícitos para datos inexistentes, sin usar valores engañosos.
6. Añadir indicador de carga, mensaje de error y acción de reintento.
7. Garantizar navegación por teclado, etiquetas accesibles y contraste suficiente.
8. Mantener el diseño responsive sin depender de datos de ejemplo fijos.

### Pruebas frontend

- Renderizado de una respuesta completa.
- Renderizado de valores `null` y listas vacías.
- Estado de carga mientras la solicitud está pendiente.
- Error de API y reintento.
- Respuestas `401`, `403` y `404` con comportamiento definido.
- Formateo de fechas, porcentajes y estados.
- Navegación hacia la ruta con un `studentId` válido.
- Prueba de accesibilidad básica y layout en viewport móvil.

## Fase 4: Integración

1. Ejecutar Django y Angular con una configuración de API compartida.
2. Validar CORS, autenticación y envío de credenciales o token según la solución acordada.
3. Probar el flujo completo con un usuario autorizado y uno no autorizado.
4. Comparar la respuesta contra los datos fuente para detectar inconsistencias.
5. Verificar que no se filtren campos de otros estudiantes en la respuesta.

## Orden recomendado de trabajo

1. Cerrar decisiones de modelos, permisos y contrato.
2. Implementar pruebas backend y endpoint con datos de prueba.
3. Implementar tipos, servicio y pruebas unitarias de Angular.
4. Construir la pantalla y sus estados visuales.
5. Integrar autenticación, navegación y manejo de errores.
6. Ejecutar pruebas, build de Angular y validación de consultas Django.

## Definición de terminado

- La rama contiene el endpoint documentado y la vista Angular integrada.
- Los permisos se validan en el backend y tienen pruebas.
- Los seis datos de la historia se muestran o tienen un estado vacío explícito.
- Existen pruebas para datos completos, datos incompletos y errores principales.
- Angular compila y las pruebas pasan.
- Django ejecuta sus pruebas y no presenta consultas N+1 conocidas.
- La documentación de API, decisiones y datos pendientes queda actualizada.