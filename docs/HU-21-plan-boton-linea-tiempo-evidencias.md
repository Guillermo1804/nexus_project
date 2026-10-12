# HU-21 — Plan: acceso a la línea de tiempo filtrada por evidencias

## Objetivo

Agregar, debajo del botón **Subir evidencia**, un botón azul que lleve al usuario a la **Línea de Tiempo** del mismo expediente con el filtro **Evidencias** aplicado desde el inicio.

## Situación actual

- El botón **Subir evidencia** está en `student-overview.html` y abre el modal de carga mediante `openModal('evidencia')`.
- El expediente ya alterna entre las vistas **Resumen** y **Línea de Tiempo** mediante `selectView`.
- `TimelineComponent` ya soporta el tipo de filtro `EVIDENCIA`, pero sus filtros se inicializan vacíos y actualmente solo se activan con clic.
- La navegación del proyecto ya utiliza `queryParams` para comunicar acciones al expediente, por lo que se puede conservar el contexto del estudiante sin crear una ruta nueva.

## Plan de implementación

1. Añadir debajo de **Subir evidencia** un botón con estilo primario/azul y texto accesible, manteniendo el ancho y el espaciado del bloque lateral.
2. Definir una acción en `StudentOverviewComponent` para cambiar a la vista de línea de tiempo y solicitar el filtro inicial `EVIDENCIA`.
3. Extender `TimelineComponent` con una entrada opcional para recibir el filtro inicial y establecerlo al renderizarse, conservando el comportamiento existente de filtros acumulables y del botón **Todos**.
4. Conectar el nuevo botón con esa acción desde `student-overview.html`, pasando el filtro de evidencias al componente de línea de tiempo.
5. Añadir o actualizar pruebas para verificar que:
   - el botón aparece debajo de **Subir evidencia**;
   - al activarlo se muestra la línea de tiempo;
   - solo se muestran eventos de tipo `EVIDENCIA` y el botón correspondiente queda activo;
   - el usuario todavía puede limpiar el filtro y volver a ver todos los eventos.
6. Ejecutar las pruebas de `StudentOverviewComponent` y `TimelineComponent`, además de una compilación del frontend.

## Criterios de aceptación

- El botón azul aparece inmediatamente debajo de **Subir evidencia**.
- Al pulsarlo, el usuario permanece en el expediente actual y cambia a **Línea de Tiempo**.
- La línea de tiempo inicia filtrada únicamente por evidencias.
- El filtro se puede limpiar desde los controles existentes.
- No se modifica la carga ni el contrato de la API de trayectoria.

## Archivos previstos

- `FrontEnd/nexus_project/src/app/expediente/student-overview.html`
- `FrontEnd/nexus_project/src/app/expediente/student-overview.ts`
- `FrontEnd/nexus_project/src/app/expediente/student-overview.scss`
- `FrontEnd/nexus_project/src/app/shared/timeline.ts`
- Pruebas asociadas de expediente y línea de tiempo.