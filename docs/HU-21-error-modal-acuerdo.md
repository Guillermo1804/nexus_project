# HU-21 — Error de tamaño del modal al seleccionar “Acuerdo”

## Error a solucionar

En el modal **Carga de Evidencias**, al seleccionar `Acuerdo` como tipo de actividad, el selector de actividad podía crecer según la longitud de la descripción del acuerdo. El ancho mínimo automático del control, dentro del formulario en grid, terminaba desbordando el ancho definido para el modal `evidence-modal` de 512 px.

## Solución aplicada

- Se permitió que el formulario se encoja dentro del modal con `min-width: 0`.
- Se limitaron los controles del formulario al ancho disponible mediante `min-width: 0`, `max-width: 100%` y `box-sizing: border-box`.
- Se añadió `min-width: 0` al panel de evidencia para evitar que el contenido de una opción larga fuerce el ancho del modal.

Con esto, las descripciones extensas de los acuerdos permanecen contenidas en el selector y el modal conserva su tamaño responsive, incluyendo pantallas pequeñas.