# Estado de Implementación N.E.X.U.S.

**Corte técnico:** `HEAD a18cb1e76c81a795dbffd7f74821a4ca14096336` (`Development`)  
**Fecha del corte:** 2026-09-14  
**Alcance del documento:** estado observable del código en el corte; no sustituye el backlog HU-01 a HU-28 ni elimina los módulos futuros especificados.

---

## 1. Arquitectura observada

- Backend: proyecto Django con **una única aplicación `nexus`** en `INSTALLED_APPS`; los dominios de identidad, estudiantes, comités, tutorías, acuerdos, tesis, evidencias y producción académica comparten `models.py`, `serializers.py`, `views.py`, `permissions.py` y `urls.py`.
- Persistencia propia: tablas con prefijo **`nexus_*`**. Base configurada actualmente en SQLite; el diseño futuro conserva portabilidad relacional.
- API: rutas operativas bajo **`/api/v1/`**; `/admin/` pertenece al subsistema administrativo de Django y no es contrato REST público.
- Frontend: Angular 20; gestor declarado **`pnpm@11.20.0`**.
- Seguridad: SimpleJWT con access de 15 minutos, refresh de 7 días, rotación y blacklist después de rotar; logout invalida el refresh recibido.
- Flujo Git vigente: rama HU corta → PR a `Development` → validación integrada → PR de `Development` a `main`.

---

## 2. Estado por historia y rama

| Rango / HU | Rama observable | Estado en `Development` al corte | Capas observadas |
| :--- | :--- | :--- | :--- |
| HU-01 | `HU-01-autenticarse` | Integrada | Modelo de usuario, serializers, login/logout/me, refresh JWT, frontend auth e interceptor |
| HU-02 | `HU-02-controlar-acceso-por-rol` | Integrada | RBAC de cinco roles; cuentas/roles sólo `SYSTEM_ADMIN`, academia global `PROGRAM_COORDINATOR`, sesión revalidada con `/auth/me` |
| HU-03 | `HU-03-registrar-estudiante` | Integrada | Modelo/serializer/viewset de estudiantes y formulario frontend |
| HU-04 | `HU-04-asignar-comite-academico` | Integrada, con defectos de manejo de errores/seed indicados abajo | Comité agrupado, memberships, endpoints y UI administrativa |
| HU-05 | `HU-05-gestionar-semestres` | Integrada | Modelo, validaciones, endpoints por estudiante y consumo frontend |
| HU-06 | `HU-06-consultar-expediente-resumen-estudiante` | Integrada | Serializer agregado, control de acceso, vista overview y UI de expediente |
| HU-07 | `HU-07-registrar-sesion-tutoria` | Integrada | Modelo, serializer, viewset, formulario y pruebas dedicadas |
| HU-08 | `HU-08-registrar-asistencia-participantes` | Integrada | Participantes, acción anidada y pruebas dedicadas |
| HU-09 | `HU-09-registrar-observaciones-minutas` | Integrada | Observaciones, acción anidada y pruebas dedicadas |
| HU-10 | `HU-10-programar-proxima-reunion` | Integrada | Campos y validación de próxima reunión, UI y pruebas |
| HU-11 | `HU-11-registrar-acuerdos-compromisos` | Integrada | Acuerdos anidados a tutoría, listado y pruebas |
| HU-12 | `HU-12-asignar-responsable-fecha-limite` | Integrada | Validación de responsable/fecha y pruebas |
| HU-13 | `HU-13-gestionar-estados-acuerdos` | Integrada | Transiciones, vencimiento derivado, auditoría y pruebas |
| HU-14 | `HU-14-consultar-acuerdos-pendientes-vencidos` | Integrada | Filtros/listado paginado y pruebas backend/frontend |
| HU-15 a HU-20 | Sin ramas HU observables en el corte | Modelo base presente; contratos funcionales futuros no expuestos | Persistencia de tesis y producción académica; faltan APIs/UI completas |
| HU-21 | `HU-21-cargar-evidencia` | Integrada | Modelo, validación binaria/MIME/15 MiB, endpoint multipart, UI y pruebas |
| HU-22 a HU-28 | Sin ramas HU observables en el corte | Futuras / no implementadas de extremo a extremo | Los contratos y especificaciones se mantienen en la documentación del ciclo completo |

---

## 3. Endpoints operativos observados

| Área | Método y ruta | Estado |
| :--- | :--- | :--- |
| Auth | `POST /api/v1/auth/login/` | Operativo |
| Auth | `POST /api/v1/auth/token/refresh/` | Operativo |
| Auth | `POST /api/v1/auth/logout/` | Operativo |
| Auth | `GET /api/v1/auth/me/` | Operativo |
| Roles | `GET /api/v1/auth/users/` | Operativo, paginado |
| Roles | `PATCH /api/v1/auth/users/{user_id}/role/` | Operativo |
| Administración | `POST /api/v1/admin/users/` | Operativo |
| Administración | `GET /api/v1/admin/students/` | Operativo, paginado |
| Administración | `GET /api/v1/admin/audit/` | Operativo, paginado |
| Comités | `GET/POST /api/v1/committees/` | Operativo, listado paginado |
| Comités | `DELETE /api/v1/committee-memberships/{assignment_id}/` | Operativo |
| Estudiantes | `GET/POST /api/v1/students/` | Operativo, listado paginado |
| Estudiantes | `GET /api/v1/students/{id}/` | Operativo |
| Expediente | `GET /api/v1/students/{student_id}/overview/` | Operativo |
| Semestres | `GET/POST /api/v1/students/{student_id}/semesters/` | Operativo; escritura reservada por permiso a `PROGRAM_COORDINATOR` |
| Semestres | `PATCH /api/v1/students/{student_id}/semesters/{semester_id}/` | Operativo; escritura reservada a `PROGRAM_COORDINATOR` |
| Tutorías | CRUD `/api/v1/tutoring-sessions/` | Operativo con observación de permisos de escritura |
| Tutorías | `GET/POST /api/v1/tutoring-sessions/{id}/participants/` | Operativo con observación de permisos de escritura |
| Tutorías | `GET/POST /api/v1/tutoring-sessions/{id}/observations/` | Operativo con observación de permisos de escritura |
| Tutorías | `GET/POST /api/v1/tutoring-sessions/{id}/agreements/` | Operativo con observación de permisos de escritura |
| Compatibilidad v1 | `POST /api/v1/tutoring/` | Alias operativo dentro de v1; candidato a retiro cuando los consumidores migren al endpoint canónico |
| Acuerdos | `GET /api/v1/agreements/` y detalle | Operativo, paginado y filtrable |
| Acuerdos | `PATCH /api/v1/agreements/{id}/status/` | Operativo para el responsable |
| Acuerdos | `GET /api/v1/agreements/{id}/audit-log/` | Operativo |
| Evidencias | `GET/POST /api/v1/evidence/` | Operativo para archivo local multipart; DOI/URL aún no está completo |
| Académico | `GET /api/v1/academic/overview/` | Operativo, paginado |

Los endpoints de tesis, producción académica, monitoring, reporting y exportación descritos en el contrato global permanecen como **especificación futura**, no como disponibilidad actual.

---

## 4. Decisiones de dominio materializadas

- `Student.matricula`: `CharField(max_length=20)`, unicidad sensible a mayúsculas/minúsculas reforzada por migración.
- `CustomUser.grammatical_gender`: `MASCULINE`, `FEMININE`, `NEUTRAL`, `UNSPECIFIED`.
- Comité: un `AcademicCommittee` por estudiante y colección `CommitteeMembership`; cargos `ASESOR`, `COASESOR`, `COMMITTEE_MEMBER`; restricción de máximo un coasesor.
- Semestres: rango 1–6, unicidad por estudiante, fechas coherentes y un semestre activo gestionado desde endpoints reservados al coordinador.
- Acuerdos: transiciones manuales `PENDIENTE → EN_PROCESO → CONCLUIDO`; `is_vencido` se calcula por fecha y no requiere mutar el estado persistido.
- Evidencia: validación de extensión, firma binaria, MIME y máximo **15 MiB**.

---

## 5. Defectos conocidos y deuda de integración

| Defecto | Evidencia / impacto | Corrección esperada |
| :--- | :--- | :--- |
| `user.id` vs `student_id` | El usuario autenticado tiene ambos identificadores; consumidores que usen `user.id` como id de expediente pueden abrir o mutar el estudiante equivocado. | Consumir `user.student_id` para rutas de estudiante y reservar `user.id` para identidad/RBAC. |
| Evidencia `actividad_id` | El serializer valida estudiante/semestre, pero no comprueba que `actividad_id` exista, corresponda a `actividad_tipo` ni pertenezca al mismo estudiante/semestre. | Resolver la entidad objetivo por tipo y validar existencia, pertenencia y coherencia antes de guardar. |
| Paginación en selectores | Usuarios, estudiantes y comités devuelven páginas de 10; selectores administrativos pueden mostrar sólo la primera página si no recorren `next` o no solicitan un tamaño apropiado. | Implementar carga incremental/búsqueda o consumir correctamente el sobre paginado. |
| Permisos de escritura en tutorías | `CanCreateTutoring` se aplica al viewset completo y tanto `TUTOR` como `COMMITTEE_MEMBER` poseen `tutoring.create`; las acciones anidadas POST no hacen verificación específica de escritura. Además, `can_access_student(..., write=True)` permite a cualquier membership escribir. | Separar permisos por acción y cargo; aplicar autorización objeto-acción a update/delete/participants/observations/agreements. |
| Respuesta `created_by` | La creación usa `TutoringSessionCreateSerializer`, cuyo campo `created_by` no forma parte de la respuesta; en acuerdos/evidencias se devuelve un id, sin representación consistente del creador. | Unificar serializers de lectura tras crear y definir forma contractual de `created_by`. |
| Errores de comité | La creación iterativa de memberships puede propagar errores de restricción de base de datos —por ejemplo segundo coasesor o duplicado— como error no normalizado; también falta validación integral previa del lote. | Validar todo el agregado y traducir restricciones a errores DRF por campo/índice de membership. |
| Seed de roles | Los datos seed pueden no respetar la separación entre rol institucional (`TUTOR`/`COMMITTEE_MEMBER`) y cargo de membership (`ASESOR`/`COASESOR`/`COMMITTEE_MEMBER`). | Alinear fixtures/seeds y añadir prueba de coherencia de rol-cargo. |
| Migración de matrícula | La longitud 20 y unicidad case-insensitive están en la cadena de migraciones, pero una base creada o poblada antes del ajuste debe validar datos incompatibles antes de desplegar. | Ejecutar auditoría de longitudes/duplicados por casefold y probar migración sobre copia de datos. |
| Interceptor JWT | Existe refresh automático y deduplicación de petición, pero ante 401 concurrentes cada solicitud reintenta después del refresh; no hay exclusión explícita de logout y debe verificarse que un 401 del reintento no genere ciclos ni carreras de cierre de sesión. | Añadir pruebas concurrentes y guardas explícitas para refresh/logout/reintento único. |

---

## 6. Criterio de lectura del estado

“Integrada” significa que el código correspondiente está presente en `Development` al corte indicado; no equivale por sí solo a “Done” bajo la DoD completa. La aceptación final todavía requiere pruebas integradas, revisión de permisos, migración limpia, contrato frontend/backend y demostración en el entorno común. Los módulos futuros y las HU-01 a HU-28 continúan vigentes en el plan completo.
