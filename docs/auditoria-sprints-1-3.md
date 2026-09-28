# Informe de auditoría integral de Historias de Usuario — Sprints 1 a 3

**Proyecto:** N.E.X.U.S. — Núcleo de Expediente y Seguimiento Universitario Superior  
**Fecha de corte:** 2026-09-28  
**Rama auditada:** `integration/sprint3-development`  
**Commit auditado:** `f9d807873efd945db964663dea01e91517f305af`  
**Alcance:** Sprint 1 (HU-01 a HU-06), Sprint 2 (HU-07 a HU-14) y Sprint 3 (HU-15, HU-21, HU-22, HU-23 y HU-25).

## 1. Resumen ejecutivo

La integración auditada presenta un MVP funcional y verificable en sus recorridos principales: autenticación, control relacional de expedientes, padrón de estudiantes, expediente académico, semestres, comité, tutorías, acuerdos, avance de tesis, evidencias, trayectoria longitudinal y alertas internas. La validación automatizada final obtuvo **121 pruebas Django correctas**, **81 pruebas Angular correctas**, compilación Angular correcta y una cadena limpia de migraciones hasta `nexus.0013`.

El resultado no debe interpretarse como que todos los criterios de aceptación están cerrados. La implementación satisface la mayor parte de los CA, pero persisten brechas concretas: la semántica JWT del cierre de sesión no revoca el access token ya emitido; algunos contratos de Sprint 2 son más amplios que la implementación efectiva; la descarga de evidencias no tiene un endpoint dedicado con autorización; el filtro visual del timeline sólo quedó parcialmente verificado en navegador; la accesibilidad de teclado y foco de los modales no se probó de extremo a extremo; existen presupuestos de bundle/estilos excedidos y deuda documental y de limpieza de artefactos.

### Dictamen global

| Estado | Historias |
|---|---|
| **Cumple** | HU-02, HU-03, HU-04, HU-05, HU-07, HU-10, HU-14, HU-15, HU-22, HU-25 |
| **Parcial** | HU-01, HU-06, HU-08, HU-09, HU-11, HU-12, HU-13, HU-21, HU-23 |
| **No verificable** | Ninguna historia completa; sí hay CA puntuales no verificables por GUI/E2E, indicados en el detalle |

“Cumple” significa que existe evidencia coherente de código y pruebas para el alcance contractual revisado. “Parcial” significa que el flujo principal existe, pero uno o más CA carecen de implementación completa o de evidencia suficiente. “No verificable” se reserva para aspectos que no pudieron demostrarse con código, pruebas automatizadas o GUI durante el corte.

## 2. Alcance, fuentes y metodología

### 2.1 Alcance

Se revisaron las 19 historias solicitadas:

- **Sprint 1:** HU-01, HU-02, HU-03, HU-04, HU-05 y HU-06.
- **Sprint 2:** HU-07, HU-08, HU-09, HU-10, HU-11, HU-12, HU-13 y HU-14.
- **Sprint 3:** HU-15, HU-21, HU-22, HU-23 y HU-25.

No se evaluaron como entregables de este corte las HU-16 a HU-20, HU-24 ni HU-26 a HU-28, salvo cuando una dependencia futura explica una brecha observable —por ejemplo, la actividad académica reciente de HU-06 depende de datos que se completan en Sprint 4—.

### 2.2 Fuentes examinadas

1. Código integrado en `Backend/nexus/nexus/` y `FrontEnd/nexus_project/src/app/`.
2. Migraciones Django `Backend/nexus/nexus/migrations/0001_initial.py` a `0013_alter_tutoringsession_proxima_reunion_notas.py`.
3. Planes individuales `docs/HU-07-plan-implementacion.md` a `docs/HU-25-plan-implementacion.md` para las HU incluidas.
4. Planes de equipo en `docs/teams/plan-proyecto-equipo-1.md`, `plan-proyecto-equipo-2.md` y `plan-proyecto-equipo-3.md`.
5. Contratos y estado arquitectónico en `docs/architecture/`.
6. Historial Git local, padres de merges, ramas y árbol de trabajo.
7. Suites Django y Angular, `manage.py check`, comprobación de migraciones, compilación Angular y prueba de migración sobre SQLite limpia.
8. Recorrido GUI black-box y artefactos de captura de la sesión de auditoría.

Los planes y sus checkboxes se usaron como fuente contractual, pero **no se actualizaron**, de acuerdo con el alcance solicitado. Su desalineación con el estado real se conserva como brecha documental.

### 2.3 Método y escala

Se aplicó triangulación entre:

- **Contrato:** historia, CA y reglas en planes.
- **Implementación:** modelos, serializers, permisos, vistas, rutas y componentes.
- **Prueba:** tests unitarios/integrados y validaciones de build/migración.
- **Comportamiento observable:** GUI black-box sobre los recorridos integrados.

Estados usados:

- **Cumple:** el CA está implementado y respaldado por evidencia ejecutable u observable.
- **Parcial:** existe implementación útil, pero falta una parte del CA o su verificación integral.
- **No verificable:** no hubo evidencia suficiente para confirmar ni refutar el CA en este corte.

## 3. Historial y condiciones de integración

### 3.1 Conciliación con `origin/Development`

La base local de Sprint 3 se construyó sobre ramas **apiladas**: cada rama de HU podía contener las anteriores y no era seguro fusionarlas como si fueran ramas independientes creadas todas desde la misma base. Para evitar omitir trabajo remoto o reintroducir versiones antiguas, primero se respaldó el estado local de `Development`, se concilió explícitamente con `origin/Development` y luego se integraron las puntas de Sprint 3 en orden de dependencia.

Secuencia auditada:

| Hash | Operación | Resultado relevante |
|---|---|---|
| `72de5f2` | Merge de `origin/Development` antes de Sprint 3 | Concilió código remoto y local; resolvió solapamientos en acuerdos y expediente. |
| `a86f490` | Merge HU-15 | Avance de tesis: API, modelos de frontend, modal y pruebas. |
| `76851d5` | Merge HU-21 | Carga documental, validación de actividad e integración UI. |
| `e32f5cd` | Merge HU-22 | Evidencia por DOI/URL y validaciones de esquemas. |
| `65a41af` | Merge HU-23 | Servicio/endpoint de timeline, componente, filtros y pruebas. |
| `027613a` | Merge HU-25 | Servicio/endpoint de alertas, badge de AppShell, banners y pruebas. |
| `f9d8078` | Corrección de estabilización | Corrigió regresiones temporales y specs de acuerdos vencidos. |

Los conflictos se concentraron en `agreements-list.ts` y `student-overview.*`, puntos naturales de convergencia de varias HU. La estrategia fue preservar las capacidades acumuladas, no elegir una rama y descartar las demás.

**Control de entrega:** el trabajo permaneció en `integration/sprint3-development`; no se cambió de rama, no se creó commit durante la elaboración de este informe y **no hubo push**. En el corte, la rama no tenía upstream remoto publicado. El árbol ya contenía `.kilo/` sin seguimiento; no se modificó ni se incluyó en el informe como producto.

## 4. Resultados objetivos de validación

| Validación | Resultado | Observación |
|---|---|---|
| Django | **121 tests OK** | `Ran 121 tests ... OK`; system check sin incidencias durante la suite. |
| Angular | **81 tests OK** | Suite Karma/Angular final correcta. |
| Angular build | **OK** | Generación de bundle completada; hay warnings de budgets, no error de compilación. |
| `manage.py check` | **OK** | `System check identified no issues (0 silenced)`. |
| `makemigrations --check --dry-run` | **OK** | `No changes detected`. |
| Migración SQLite limpia | **OK** | Cadena aplicada/verificada hasta `[X] 0013_alter_tutoringsession_proxima_reunion_notas`. |
| `git diff --check` final | **OK** | Sin errores de espacios en blanco. |

### 4.1 Presupuestos de Angular

La compilación produjo **591.15 kB** de bundle inicial frente al warning budget de **500.00 kB**. También excedieron el warning budget de estilo por componente de 4.00 kB:

- `home.scss`: **8.19 kB**.
- `student-overview.scss`: **9.84 kB**.
- `agreements-list.scss`: **6.33 kB**.

El build es utilizable porque no alcanzó los umbrales de error, pero estos warnings son deuda técnica y no deben normalizarse.

## 5. Prueba GUI black-box

### 5.1 Resultados confirmados

| Recorrido | Resultado | Evidencia observable |
|---|---|---|
| Login con credenciales válidas | **Pass** | Se accedió a la aplicación y al shell autenticado. |
| Logout | **Pass** | La UI limpió la sesión y volvió al acceso público. |
| Dashboard de coordinador | **Pass** | Se mostró resumen operativo y navegación. |
| Padrón de estudiantes | **Pass** | Listado y acceso a expediente disponibles. |
| Expediente | **Pass** | Resumen, semestre, comité, tutorías y acuerdos visibles. |
| Alertas | **Pass** | Badge en sidebar/AppShell y banner de alertas visibles. |
| Acciones del expediente | **Pass de presencia** | Se observaron resumen, semestres, comité, tutorías, acuerdos, avance y trigger de evidencia. |
| Timeline | **Parcial** | Endpoint/backend y pestaña integrada confirmados; el click del locator agotó tiempo. |

Capturas relevantes:

- Login: `/home/alan/.zcode/cli/artifacts/sess_6b7f1ae3-4182-4bd6-b1aa-ade190bc04c6/call_mbZ6g4Cy5owX5FFG6b2YOGH9-tool-result-0add8a16-f576-4892-aaca-27559d2dcfe5.png`
- Dashboard: `/home/alan/.zcode/cli/artifacts/sess_6b7f1ae3-4182-4bd6-b1aa-ade190bc04c6/call_Xsgi7QnguRM1w6vuTFqWbm5y-tool-result-51b8df38-0f24-436d-8056-fd9d6e587eca.png`
- Expediente: `/home/alan/.zcode/cli/artifacts/sess_6b7f1ae3-4182-4bd6-b1aa-ade190bc04c6/call_2uphpacpvza7uJkHqxQFeZjM-tool-result-fe173607-79e5-43b4-8291-c123587ccf3b.png`
- Alertas: `/home/alan/.zcode/cli/artifacts/sess_6b7f1ae3-4182-4bd6-b1aa-ade190bc04c6/call_1cnTcpOMMGrvVlftCbrQerpF-tool-result-0d791860-d759-4c12-9f00-489d5860617b.png`

### 5.2 Incidencia de setup del timeline

Una primera prueba del timeline devolvió error porque el navegador apuntaba a servidores levantados con código anterior a la integración. Ese resultado queda **invalidado por setup** y no se considera defecto del producto auditado. Tras reiniciar/confirmar el stack integrado, se verificaron el endpoint backend y la presencia de la pestaña del timeline. Sin embargo, el locator del navegador agotó el tiempo al intentar hacer click, por lo que el filtrado visual no pudo verificarse completamente por interacción black-box.

Esto no elimina la evidencia estática y automatizada: existen agregación y autorización en backend, componente Angular, botones de filtro por tipo y tratamiento `prefers-reduced-motion` (`shared/timeline.ts:11-95`, `shared/timeline.scss:9-32`, `test_hu23.py:79-133`). El dictamen de HU-23 permanece **Parcial** por la verificación GUI incompleta, no por ausencia del desarrollo.

## 6. Matriz global por Historia de Usuario

| HU | Estado | Resumen de CA | Evidencia principal |
|---|---|---|---|
| HU-01 Autenticarse | **Parcial** | Login, rechazo genérico, refresh, `/me` y logout funcionales; logout invalida refresh, no el access token emitido. | `views.py:76-108`; `auth.service.ts:31-82`; `tests.py`; `login.spec.ts`, `auth.service.spec.ts`; GUI login/logout. |
| HU-02 Acceso por rol | **Cumple** | Cinco roles, permisos global/propio/asignado, guardas y revalidación de sesión presentes. | `models.py:28-68`; `permissions.py:1-54`; `views.py:229-311`; `auth.guard.spec.ts`; `tests.py`. |
| HU-03 Registrar estudiante | **Cumple** | Datos mínimos, matrícula única case-insensitive y expediente inmediato. | `models.py:70-87`; `serializers.py:451-518`; migración `0006`; `tests.py`; `registro-estudiante.*`. |
| HU-04 Asignar comité | **Cumple** | Comité agrupado, roles compatibles, vínculo al expediente y consumo por tutorías. | `models.py:106-143`; `serializers.py:255-290`; `views.py:179-219`; `committee-management.spec.ts`; pruebas integradas. |
| HU-05 Gestionar semestres | **Cumple** | Rango 1–6, pertenencia, coherencia temporal y gestión restringida. | `models.py:90-104`; `serializers.py:705+`; `views.py:571-648`; pruebas integradas; `semester-form.ts`. |
| HU-06 Consultar expediente | **Parcial** | Resumen, semestre, asesores, tutoría, acuerdos y avance presentes; actividad reciente depende de datos HU de Sprint 4. | `views.py:229-264`; `serializers.py:301-444`; `student-overview.*`; GUI expediente. |
| HU-07 Registrar tutoría | **Cumple** | Estudiante/semestre activo, fechas, resumen, creador y permisos relacionales cubiertos. | `serializers.py:521-567`; `views.py:339-395`; `test_hu07.py:29-104`; `tutoring-form.spec.ts`. |
| HU-08 Asistencia | **Parcial** | Pertenencia, no duplicado y catálogo implementados; autorización fina de escritura anidada debe vigilarse. | `models.py:164-179`; `serializers.py:643-657`; `views.py:399-407`; `test_hu08.py`; suite completa. |
| HU-09 Observaciones | **Parcial** | Múltiples observaciones, autor y fecha inmutables; no se evidenció enforcement completo de longitud 10–5000. | `models.py:182-189`; `serializers.py:631-640`; `views.py:409-417`; `test_hu09.py`. |
| HU-10 Próxima reunión | **Cumple** | Fecha futura/posterior, notas condicionadas, actualización posterior y máximo 500 implementados. | `models.py:146-161`; migración `0013`; `serializers.py:553-560`; `test_hu10.py:47-148`; `tutoring-conditions.spec.ts:97-100`. |
| HU-11 Registrar acuerdos | **Parcial** | Asociación, multiplicidad, estado inicial, creador y auditoría existen; longitud contractual 10–1000 no queda aplicada integralmente. | `models.py:191-221`; `serializers.py:584-628`; `views.py:419-427`; `test_hu11.py`. |
| HU-12 Responsable/fecha | **Parcial** | Alta valida pertenencia y fecha; no se encontró flujo general de actualización posterior con auditoría de responsable/fecha. | `serializers.py:618-628`; `test_hu12.py`; `AgreementViewSet` en `views.py:443-505`. |
| HU-13 Estados de acuerdos | **Parcial** | Transiciones, vencimiento derivado, conclusión y bitácora cubiertos; endpoint limita cambio al responsable, mientras el plan también menciona coordinador. | `models.py:191-221`; `views.py:478-501`; `test_hu13.py`; `agreements-list.spec.ts`. |
| HU-14 Consultar acuerdos | **Cumple** | Filtros combinables, vencido derivado, paginación, alcance RBAC y audit-log de lectura. | `views.py:443-505`; `test_hu14.py:71-104`; `agreements-list.spec.ts`. |
| HU-15 Avance de tesis | **Cumple** | Pertenencia, 0–100, componentes, actor/fecha, historial y autorización relacional. | `models.py:223-233`; `serializers.py:47-91`; `views.py:508-530`; `test_hu15.py:31-81`; `thesis-progress-form.ts`. |
| HU-21 Evidencia documental | **Parcial** | Asociación, actividad válida, 15 MiB, firma/MIME y limpieza transaccional cubiertos; descarga protegida dedicada ausente. | `serializers.py:93-179`; `views.py:533-560`; `test_hu21.py:36-92`; `evidence-upload.spec.ts`. |
| HU-22 Evidencia DOI/URL | **Cumple** | Tipo, asociaciones, URL/DOI, máximo 500, exclusión de archivo y bloqueo de esquemas peligrosos cubiertos. | `serializers.py:93-179`; `test_hu22.py:41-90`; `evidence-upload.spec.ts`. |
| HU-23 Timeline | **Parcial** | Cuatro fuentes, orden, semestres, filtros y RBAC implementados; click/filtro GUI quedó parcialmente verificable. | `timeline_service.py:1-98`; `views.py:314-336`; `test_hu23.py:79-133`; `timeline.ts:11-95`; `timeline.scss:32`. |
| HU-25 Alertas | **Cumple** | Clasificación temporal, alcance relacional/global y presentación interna en badge y banners confirmadas. | `alert_service.py:10-79`; `views.py:430-440`; `test_hu25.py:50-109`; `app-shell.html:15`; `home.html:3-14`; GUI alertas. |

## 7. Evaluación criterio por criterio

### 7.1 Sprint 1

#### HU-01 — Autenticarse — Parcial

- **CA-01.1, acceso con usuario activo y credenciales válidas: Cumple.** `LoginView` emite access/refresh y usuario (`views.py:76-87`); login GUI correcto.
- **CA-01.2, rechazo sin revelar el dato incorrecto: Cumple.** El serializer de login centraliza el fallo y las pruebas de autenticación pasan (`serializers.py:685+`, `tests.py`).
- **CA-01.3, cierre de sesión sin acceso a recursos: Parcial.** La UI elimina tokens y el servidor agrega el refresh a blacklist (`views.py:90-101`, `auth.service.ts:31-38,75-82`). Un access token previamente emitido continúa válido hasta expirar por diseño JWT. Es una decisión técnica legítima, pero no equivale a revocación inmediata de access en servidor.
- **Brecha de evidencia:** Sprint 1 no dispone de planes individuales ni archivos dedicados `test_hu01.py` a `test_hu06.py`; la cobertura está distribuida en `tests.py` y specs de frontend.

#### HU-02 — Controlar acceso por rol — Cumple

- **CA-02.1, expediente propio/autorizado: Cumple.** Querysets por usuario y membresía (`views.py:236-260,282-295`).
- **CA-02.2, tutorías de estudiantes asociados: Cumple para alta y mutación principal.** Validación relacional en `perform_create/update/destroy` (`views.py:375-395`).
- **CA-02.3, coordinador global y cuentas sólo admin: Cumple.** Permisos separados en `permissions.py:24-54`; endpoints administrativos restringidos.
- **CA-02.4, revalidación `/auth/me`: Cumple.** Ruta en `urls.py:59` y pruebas de guardas/servicio.
- **CA-02.5, cinco roles institucionales: Cumple.** Enum en `models.py:28-45`.

#### HU-03 — Registrar estudiante — Cumple

- **CA-03.1: Cumple.** Matrícula, programa y fecha de ingreso son parte del contrato de alta (`serializers.py:451-458`).
- **CA-03.2: Cumple.** Unicidad exacta y case-insensitive (`models.py:72,83`; migración `0006`; `serializers.py:478-482`).
- **CA-03.3: Cumple.** La respuesta del alta usa el serializer de expediente (`views.py:297-303`).

#### HU-04 — Asignar comité académico — Cumple

- **CA-04.1: Cumple.** Roles/cargos compatibles y restricciones del agregado están modelados (`models.py:106-143`, `serializers.py:255-290`).
- **CA-04.2: Cumple.** `AcademicCommittee` pertenece a un estudiante y las memberships al comité.
- **CA-04.3: Cumple.** Los participantes de tutoría se validan contra la membresía (`serializers.py:649-657`).
- **Observación:** errores de restricciones complejas del lote y coherencia de seeds deben mantenerse bajo vigilancia, aunque la suite integrada actual pasa.

#### HU-05 — Gestionar semestres — Cumple

- **CA-05.1: Cumple.** `numero` se restringe a 1–6 y es único por estudiante (`models.py:90-104`).
- **CA-05.2: Cumple en las actividades incluidas en el corte.** Tutorías, tesis y evidencias referencian semestre.
- **CA-05.3: Cumple.** Serializers verifican que el semestre pertenezca al estudiante; endpoints son anidados (`urls.py:68-69`).

#### HU-06 — Consultar expediente — Parcial

- **Semestre, asesor/coasesor, última tutoría, acuerdos abiertos y avance de tesis: Cumple.** Agregados en `serializers.py:342-419` y UI en `student-overview.html`.
- **Actividad académica reciente: Parcial.** El serializer está preparado para publicaciones, eventos y estancias (`serializers.py:421-444`), pero la disponibilidad de datos depende de HU de Sprint 4. No se afirma cumplimiento funcional completo antes de esas historias.
- **GUI:** expediente y sus secciones principales visibles.

### 7.2 Sprint 2

#### HU-07 — Registrar sesión de tutoría — Cumple

- **CA-07.1:** estudiante existente y semestre activo/del estudiante, validado en `serializers.py:535-541`.
- **CA-07.2:** fecha no pasada ni anterior al semestre, `serializers.py:542-546`.
- **CA-07.3:** resumen significativo 10–2000, `serializers.py:547-552`.
- **CA-07.4:** acceso relacional y coordinador, `views.py:362-395`; pruebas negativas/positivas en `test_hu07.py:29-98`.
- **CA-07.5:** `created_by` se toma del request y es read-only en lectura, `serializers.py:563-567,660-682`.

#### HU-08 — Registrar asistencia — Parcial

- **CA-08.1 y CA-08.2: Cumple.** Sólo estudiante o membresía del comité (`serializers.py:649-657`).
- **CA-08.3: Cumple.** Restricción única y validación previa (`models.py:179`, `serializers.py:651-652`).
- **CA-08.4: Cumple.** `rol_en_sesion` usa choices (`models.py:164-173`).
- **CA-08.5: Parcial.** La acción anidada hereda el viewset y las pruebas completas pasan, pero no hay una comprobación objeto-acción explícita dentro del POST `participants` (`views.py:399-407`). La autorización de escritura de tutorías debe seguir vigilándose para impedir ampliaciones accidentales de rol.

#### HU-09 — Registrar observaciones — Parcial

- **CA-09.1, CA-09.2 y CA-09.5: Cumple.** La relación admite múltiples observaciones y servidor fija autor/fecha como sólo lectura (`serializers.py:631-640`, `views.py:409-417`).
- **CA-09.3: Parcial.** No se encontró validación explícita que imponga 10–5000 caracteres a `observaciones_detalladas`; el modelo usa `TextField` (`models.py:182-189`).
- **CA-09.4: Parcial.** El alcance relacional del queryset protege la sesión, pero falta una guarda específica de escritura en la acción anidada. La suite no detecta regresiones actuales, pero el CA merece prueba negativa dedicada.

#### HU-10 — Programar próxima reunión — Cumple

- **CA-10.1 y CA-10.2:** fecha posterior a la sesión y al día actual (`serializers.py:553-558`).
- **CA-10.3:** notas requieren fecha (`serializers.py:559-560`).
- **CA-10.4:** máximo **500** sí está implementado en modelo y migración (`models.py:158`; `0013...py:13`), además de frontend (`tutoring-conditions.ts:121-131,178`) y tests (`test_hu10.py:143-148`). La observación documental previa que cuestionaba este límite queda **resuelta**.
- **CA-10.5:** no se añadió calendario externo, conforme al alcance.
- **CA-10.6:** alta y `PATCH` están cubiertos (`test_hu10.py:75-102`).

#### HU-11 — Registrar acuerdos — Parcial

- **CA-11.1, CA-11.2, CA-11.4 y CA-11.5: Cumple.** El acuerdo hereda sesión/estudiante, permite multiplicidad, inicia pendiente y guarda creador/fecha (`models.py:191-213`, `views.py:419-427`).
- **CA-11.6: Cumple en el flujo integrado.** Existe `AgreementAuditLog` y las pruebas de estado/auditoría pasan.
- **CA-11.3: Parcial.** El serializer sólo comprueba descripción no vacía (`serializers.py:613-616`); no se observa enforcement de 10–1000 y `test_hu11.py` usa descripciones de dos caracteres. Es una brecha real entre plan y código.

#### HU-12 — Asignar responsable y fecha límite — Parcial

- **CA-12.1 a CA-12.3: Cumple.** Responsable vinculado y fecha no anterior a tutoría (`serializers.py:618-628`, `test_hu12.py`).
- **CA-12.4: Parcial.** El alta permite asignación, pero `AgreementViewSet` sólo ofrece list/retrieve y acción de estado; no se encontró actualización general de responsable/fecha (`views.py:443-505`).
- **CA-12.5: Parcial.** No puede confirmarse bitácora de cambios de responsable/fecha porque ese flujo posterior no está expuesto.

#### HU-13 — Gestionar estados — Parcial

- **CA-13.1, CA-13.2, CA-13.4 y CA-13.5: Cumple.** Transiciones lineales, vencido derivado, log y fecha de conclusión están en `views.py:478-501` y `models.py:191-221`.
- **CA-13.3: Parcial.** El plan autoriza responsable o coordinador; el endpoint comprueba exclusivamente `agreement.responsable_id` (`views.py:481-483`). Debe alinearse el código o corregirse formalmente el contrato.

#### HU-14 — Consultar acuerdos pendientes y vencidos — Cumple

- **CA-14.1:** filtros por estudiante, responsable, semestre, estado/vencido y fechas (`views.py:453-473`).
- **CA-14.2:** paginación DRF (`views.py:443-446`).
- **CA-14.3:** alcance global o por relación (`views.py:448-452`).
- **CA-14.4:** subrecurso `audit-log` de lectura (`views.py:503-505`).
- Pruebas específicas en `test_hu14.py:71-104` y specs de listado Angular.

### 7.3 Sprint 3

#### HU-15 — Registrar avance de tesis — Cumple

- **CA-15.1:** estudiante/semestre coherentes.
- **CA-15.2:** porcentaje 0–100 (`models.py:226`; `test_hu15.py:39-45`).
- **CA-15.3:** componentes estructurados validados (`serializers.py:47-91`; `test_hu15.py:31-52`).
- **CA-15.4:** usuario y fecha controlados por servidor (`views.py:513-518`).
- **CA-15.5:** cada POST crea entrada histórica; `latest` sólo consulta la más reciente.
- **CA-15.6:** estudiante o comité autorizado (`views.py:513-518`; `test_hu15.py:58-63`).

#### HU-21 — Cargar evidencia documental — Parcial

- **CA-21.1: Cumple.** Estudiante, semestre, tipo e id de actividad se validan, incluidas pertenencia y existencia (`serializers.py:131-179`; `test_hu21.py:50-77`).
- **CA-21.2: Cumple.** Límite exacto 15 MiB, extensión, MIME y firma binaria (`serializers.py:93-130`; `test_hu21.py:36-49`).
- **CA-21.3: Parcial.** Listado y carga tienen alcance relacional, pero no existe endpoint dedicado de descarga autorizada. La URL del `FileField` puede exponerse directamente según el servidor de medios (`settings.py:167-168`; `timeline_service.py:92-93`).
- **CA-21.4: Cumple.** Hay limpieza ante fallo de persistencia (`views.py:552-559`; `test_hu21.py:84-92`).

#### HU-22 — Registrar evidencia DOI/URL — Cumple

- **CA-22.1 y CA-22.2:** tipo y relaciones obligatorias cubiertos.
- **CA-22.3:** URL/DOI y máximo 500 en modelo/serializer (`models.py:254`; `serializers.py:93-179`).
- **CA-22.4:** archivo incompatible con enlace, probado en `test_hu22.py:70-75`.
- **CA-22.5:** esquemas inseguros y texto arbitrario rechazados (`test_hu22.py:56-61`).

#### HU-23 — Visualizar trayectoria longitudinal — Parcial

- **CA-23.1: Cumple.** Tutorías, acuerdos, tesis y evidencia agregados y ordenados (`timeline_service.py:1-98`; `test_hu23.py:79-89`).
- **CA-23.2: Cumple en el contrato implementado.** Se exponen tipo, fecha, título, descripción, actor y metadatos/enlaces (`test_hu23.py:91-102`).
- **CA-23.3: Cumple.** Respuesta y UI agrupan por semestre (`timeline.ts:27-60`).
- **CA-23.4: Parcialmente verificable.** Botones y filtrado dinámico existen (`timeline.ts:18-23,72-87`) y el build/tests pasan; el click del navegador agotó tiempo. El CSS respeta reducción de movimiento (`timeline.scss:32`).
- **CA-23.5: Cumple.** Propietario, comité y coordinador; ajenos reciben 404 (`views.py:314-336`; `test_hu23.py:104-133`).

#### HU-25 — Alertas de acuerdos — Cumple

- **CA-25.1: Cumple para alertas accionables del corte.** Servicio clasifica vencidos y próximos a siete días; pruebas cubren límites, exclusión de concluidos y orden (`alert_service.py:10-79`; `test_hu25.py:50-78`).
- **CA-25.2: Cumple.** Hay alertas internas, sin integrar canales externos. El **AppShell sí incluye badge** (`app-shell.html:15`, `app-shell.ts:42`) y la UI incluye banners (`home.html:3-14`, `student-overview.html:21-25`). Ambos fueron visibles en GUI.
- **CA-25.3: Cumple.** Alcance por responsable/relación y vista global del coordinador (`test_hu25.py:79-103`).

## 8. Correcciones realizadas durante la auditoría/integración

El commit de estabilización `f9d8078` y la conciliación previa resolvieron defectos que habrían invalidado el corte:

1. **Conflicto/indentación de pruebas HU-13:** se corrigió la estructura del test para que la suite ejerciera realmente transiciones y vencimientos.
2. **Fechas de tests caducadas:** se reemplazaron supuestos temporales frágiles por fechas coherentes con el corte, evitando fallos por paso del tiempo.
3. **Spec de acuerdos vencidos:** se alineó el frontend con el comportamiento de acuerdos cuyo estado efectivo está vencido.
4. **Query filters y guardas de vencidos:** la conciliación conservó los filtros combinados y el bloqueo coherente de mutaciones vencidas.
5. **Backup SQLite:** los respaldos SQLite quedaron cubiertos por `*.sqlite3`/`*.db` en `.gitignore`; no deben entrar al control de versiones.
6. **HU-10, 500 caracteres:** la auditoría confirmó que el límite existe en `models.py` y migración `0013`; la desviación documental queda resuelta sin cambiar checkboxes.

## 9. Hallazgos pendientes genuinos

### Alta prioridad

1. **Descarga protegida de evidencia.** HU-21 no tiene una vista de descarga que vuelva a autorizar al usuario y sirva el archivo de forma controlada. Debe evitarse depender de una URL `/media/` directa.
2. **Alinear permisos de tutoría por acción.** Aunque las 121 pruebas pasan, `participants`, `observations` y `agreements` deberían contar con pruebas negativas explícitas por cargo/acción y, si corresponde, guardas objeto-acción directas.
3. **Cerrar contratos incompletos de Sprint 2.** Implementar o renegociar formalmente: longitud de observaciones HU-09, longitud 10–1000 de acuerdos HU-11, edición/auditoría de responsable/fecha HU-12 y facultad del coordinador en HU-13.
4. **Semántica de logout JWT.** Documentar que se revoca refresh, no access inmediato, o incorporar una estrategia de revocación/vida corta coherente con CA-01.3. No debe afirmarse revocación total actual.

### Prioridad media

5. **Accesibilidad E2E de modales.** Hay `role="dialog"`, `aria-modal`, Escape en algunas vistas y retorno de foco en acuerdos, pero no se verificaron de extremo a extremo ciclo de foco, tabulación, foco inicial y retorno para todos los modales del expediente.
6. **Timeline GUI.** Repetir la prueba black-box con locator estable y verificar cada filtro, estado vacío y navegación por teclado. La implementación existe, pero el click quedó bloqueado por timeout.
7. **Budgets Angular.** Reducir bundle inicial y estilos de `home`, `student-overview` y `agreements-list`, o justificar/ajustar presupuestos mediante una decisión técnica revisada.
8. **Actividad académica reciente.** La sección de HU-06 está preparada, pero su evidencia funcional depende de historias de productos/eventos/estancias de Sprint 4.

### Gobernanza y limpieza

9. **DoD y markdown desactualizados.** El estado documental no refleja completamente el código integrado; los planes conservan checkboxes sin cerrar y `implementation_status.md` mantiene un corte anterior. No se actualizaron deliberadamente en esta auditoría.
10. **Artefactos de medios versionados.** Hay archivos de prueba bajo `Backend/nexus/media/evidence/` incorporados al historial. Deben eliminarse del seguimiento y la ruta de media debe ignorarse o limpiarse sin borrar evidencia necesaria fuera del repositorio.
11. **Ruta legacy de tutorías.** Sigue disponible `POST /api/v1/tutoring/` como alias (`urls.py:70`) además de `/api/v1/tutoring-sessions/`. Debe definirse fecha de retiro y migrar consumidores.
12. **Planes/tests de Sprint 1.** No existen planes individuales ni `test_hu01.py` a `test_hu06.py`; la cobertura integrada existe, pero la trazabilidad por HU es inferior a la de Sprints 2–3.

## 10. Conclusión y prioridades recomendadas

El corte `f9d8078` es una integración estable y demostrable: backend, frontend, migraciones y recorridos principales están operativos. La conciliación con `origin/Development` y el orden de ramas apiladas evitaron perder funcionalidades convergentes del expediente. HU-25 debe considerarse implementada —badge y banners existen tanto en código como en UI— y HU-23 no debe marcarse como ausente: tiene servicio, endpoint, componente, filtros y adaptación a movimiento reducido; su limitación es la verificación GUI parcial del click.

No obstante, el producto todavía no debe declararse con “todos los CA cumplidos”. Las prioridades para el siguiente ciclo son:

1. proteger la descarga de evidencias y reforzar autorización por acción;
2. resolver las brechas contractuales HU-09/HU-11/HU-12/HU-13;
3. completar E2E de accesibilidad y timeline;
4. reducir budgets y limpiar media versionada;
5. actualizar DoD/estado/planes cuando el responsable documental decida cerrar formalmente los criterios.

Con esas acciones, el equipo puede convertir un MVP integrado y estable en un corte plenamente trazable, endurecido y listo para promoción controlada.
