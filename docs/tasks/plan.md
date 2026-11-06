# Plan de implementación: actualización en tiempo real multiusuario

## Objetivo

Permitir que tres o más sesiones autenticadas vean cambios confirmados en acuerdos y sus alertas sin recargar manualmente. Un tutor podrá crear o cambiar el estado de un acuerdo y los clientes autorizados del estudiante recibirán la actualización; los usuarios sin permiso no recibirán datos. La API REST y la base de datos seguirán siendo la fuente de verdad.

El alcance inicial cubre acuerdos, expediente, listado de acuerdos, resumen y alertas relacionadas. Evidencias, tutorías y observaciones quedan como una ampliación posterior hasta confirmar que también deben actualizarse en tiempo real.

## Estado actual relevante

- Backend: Django 6 + Django REST Framework + SimpleJWT.
- Frontend: Angular 20 standalone.
- ASGI actual: sólo `get_asgi_application()`, sin WebSocket.
- No existen Channels, Redis ni un channel layer configurado.
- Docker Compose usa SQLite y `runserver`; eso sirve para desarrollo, pero no es el despliegue multiusuario final.
- Existe un plan previo más detallado en `docs/plan-actualizacion-tiempo-real-acuerdos.md`; este documento lo convierte en tareas ejecutables.

## Decisiones de arquitectura

1. **Transporte:** Django Channels sobre ASGI y WebSocket.
2. **Distribución entre procesos:** Redis como channel layer para que varias instancias del backend puedan entregar el mismo evento.
3. **Fuente de verdad:** REST + base de datos; WebSocket sólo distribuye cambios confirmados.
4. **Publicación:** `transaction.on_commit`, con eventos versionados y payload completo del acuerdo.
5. **Autorización:** middleware JWT para WebSocket y reutilización de la misma lógica de permisos que REST.
6. **Cliente:** un servicio compartido por estudiante visible, con reconexión, deduplicación y resincronización REST.
7. **Resiliencia:** si WebSocket o Redis fallan, la aplicación continúa por REST y muestra estado degradado.
8. **Persistencia:** SQLite se conserva para desarrollo; PostgreSQL y un servidor ASGI son requisitos antes de producción.

## Contrato de evento propuesto

```json
{
  "schema_version": 1,
  "event_id": "uuid",
  "event_type": "agreement.created",
  "entity": "agreement",
  "entity_id": 85,
  "student_id": 12,
  "version": "2026-11-06T13:00:00.000Z",
  "occurred_at": "2026-11-06T13:00:00.000Z",
  "payload": {}
}
```

Eventos iniciales: `agreement.created` y `agreement.status_changed`. Los eventos desconocidos deben ignorarse y provocar una resincronización REST, no romper la pantalla.

## Dependencias

```text
Fase 0
  -> Fase 1 infraestructura
      -> Fase 2 autenticación/autorización
          -> Fase 3 publicación atómica
              -> Fase 4 cliente compartido
                  -> Fase 5 integración de pantallas
                      -> Fase 6 concurrencia y operación
```

## Fases y tareas

### Fase 0: Línea base y contrato

- [x] Confirmar alcance inicial: acuerdos, expediente, listado, resumen y alertas relacionadas. Evidencias, tutorías y observaciones quedan para una ampliación posterior.
- [x] Confirmar la línea base REST existente y ejecutar la suite backend actual sin cambios de contrato.
- [x] Definir escenarios de tres sesiones: tutor que modifica, alumno que observa y usuario sin acceso.
- [x] Registrar objetivos iniciales: medir latencia y reconexión en la fase 6; REST debe continuar funcionando sin Redis.

**Criterios de aceptación**

- El comportamiento REST actual está cubierto y documentado.
- Se puede demostrar qué debe ocurrir en cada sesión autorizada y no autorizada.
- No se cambia todavía el contrato público ni el comportamiento de producción.

**Verificación:** `python manage.py test nexus`, build Angular y pruebas manuales REST.

### Fase 1: Infraestructura sin activar eventos

- [x] Añadir dependencias compatibles de Channels, channels-redis y Daphne.
- [x] Configurar `ASGI_APPLICATION`, channel layer y `REDIS_URL`; sin Redis se usa `InMemoryChannelLayer`.
- [x] Añadir Redis a Docker Compose con healthcheck; el modo REST sin Redis sigue disponible fuera del servicio Redis.
- [x] Preparar comando ASGI con Daphne, manteniendo `NEXUS_SERVER=runserver` para desarrollo local.
- [x] Documentar puertos y variables de desarrollo en la configuración de Compose.

**Criterios de aceptación**

- ASGI importa correctamente y el backend arranca.
- Docker levanta backend, frontend y Redis.
- REST continúa funcionando si Redis está detenido.

**Verificación:** import de ASGI, `docker compose config`, pruebas REST y build Angular.

**Implementación:** `Backend/nexus/nexus/asgi.py` ya expone el `ProtocolTypeRouter`, pero la
ruta WebSocket está deliberadamente vacía hasta completar la fase 2. No se publican eventos
ni se aceptan conexiones académicas en esta fase.

### Fase 2: Autenticación y autorización WebSocket

- [x] Implementar middleware JWT para el handshake usando subprotocolos, sin registrar tokens en URLs o logs.
- [x] Crear `/ws/students/{student_id}/` con conexión y desconexión controladas.
- [x] Reutilizar la lógica de alcance de estudiante para REST y WebSocket.
- [x] Rechazar token ausente, expirado, usuario inactivo, estudiante inexistente o permiso insuficiente.
- [x] Probar alumno autorizado, tutor con membresía, coordinador global, token inválido/expirado,
  usuario inactivo y estudiante sin acceso.

**Criterios de aceptación**

- Tres conexiones autorizadas pueden abrirse simultáneamente.
- Una conexión no autorizada se rechaza y nunca recibe datos.
- El logout y el cambio de expediente cierran suscripciones.

**Verificación:** pruebas de consumer/middleware con varias conexiones y pruebas REST sin regresiones.

### Fase 3: Publicación atómica de eventos

- [x] Crear un publicador de eventos de dominio separado de las vistas.
- [x] Emitir `agreement.created` después de crear acuerdo y auditoría.
- [x] Emitir `agreement.status_changed` después de validar y guardar el estado.
- [x] Publicar sólo mediante `transaction.on_commit`.
- [x] Añadir `event_id`, `schema_version`, `version` y payload estable.
- [x] Registrar errores del broker explícitamente sin convertir una operación REST exitosa en fallo falso.

**Criterios de aceptación**

- Cada operación válida produce un único evento.
- Una transacción revertida no produce eventos.
- REST conserva sus códigos, permisos y respuestas actuales.

**Verificación:** pruebas de transacción, publicación mock/fake del channel layer y pruebas de API.

### Fase 4: Cliente Angular compartido y recuperación

- [x] Añadir URL WebSocket derivada de HTTP/HTTPS, localhost, proxy y túnel.
- [x] Crear `RealtimeService` con estados `connecting`, `connected`, `degraded` y `closed`.
- [x] Implementar backoff limitado, cierre limpio y renovación/reconexión por expiración JWT.
- [x] Crear subjects compartidos que deduplican por `event_id` y rechazan versiones antiguas.
- [x] Resincronizar el expediente por REST al conectar y reconectar.
- [x] Exponer estado degradado y acción de reintento para la futura integración visual.

**Criterios de aceptación**

- Sin WebSocket, las pantallas siguen funcionando por REST.
- Reconectar no duplica ni retrocede acuerdos.
- Los cambios ocurridos durante una desconexión se recuperan.

**Verificación:** pruebas unitarias del servicio/store, build Angular y prueba con WebSocket simulado.

### Fase 5: Integración vertical de la experiencia

- [ ] Integrar el stream en expediente y acuerdos de tutoría.
- [ ] Integrarlo en el listado paginado respetando filtros, orden y scroll.
- [ ] Actualizar contadores, alertas y resumen del inicio sólo para eventos visibles/autorizados.
- [ ] Evitar duplicar el evento local de una creación con el evento remoto.
- [ ] Resolver eventos que no coinciden con filtros mediante contadores o resincronización.
- [ ] Añadir indicador accesible de conexión y notificación opcional de actualización.

**Criterios de aceptación**

- El tutor crea un acuerdo y el alumno lo ve sin recargar.
- Dos clientes del mismo alumno reciben el cambio.
- Un tercer usuario sin acceso no lo recibe.
- Las vistas mantienen filtros y paginación.

**Verificación:** pruebas de componentes/integración y flujo manual con al menos tres sesiones.

### Fase 6: Concurrencia, resiliencia y producción

- [x] Cubrir conexiones simultáneas, autorización por grupo y entrega de eventos en pruebas backend.
- [ ] Probar modificaciones concurrentes y resolver el resultado desde la base de datos.
- [ ] Probar caída/reinicio de Redis, backend, red y expiración de token.
- [ ] Verificar aislamiento entre grupos de estudiantes.
- [x] Añadir logs estructurados de conexión, rechazo, publicación y entrega fallida.
- [x] Exponer métricas de conexión, reconexión, resincronización y degradación en Angular.
- [ ] Migrar a PostgreSQL y desplegar con ASGI antes de producción.
- [x] Activar/desactivar WebSocket por feature flag y documentar rollback a REST.

**Criterios de aceptación**

- Suite backend, suite Angular y build pasan.
- La entrega funciona con tres o más clientes.
- Redis caído no corrompe ni oculta operaciones confirmadas.
- Existe rollback sin revertir modelos ni endpoints.

**Verificación:** pruebas E2E, pruebas de carga/concurrencia, Docker y checklist operativo.

## Checkpoints

### Checkpoint A — Después de Fases 0-1

- [x] Contrato y métricas iniciales definidos.
- [x] ASGI y configuración de Redis validados; Compose quedó preparado.
- [x] REST y build Angular siguen funcionando sin activar WebSocket.

**Validación ejecutada:** `python manage.py test nexus` (4 pruebas OK), prueba enfocada de
infraestructura (2 pruebas OK), `python manage.py check` con `REDIS_URL`, y build Angular de
desarrollo. `docker compose config` no pudo ejecutarse porque Docker no está instalado en el
entorno actual; debe ejecutarse en una máquina con Docker antes del siguiente checkpoint.

### Checkpoint B — Después de Fases 2-3

- [x] Autorización server-side probada para conexión WebSocket.
- [x] Eventos sólo aparecen después del commit.
- [x] No hay fuga entre estudiantes en las pruebas de autorización de suscripción.

**Avance de Fase 3:** las vistas de creación y cambio de estado publican eventos
`agreement.created` y `agreement.status_changed` al grupo del estudiante después del commit.
El payload contiene el acuerdo serializado completo. La integración con las pantallas Angular
queda pendiente de la fase 4-5.

**Avance de Fase 2:** la conexión autorizada responde `connection.ready` sin datos
académicos. La publicación de eventos y la prueba E2E de aislamiento quedan pendientes
de las fases 3 y 5.

### Checkpoint C — Después de Fases 4-5

- [x] Cliente reconecta y resincroniza.
- [ ] Expediente y acuerdos actualizan tres sesiones.
- [x] Fallback REST y estado degradado están disponibles en el servicio; falta conectarlo a las pantallas.

**Avance de Fase 4:** `RealtimeService` queda aislado para que la fase 5 conecte sus
`events$` y `snapshots$` al estado de expediente, acuerdos y alertas. El proxy Angular
local reenvía `/ws` al backend. Las pruebas específicas están escritas, pero el runner
Angular completo no puede compilarlas mientras existan errores de tipos preexistentes en
otras especificaciones (`academic.service.spec.ts`, `student-overview.spec.ts` y
`timeline.spec.ts`).

### Checkpoint D — Antes de producción

- [ ] Concurrencia y resiliencia E2E, observabilidad y rollback probados en entorno desplegado.
- [ ] PostgreSQL y ASGI configurados.
- [x] Documentación operativa actualizada para ejecutar el checklist.

**Avance de Fase 6:** se añadieron pruebas backend para tres clientes autorizados y el
feature flag `NEXUS_REALTIME_ENABLED`, además de logs del logger `nexus.realtime` y
métricas del cliente mediante `RealtimeService.metrics$`. La suite backend (15 pruebas)
y el build Angular pasan. La suite Angular completa continúa bloqueada por fixtures
preexistentes desactualizados en `academic.service.spec.ts`, `student-overview.spec.ts`
y `timeline.spec.ts`; las pruebas E2E con Redis reiniciado, PostgreSQL y despliegue TLS
requieren un entorno operativo con Docker/servicios disponibles.

## Riesgos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Publicar antes del commit | Alto | `transaction.on_commit` y prueba de rollback |
| Autorizar sólo por `student_id` | Crítico | JWT + helper de permisos compartido |
| Eventos fuera de orden/duplicados | Alto | `event_id`, versión, deduplicación y refetch |
| Redis no disponible | Alto | REST como fallback y estado degradado |
| SQLite bajo escrituras simultáneas | Alto | PostgreSQL antes de producción |
| JWT expirado durante socket | Alto | renovación coordinada y reconexión |
| Filtros/paginación inconsistentes | Medio | store central y reglas de reconciliación |

## Preguntas que deben resolverse antes de Fase 1

1. ¿El alcance inicial será sólo acuerdos o todos los módulos colaborativos?
2. ¿La demostración se ejecutará con Docker, red local o túnel Cloudflare?
3. ¿Se acepta Redis y PostgreSQL como servicios obligatorios para producción?
4. ¿Qué latencia máxima definirá “tiempo real”?
5. ¿Se requiere toast/notificación o basta actualizar las vistas?
