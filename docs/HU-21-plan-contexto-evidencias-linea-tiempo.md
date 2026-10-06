# HU-21 — Plan: mostrar el vínculo de las evidencias en la línea de tiempo

## Objetivo

Permitir que cada evento de tipo **Evidencia** muestre claramente a qué actividad está ligado: una tutoría, un acuerdo, un avance de tesis u otra actividad. También se debe mostrar la fecha de la actividad relacionada cuando exista, sin confundirla con la fecha de carga de la evidencia.

## Regla adicional para el modal de carga

El campo **Semestre** del modal **Carga de Evidencias** debe estar limitado exclusivamente al semestre académico en curso. No se deben ofrecer semestres anteriores en el selector ni permitir registrar una evidencia asociada a ellos.

La restricción debe aplicarse en ambos niveles:

- **Frontend:** mostrar el semestre vigente en un campo bloqueado, sin permitir que el usuario abra un selector o elija otro semestre. El valor debe permanecer asociado internamente al identificador del semestre activo para incluirlo en la carga.
- **Backend:** validar nuevamente que el semestre recibido sea el vigente antes de crear o actualizar la evidencia, para impedir que la regla pueda omitirse mediante una petición directa.

Si no existe un semestre académico vigente configurado, la operación debe rechazarse con un error de validación claro y no crear la evidencia.

## Problema actual

El modelo `Evidence` ya almacena `actividad_tipo` y `actividad_id`, pero el servicio de trayectoria actualmente solo expone en el evento:

- título y descripción de la evidencia;
- responsable que la cargó;
- fecha de carga;
- tipo técnico de evidencia (`ARCHIVO_LOCAL` o `ENLACE_DOI`);
- enlace al archivo o URL.

Por eso la línea de tiempo no puede indicar si la evidencia corresponde a una tutoría, un acuerdo o la tesis, ni mostrar la fecha de reunión asociada.

## Plan de solución

1. **Enriquecer el evento en el backend**
   - Actualizar `TimelineService` para resolver `actividad_tipo` y `actividad_id` contra la actividad perteneciente al mismo estudiante.
   - Agregar un bloque estructurado, por ejemplo `actividad`, con:
     - `tipo`: `TUTORIA`, `ACUERDO`, `TESIS` u `OTRO`;
     - `id`: identificador de la actividad, cuando exista;
     - `etiqueta`: texto legible como “Tutoría”, “Acuerdo” o “Avance de tesis”;
     - `titulo` o resumen de la actividad;
     - `fecha`: fecha de la reunión, del acuerdo o del avance de tesis, cuando aplique.
   - Mantener `fecha` del evento como la fecha de carga de la evidencia para conservar el orden cronológico actual.
   - Para tutorías y acuerdos, usar `TutoringSession.fecha_sesion`; para tesis, `ThesisProgress.fecha_registro`; para `OTRO`, dejar la fecha de actividad vacía.
   - Resolver referencias inexistentes de forma segura, mostrando al menos el tipo guardado y sin fallar la respuesta completa de la trayectoria.

2. **Asegurar la consulta eficiente**
   - Ampliar los `select_related`/`prefetch_related` del servicio para evitar una consulta adicional por evidencia.
   - Reutilizar las sesiones, acuerdos y avances que el servicio ya carga para construir la trayectoria.

3. **Actualizar el contrato del frontend**
   - Extender `TimelineEvent` con el bloque opcional de actividad relacionada y sus tipos TypeScript.
   - Mantener compatibilidad con eventos antiguos que no incluyan ese bloque.

4. **Presentar el contexto en la tarjeta de evidencia**
   - Debajo del título o descripción, mostrar una línea identificable como `Vinculada a: Tutoría`, `Vinculada a: Acuerdo` o `Vinculada a: Tesis`.
   - Mostrar el nombre/resumen de la actividad cuando esté disponible.
   - Mostrar `Fecha de reunión`, `Fecha del acuerdo` o `Fecha del avance` según el tipo, usando un texto accesible y una fecha formateada.
   - Conservar por separado la fecha ubicada en el encabezado de la tarjeta como `Fecha de carga` para evitar ambigüedad.
   - No cambiar los enlaces actuales de **Ver evidencia** ni **Abrir enlace**.

5. **Agregar pruebas**
   - Backend: verificar que una evidencia ligada a tutoría incluya tipo, actividad y `fecha_sesion`.
   - Backend: verificar los casos de acuerdo, tesis y `OTRO`, incluyendo una referencia ausente sin error 500.
   - Frontend: verificar que el vínculo y la fecha relacionada se muestran para cada tipo.
   - Frontend: verificar que un evento sin metadatos de actividad sigue renderizando correctamente.
   - Ejecutar las pruebas de timeline y la compilación completa del frontend.

## Criterios de aceptación

- Cada evidencia vinculada muestra claramente su actividad de origen.
- Tutorías y acuerdos muestran la fecha de la reunión (`fecha_sesion`).
- Los avances de tesis muestran la fecha del avance (`fecha_registro`).
- La fecha de carga permanece visible y diferenciada de la fecha de actividad.
- Las evidencias tipo `OTRO` y los eventos antiguos no rompen la línea de tiempo.
- La solución no agrega consultas N+1 ni modifica el filtro de evidencias existente.
- El modal de carga solo permite seleccionar el semestre académico en curso.
- El campo de semestre se muestra bloqueado porque no existen alternativas válidas para el usuario.
- El backend rechaza evidencias con un semestre pasado o sin un semestre vigente configurado.

## Archivos previstos

- `Backend/nexus/nexus/services/timeline_service.py`
- `Backend/nexus/nexus/test_hu21.py` y/o pruebas del servicio de trayectoria
- `Backend/nexus/nexus/serializers.py` y/o la validación que controle la creación o actualización de evidencias
- `FrontEnd/nexus_project/src/app/core/academic/academic.models.ts`
- `FrontEnd/nexus_project/src/app/shared/timeline.ts`
- `FrontEnd/nexus_project/src/app/shared/timeline.spec.ts`