# Plan de actualización en tiempo real para acuerdos

**Estado:** Propuesto; no implementado  
**Fecha:** 2026-10-29  
**Alcance:** análisis del estado actual y plan de implementación para que un alumno vea en tiempo real un acuerdo generado o actualizado por un tutor, manteniendo la aplicación compilable en cada fase.

## 1. Objetivo y resultado esperado

Cuando un tutor cree un acuerdo para un alumno, cualquier sesión del alumno que esté abierta debe reflejarlo sin recargar la página. El mismo mecanismo debe cubrir, como mínimo:

- creación de un acuerdo;
- cambio de estado de `PENDIENTE` a `EN_PROCESO` o de `EN_PROCESO` a `CONCLUIDO`;
- actualización de las vistas relacionadas (expediente, listado de acuerdos, resumen y alertas);
- reconexión después de una pérdida de red sin perder cambios;
- varios usuarios conectados al mismo expediente, respetando los permisos actuales.

El tiempo real no sustituirá a la API REST. La base de datos y los endpoints REST seguirán siendo la fuente de verdad; WebSocket únicamente distribuirá notificaciones de cambios confirmados.

## 2. Diagnóstico de la aplicación actual

### 2.1 Backend

- El backend es un proyecto Django en [`Backend/nexus/nexus`](../Backend/nexus/nexus), con Django REST Framework y SimpleJWT.
- El acceso está protegido por JWT y por permisos derivados del rol en [`permissions.py`](../Backend/nexus/nexus/permissions.py).
- El modelo [`Agreement`](../Backend/nexus/nexus/models.py) relaciona estudiante, tutoría, responsable, estado, fecha límite, creador y fechas de creación/actualización.
- La creación ocurre en `POST /api/v1/tutoring-sessions/{id}/agreements/`, dentro de `TutoringSessionViewSet.agreements`; después se registra `AgreementAuditLog`.
- El cambio de estado ocurre en `PATCH /api/v1/agreements/{id}/status/`, dentro de `AgreementViewSet.status`; sólo el responsable puede hacerlo y la transición se valida en el servidor.
- La consulta general usa `AgreementViewSet` y filtra por alumno propio, membresía del comité o permiso académico global.
- La consulta del expediente devuelve acuerdos abiertos mediante `StudentRecordView`, mientras que el frontend también usa los endpoints de acuerdos por tutoría y el listado paginado.
- El proyecto sólo expone ASGI con `get_asgi_application()` en [`asgi.py`](../Backend/nexus/nexus/asgi.py). No existe routing WebSocket, consumer, broker, canal de eventos ni publicación después de una transacción.
- [`requirements.txt`](../Backend/requirements.txt) no contiene Django Channels, Redis ni un cliente de Redis.
- [`docker-compose.yml`](../Backend/docker-compose.yml) sólo levanta Django con SQLite y Angular; no existe un servicio de Redis ni un servidor ASGI de producción.

### 2.2 Frontend

- El frontend es Angular 20 standalone; las peticiones HTTP se centralizan principalmente en [`academic.service.ts`](../FrontEnd/nexus_project/src/app/core/academic/academic.service.ts).
- La autenticación HTTP agrega `Authorization` mediante [`auth.interceptor.ts`](../FrontEnd/nexus_project/src/app/core/auth/auth.interceptor.ts). Ese interceptor no puede adjuntar automáticamente esa cabecera a una conexión WebSocket nativa.
- El token y el usuario se conservan en [`token.service.ts`](../FrontEnd/nexus_project/src/app/core/auth/token.service.ts); el servicio ya expone el access token y reacciona a expiraciones.
- [`student-overview.ts`](../FrontEnd/nexus_project/src/app/expediente/student-overview.ts) carga el expediente y sus acuerdos por HTTP.
- [`tutoring-agreements.ts`](../FrontEnd/nexus_project/src/app/expediente/tutoring-agreements.ts) crea acuerdos y actualiza estados por HTTP; después vuelve a cargar los datos y emite `changed`.
- [`agreements-list.ts`](../FrontEnd/nexus_project/src/app/agreements/agreements-list.ts) administra el listado paginado, filtros, orden, scroll y actualización de estados.
- La aplicación no tiene un servicio compartido de WebSocket ni un estado global de acuerdos. Por ello, una implementación que actualice sólo un componente produciría datos inconsistentes entre pantallas.
- [`environment.ts`](../FrontEnd/nexus_project/src/environments/environment.ts) resuelve actualmente la URL HTTP. Deberá definirse también una URL WebSocket compatible con localhost, proxy de desarrollo y túnel HTTPS.

### 2.3 Limitaciones relevantes

1. **SQLite:** permite desarrollar y demostrar el flujo, pero no es la opción adecuada para alta concurrencia de escritura. Antes de producción multiusuario se debe migrar a PostgreSQL u otro motor soportado y probar la concurrencia.
2. **`runserver`:** no debe ser el servidor final de WebSocket. El despliegue deberá usar un servidor ASGI y un proxy que soporte upgrade de WebSocket.
3. **Eventos derivados:** el estado `VENCIDO` se calcula parcialmente a partir de la fecha. No se debe emitir un evento sólo por abrir una pantalla; las vistas deben recalcular la etiqueta al recibir o refrescar datos.
4. **Varias representaciones del mismo dato:** el acuerdo aparece en expediente, listado, tutoría, inicio, monitoreo y alertas. Todas deben consumir el mismo evento y aplicar la misma estrategia de resincronización.

## 3. Decisiones propuestas

### 3.1 Canal de transporte

Adoptar **Django Channels sobre ASGI y Redis como channel layer**, con WebSocket por estudiante:

```text
Angular
  └─ WebSocket autenticado: /ws/students/{student_id}/
       └─ Django Channels consumer
            └─ grupo Redis: student.{student_id}

REST POST/PATCH
  └─ transacción DB confirmada
       └─ publicación de evento al grupo Redis
            └─ todos los clientes autorizados reciben el cambio
```

La elección evita inventar un servidor paralelo y encaja con el ASGI ya presente. Redis permite que varios procesos o réplicas del backend distribuyan el mismo evento. No se propone polling como solución principal; puede conservarse sólo como fallback de recuperación.

### 3.2 Fuente de verdad y orden de publicación

- Guardar primero el acuerdo y su auditoría dentro de una transacción.
- Publicar únicamente después del commit (`transaction.on_commit`), para no anunciar datos que finalmente hayan sido revertidos.
- Enviar el acuerdo serializado completo, no sólo un mensaje “hay cambios”; esto permite actualizar inmediatamente la fila.
- Incluir `event_id`, `event_type`, `entity`, `entity_id`, `student_id`, `version` o `updated_at`, `occurred_at` y `payload`.
- Si el evento no puede entregarse, la operación REST no debe fallar por ello. El cliente debe marcar la conexión como degradada y resincronizar por HTTP.

Ejemplo de contrato propuesto:

```json
{
  "event_id": "uuid",
  "event_type": "agreement.created",
  "entity": "agreement",
  "entity_id": 85,
  "student_id": 12,
  "version": "2026-10-29T21:21:42.393Z",
  "occurred_at": "2026-10-29T21:21:42.393Z",
  "payload": {
    "id": 85,
    "estado": "PENDIENTE",
    "descripcion": "…",
    "responsable": 7,
    "fecha_limite": "2026-11-12"
  }
}
```

Los eventos mínimos serán `agreement.created`, `agreement.status_changed` y, si posteriormente se agrega edición, `agreement.updated` y `agreement.deleted`.

### 3.3 Autorización del WebSocket

El consumer debe autorizar cada conexión con el mismo alcance de `permissions_for_user` y `can_access_student` utilizado por REST. No se debe confiar en que el `student_id` de la URL sea suficiente.

Como el navegador no permite configurar libremente `Authorization` en `WebSocket`, el plan recomienda un middleware JWT para WebSocket que valide el token durante el handshake usando un mecanismo que no lo exponga en logs o URLs; si el equipo opta por query string en el prototipo, deberá documentarlo como deuda de seguridad y retirar esa opción antes de producción.

Reglas:

- el alumno sólo puede suscribirse a su propio expediente;
- tutor, miembro de comité y coordinador sólo pueden suscribirse si tienen acceso vigente al estudiante;
- una conexión no autorizada se rechaza con cierre explícito;
- la renovación del JWT debe cerrar o renegociar la conexión antes de que el access token caduque;
- cerrar sesión debe cerrar las suscripciones abiertas.

## 4. Plan por fases con puntos seguros

Cada checkpoint es una condición de salida. No se avanza a la siguiente fase si el backend o frontend dejan de compilar, si fallan las pruebas existentes o si el flujo REST existente deja de funcionar.

### Fase 0 — Línea base y contrato de comportamiento

**Objetivo:** congelar el comportamiento actual antes de introducir infraestructura.

**Tareas:**

1. Documentar el flujo actual de creación y cambio de estado de acuerdos.
2. Añadir o confirmar pruebas de API para:
   - creación por un usuario autorizado;
   - rechazo por falta de acceso;
   - registro de auditoría;
   - cambio de estado sólo por el responsable;
   - serialización del acuerdo devuelto.
3. Definir los escenarios de aceptación multiusuario: tutor crea, alumno observa; dos clientes observan el mismo expediente; usuario sin permiso no recibe eventos.
4. Registrar métricas mínimas de prueba: latencia objetivo de entrega, tiempo de reconexión y comportamiento cuando Redis no está disponible.

**Punto seguro 0:**

- `python manage.py test nexus` pasa.
- `pnpm build` pasa.
- La creación y actualización REST funcionan sin WebSocket.
- No se ha cambiado el contrato público existente.

**Archivos probables:** pruebas backend, pruebas de `AcademicService` y componentes de acuerdos, documentación del contrato.  
**Dependencias:** ninguna.

### Fase 1 — Preparar la infraestructura sin activar el tiempo real

**Objetivo:** dejar el proyecto preparado para ASGI/Channels sin cambiar el flujo funcional.

**Tareas:**

1. Incorporar Django Channels y cliente/configuración de Redis con versiones compatibles con Django y Python del proyecto.
2. Configurar `ASGI_APPLICATION`, channel layer y variables de entorno con valores seguros para desarrollo.
3. Actualizar Docker Compose con Redis como servicio opcional o requerido según el perfil; conservar un perfil de desarrollo que permita ejecutar el backend REST sin Redis.
4. Cambiar el comando de producción planificado de `runserver` a servidor ASGI, sin eliminar todavía el camino local documentado.
5. Crear el esqueleto de routing/consumer que no acepte conexiones de negocio todavía, o mantenerlo fuera de las rutas activas hasta completar autenticación.

**Punto seguro 1:**

- Backend compila/importa Django y ASGI correctamente.
- Frontend sigue compilando y las peticiones REST siguen funcionando.
- `docker compose` levanta backend, frontend y Redis en el perfil definido.
- Si Redis se detiene, crear y consultar acuerdos por REST sigue funcionando.

**Archivos probables:** `requirements.txt`, `settings.py`, `asgi.py`, `docker-compose.yml`, Dockerfile, variables de entorno y documentación de ejecución.  
**Dependencias:** Fase 0.

### Fase 2 — Autenticación y autorización de suscripciones

**Objetivo:** establecer una conexión WebSocket segura antes de enviar datos académicos.

**Tareas:**

1. Implementar middleware JWT para WebSocket con validación de firma, expiración, usuario activo y rol.
2. Implementar un consumer de sólo conexión/desconexión para `/ws/students/{student_id}/`.
3. Reutilizar la lógica de alcance de estudiante o extraer un helper común para evitar que REST y WebSocket diverjan.
4. Rechazar conexiones sin token, con token expirado, con estudiante inexistente o sin permiso.
5. Probar múltiples conexiones del mismo estudiante y conexiones de tutor, comité, coordinador y usuario no autorizado.

**Punto seguro 2:**

- Una conexión autorizada abre y se cierra limpiamente.
- Una conexión no autorizada nunca recibe datos del expediente.
- Los tests de permisos REST no cambian.
- No se publica todavía ningún acuerdo, por lo que el comportamiento visible de la aplicación no cambia.

**Archivos probables:** middleware, consumer, routing, helper de permisos y pruebas backend.  
**Dependencias:** Fase 1.

### Fase 3 — Publicación atómica de eventos de acuerdos

**Objetivo:** emitir eventos sólo cuando una operación REST haya sido confirmada.

**Tareas:**

1. Crear un publicador de eventos de dominio para acuerdos, separado de las vistas.
2. Integrar `agreement.created` después de la creación en `TutoringSessionViewSet.agreements`.
3. Integrar `agreement.status_changed` después de la actualización en `AgreementViewSet.status`.
4. Mantener el registro de auditoría y la transacción existentes.
5. Definir serialización estable del evento, identificador único y marca temporal.
6. Manejar fallos del broker con logging explícito y sin convertir una operación de datos exitosa en una respuesta REST falsa o inconsistente.

**Punto seguro 3:**

- Las pruebas verifican que no se publica antes del commit.
- Cada creación o cambio válido genera exactamente un evento de negocio.
- Una transacción rechazada no genera un evento.
- La API REST conserva códigos, payloads y permisos actuales.

**Archivos probables:** servicio de eventos, consumer, vistas, serializers, pruebas de transacción y contrato técnico.  
**Dependencias:** Fase 2.

### Fase 4 — Cliente Angular compartido y resincronización

**Objetivo:** consumir eventos desde un único servicio para evitar estados divergentes entre pantallas.

**Tareas:**

1. Añadir la URL WebSocket a la configuración de entorno, derivándola correctamente de HTTP/HTTPS, proxy y túnel.
2. Crear un `RealtimeService` o equivalente que gestione:
   - conexión por estudiante;
   - estados `connecting`, `connected`, `degraded` y `closed`;
   - backoff con límite;
   - cierre y limpieza al destruir componentes;
   - renovación/reconexión cuando expire el token.
3. Crear un store o subject compartido de acuerdos que aplique eventos por `id` y `version`/`updated_at`, evitando duplicados.
4. Al conectar o reconectar, pedir el estado actual por REST y reconciliarlo con los eventos recibidos.
5. Mantener visible un estado de conexión degradada y ofrecer reintento; no ocultar silenciosamente que la vista puede estar temporalmente desactualizada.

**Punto seguro 4:**

- Angular compila y las pruebas actuales pasan.
- Sin conexión WebSocket, las pantallas siguen mostrando datos por REST.
- Reconectar no duplica filas ni regresa un acuerdo a un estado anterior.
- Destruir o cambiar de expediente cierra la suscripción anterior.

**Archivos probables:** `environment.ts`, servicio realtime, store de acuerdos, `AcademicService`, pruebas unitarias.  
**Dependencias:** Fase 3.

### Fase 5 — Integración en las superficies de acuerdos

**Objetivo:** entregar el caso de uso solicitado de extremo a extremo.

**Tareas:**

1. Integrar el store/stream en `student-overview`.
2. Integrarlo en `tutoring-agreements` y preservar la recarga posterior a una creación local.
3. Integrarlo en `agreements-list`, respetando filtros, paginación, virtual scroll y orden actual.
4. Actualizar contadores, alertas y resumen del inicio sólo cuando el evento pertenece al alcance visible del usuario.
5. Distinguir un evento local recién confirmado de un evento remoto para no mostrar dos veces el mismo acuerdo.
6. Definir el comportamiento cuando el evento no coincide con los filtros actuales: actualizar contadores o informar “hay cambios” y resincronizar, sin insertar una fila en una vista que debe permanecer filtrada.

**Punto seguro 5:**

- Tutor A crea un acuerdo y Alumno B lo ve sin recargar.
- Dos clientes del mismo alumno reciben el mismo cambio.
- Un tercer usuario sin acceso no recibe el evento.
- El cambio de estado se refleja en las vistas abiertas y la auditoría se puede consultar por REST.
- Los filtros y el scroll infinito siguen funcionando.

**Archivos probables:** componentes de expediente/acuerdos, store realtime, plantillas para estado de conexión, pruebas de componentes e integración.  
**Dependencias:** Fase 4.

### Fase 6 — Pruebas de concurrencia, resiliencia y operación

**Objetivo:** demostrar que la solución funciona con usuarios simultáneos y no sólo en una pestaña.

**Tareas:**

1. Probar con dos o más navegadores/sesiones y usuarios con roles distintos.
2. Probar creación simultánea y cambios de estado simultáneos; la base de datos debe decidir el resultado y el cliente debe resincronizar.
3. Probar cierre de Redis, reinicio del backend, pérdida de red, token expirado y reconexión.
4. Verificar que no se filtran datos entre grupos de estudiantes.
5. Añadir logs estructurados para conexión, rechazo, publicación, entrega fallida y resincronización, sin registrar tokens ni datos sensibles innecesarios.
6. Medir latencia de REST-confirmación a recepción en el cliente y definir un umbral aceptable para la demostración.
7. Preparar migración de SQLite a PostgreSQL y despliegue ASGI para un entorno multiusuario real.

**Punto seguro 6:**

- Suite backend, suite Angular y build pasan.
- La prueba end-to-end demuestra entrega en tiempo real y recuperación.
- La caída del broker no corrompe ni oculta operaciones confirmadas.
- Existe una estrategia de rollback: desactivar suscripción realtime y conservar REST.

**Archivos probables:** pruebas E2E/integración, configuración de despliegue, observabilidad, documentación operativa y migraciones de base de datos.  
**Dependencias:** Fase 5.

## 5. Estrategia de compatibilidad y rollback

La implementación debe ser incremental:

1. **Primero REST:** nunca eliminar ni reemplazar los endpoints actuales.
2. **Feature flag de cliente:** activar el consumo WebSocket sólo para desarrollo/pruebas hasta completar la fase 6.
3. **Fallback explícito:** si el socket falla, consultar por REST y mostrar estado degradado.
4. **Rollback de entrega:** desactivar la publicación/consumo realtime sin revertir modelos ni endpoints.
5. **Migraciones reversibles:** cualquier cambio de base de datos debe tener migración Django y procedimiento de reversión probado.
6. **Versionado de eventos:** incluir `schema_version` o estrategia equivalente para que un frontend anterior pueda ignorar eventos desconocidos y continuar por REST.

## 6. Criterios de aceptación finales

- Un acuerdo creado por un tutor aparece en la sesión del alumno sin recarga manual.
- Un cambio de estado confirmado aparece en todas las vistas abiertas autorizadas.
- La autorización se evalúa en el servidor para cada suscripción.
- Los datos no se duplican al combinar respuesta REST, evento local y evento remoto.
- Una reconexión recupera cambios ocurridos durante la desconexión.
- La aplicación continúa siendo utilizable si WebSocket o Redis están temporalmente fuera de servicio.
- Backend y frontend compilan en cada checkpoint.
- Las pruebas cubren permisos, transacciones, eventos, reconexión, concurrencia y aislamiento entre alumnos.
- La documentación de ejecución indica las variables, puertos, proxy, Redis, ASGI y límites de SQLite.

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Publicar antes del commit | Alto: el alumno ve un acuerdo inexistente si la transacción falla | Publicar con `transaction.on_commit` y probar rollback |
| WebSocket autorizado sólo por URL | Crítico: fuga de expedientes | Middleware JWT y verificación de alcance por estudiante |
| Token JWT caducado durante la conexión | Alto: suscripción inválida o usuario expulsado sin explicación | Renovación coordinada, cierre controlado y resincronización |
| Eventos duplicados o fuera de orden | Medio/alto: estado visual incorrecto | `event_id`, versión/fecha, deduplicación y refetch por REST |
| Redis no disponible | Alto: falta de actualización en vivo | REST como fuente de verdad, error explícito y reconexión |
| SQLite bajo escrituras simultáneas | Alto en producción | Usarlo sólo para desarrollo; migrar a PostgreSQL antes de desplegar |
| Muchas conexiones por usuario o pestaña | Medio: consumo innecesario | Servicio compartido, una conexión por estudiante visible y cierre al salir |
| Cambios en filtros/paginación | Medio: filas fuera de contexto | Reaplicar filtros, actualizar contadores y resincronizar según el evento |
| `runserver` en producción | Alto: inestabilidad y mal soporte ASGI | Servidor ASGI y proxy con upgrade WebSocket |

## 8. Preguntas que deben resolverse antes de implementar

1. ¿La profesora exige sólo actualización de acuerdos o también observaciones, tutorías, evidencias y alertas en tiempo real?
2. ¿La demostración se ejecutará en la red local, con Docker o mediante el túnel de Cloudflare ya documentado?
3. ¿La entrega académica acepta Redis/PostgreSQL como servicios adicionales o debe mantenerse un modo de demostración con SQLite?
4. ¿Qué latencia máxima se considerará “tiempo real” para la evaluación: por ejemplo, menos de 1 segundo en red local?
5. ¿Se requiere notificación visual/toast, contador de alertas, o basta con actualizar la fila del acuerdo?

## 9. Orden recomendado de ejecución

La ruta de menor riesgo es:

```text
Fase 0 → Checkpoint 0
       → Fase 1 → Checkpoint 1
       → Fase 2 → Checkpoint 2
       → Fase 3 → Checkpoint 3
       → Fase 4 → Checkpoint 4
       → Fase 5 → Checkpoint 5
       → Fase 6 → Checkpoint 6
```

No se recomienda comenzar por el componente Angular ni por la conexión WebSocket antes de definir autenticación, permisos, contrato de evento y fallback REST. Ese orden produciría una demo visual rápida, pero dejaría sin resolver la seguridad, la consistencia y la recuperación.
