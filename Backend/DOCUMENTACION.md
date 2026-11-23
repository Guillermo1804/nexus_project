# Backend N.E.X.U.S.

## Estado técnico

Backend Django 6.1/DRF en `Backend/nexus`, con una sola aplicación `nexus`. Autenticación SimpleJWT y API exclusivamente bajo `/api/v1/`. SQLite es la base configurada.

## Estructura

```text
Backend/
├── requirements.txt
└── nexus/
    ├── manage.py
    ├── populate_data.py
    └── nexus/
        ├── migrations/
        ├── models.py
        ├── permissions.py
        ├── serializers.py
        ├── settings.py
        ├── urls.py
        ├── views.py
        └── test_hu*.py / tests.py
```

Los modelos viven juntos y generan tablas `nexus_*`: usuario con `grammatical_gender`, estudiante con matrícula de hasta 20 caracteres, semestre, comité + memberships, auditoría, tutorías, acuerdos, avance de tesis, evidencia y producción académica. Detalle exacto: [`../docs/architecture/database_schema_specification.md`](../docs/architecture/database_schema_specification.md).

## Seguridad y permisos

Enviar `Authorization: Bearer <access_token>` en recursos protegidos.

| Rol | Alcance vigente |
|---|---|
| `STUDENT` | Expediente propio. |
| `TUTOR`, `COMMITTEE_MEMBER` | Expedientes/tutorías donde existe membership. |
| `PROGRAM_COORDINATOR` | Lectura global, alta de estudiantes, gestión de comité y semestres. |
| `SYSTEM_ADMIN` | Gestión de cuentas/roles y auditoría; sin lectura académica. |

## API

El inventario real de rutas, métodos, estado y HU está en [`../docs/architecture/api_contract_v1.md`](../docs/architecture/api_contract_v1.md). Resumen implementado:

- `/api/v1/auth/*`: login, refresh, logout, me, usuarios/roles.
- `/api/v1/admin/users/`, `/api/v1/admin/audit/`, `/api/v1/admin/students/`.
- `/api/v1/students/`, detalle/overview y semestres.
- `/api/v1/committees/` y eliminación de memberships.
- `/api/v1/tutoring-sessions/` con participantes, observaciones y acuerdos.
- `/api/v1/agreements/` con estado y auditoría.
- `/api/v1/evidence/` para archivos locales de hasta 15 MiB.

No hay endpoints públicos de tesis, producción académica, DOI/URL, timeline, dashboard analítico, alertas, reportes ni exportación.

## Ejecución y pruebas

```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd nexus
python manage.py migrate
python populate_data.py
python manage.py runserver 8000
python manage.py test nexus
```

En Windows, instala las dependencias con el mismo intérprete del entorno virtual que
ejecutará Django para evitar que paquetes como Daphne queden instalados sólo en el
Python global:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe nexus\manage.py runserver
```

### Infraestructura de tiempo real

El backend ya está preparado para ejecutarse con ASGI mediante Channels. En esta fase
los acuerdos se distribuyen por WebSocket y REST continúa siendo la fuente de verdad.

- `ASGI_APPLICATION=nexus.asgi.application` queda configurado por defecto.
- Sin `REDIS_URL`, el channel layer usa `InMemoryChannelLayer`, adecuado sólo para
  desarrollo local con un único proceso.
- Con `REDIS_URL=redis://localhost:6379/0`, se usa Redis para distribuir eventos entre
  procesos.
- El contenedor usa Daphne por defecto. Para conservar el servidor local de Django,
  establece `NEXUS_SERVER=runserver`.
- `docker compose up` expone el backend en `8000`, Redis internamente en `6379` y el
  frontend en `4200`. Redis no se expone al host.

La configuración local REST no requiere Redis: ejecuta `python manage.py runserver 8000`
sin `REDIS_URL`. Docker Compose arranca Redis para el perfil multi-proceso.

Para activar o desactivar el transporte sin cambiar modelos ni endpoints:

```text
NEXUS_REALTIME_ENABLED=true
NEXUS_REALTIME_LOG_LEVEL=INFO
```

Con `NEXUS_REALTIME_ENABLED=false`, los endpoints REST siguen disponibles y el handshake
WebSocket se rechaza con `4403`. Esto permite rollback operativo a REST sin revertir código.
Los logs del logger `nexus.realtime` incluyen conexión, rechazo, desconexión, publicación,
entrega fallida y el estado de la publicación. La resincronización del cliente se mide
mediante `RealtimeService.metrics$`.

### Suscripciones WebSocket (fase 2)

La ruta `/ws/students/<student_id>/` ya valida el access token JWT durante el handshake.
El navegador debe ofrecer los subprotocolos `nexus.jwt` y el token, en ese orden; el token
no se coloca en la URL. El servidor acepta la conexión sólo para el estudiante propio,
usuarios con `academic.read.global` o miembros del comité de ese estudiante.

La conexión responde inicialmente con `connection.ready` y entrega eventos versionados de
acuerdos publicados después del commit. Para desactivar la entrega en una instancia, usa
`NEXUS_REALTIME_ENABLED=false`; la aplicación debe continuar consumiendo REST.

### Checklist de operación de fase 6

1. Ejecutar `python manage.py test nexus` con Redis detenido para comprobar el fallback REST.
2. Ejecutar la suite Angular y el build de producción.
3. Abrir tres sesiones autorizadas (alumno, tutor y coordinador), crear/cambiar un acuerdo
   y comprobar que sólo los usuarios autorizados reciben el evento.
4. Reiniciar Redis y confirmar que las operaciones REST confirmadas no fallan; al volver
   Redis, los clientes deben resincronizar por REST.
5. Simular expiración del access token y caída de red; comprobar reconexión y ausencia de
   duplicados.
6. Antes de producción, cambiar SQLite por PostgreSQL y ejecutar Daphne detrás de un proxy
   TLS. SQLite sólo es válido para desarrollo de un proceso.

Las métricas `connected`, `reconnected`, `resynchronized` y `degraded` se exponen mediante
`RealtimeService.metrics$`; deben recopilarse en el sistema de observabilidad de la
aplicación sin registrar tokens ni payloads sensibles.

### Alertas de supervisión HU-26

El endpoint `GET /api/v1/monitoring/supervision-alerts/` devuelve alertas de tutoría
rezagada, reunión próxima y evidencia faltante. Los coordinadores reciben todos los
estudiantes activos; los asesores principales sólo reciben los estudiantes asignados
en su comité.

Los valores predeterminados son 45 días sin tutoría, 15 días para exigir evidencia y
3 días hábiles para una próxima reunión. Se pueden cambiar centralizadamente mediante
`NEXUS_DIAS_MAX_SIN_TUTORIA`, `NEXUS_DIAS_MAX_SIN_EVIDENCIA_TUTORIA` y
`NEXUS_DIAS_ANTICIPACION_PROXIMA_REUNION`.

### Reporte integral HU-27

El reporte se consulta mediante `GET /api/v1/reporting/dossier/?student=<id>` y consolida
la trayectoria del estudiante en JSON: identidad, comité, semestres, tutorías, acuerdos,
tesis, publicaciones, eventos, estancias, otros productos y evidencias. El endpoint permite
al estudiante consultar su propio expediente, a miembros del comité consultar estudiantes
asignados y a usuarios con `academic.read.global` consultar globalmente.

La vista Angular `/students/<id>/report` está preparada para impresión o guardado como PDF
desde el navegador. Los controles de navegación se ocultan mediante `@media print`.
