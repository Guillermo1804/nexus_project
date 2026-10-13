# HU-17 — Correcciones de Backend y Respaldo de Funcionalidad Existente

**Fecha:** 12 de octubre de 2026  
**Repositorio:** `nexus_project` (Backend Django)

## Resumen

Tras la implementación de la HU-17 — Registro de Publicaciones Científicas — se detectó la pérdida funcional de los endpoints y vistas heredados de los Sprint 1-3. El commit `dd093ed Historia HU17` sobrescribió `views.py`, `serializers.py`, `permissions.py` y `urls.py`, dejando la aplicación sin rutas críticas de autenticación, estudiantes, tutorías, acuerdos, evidencias, etc., y con un `NameError` en arranque:
```
NameError: name 'LoginView' is not defined
```

Se recuperó la base funcional, se integró HU-17 de forma compatible y se validó toda la suite de pruebas.

## Errores Identificados

### 1. Carga de URL fallida por imports ausentes
- `urls.py` referenciaba `LoginView`, `LogoutView`, `MeView`, `UserRoleListView`, `UserRoleUpdateView`, `InstitutionalUserCreateView`, `CommitteeAssignmentListCreateView`, `CommitteeAssignmentUpdateView`, `AdminStudentListView`, `AdminAuditLogListView`, `StudentRecordView`, `StudentSemesterListCreateView`, `StudentSemesterDetailView`, `TutoringSessionViewSet` sin importarlas en `views.py`.
- `manage.py check` y `manage.py test` abortaban con `NameError` al importar `urls.py`.

### 2. Pérdida de modelos de producción académica
- `AcademicEvent`, `ResearchStay` y `OtherProduct` fueron eliminados en la transición a HU-17.
- `serializers.py` y `views.py` hacen referencia a estos modelos (`academicevent_set`, `researchstay_set`) en `StudentRecordSerializer` y prefetch de `GlobalAcademicOverviewView`.

### 3. Incompatibilidad de esquema de Publication
- HU-17 renombró campos en la capa de API (`autores`, `revista`, `doi`, `evidencia`) mientras el esquema de base de datos migraba desde `autores_texto`, `revista_editorial`, `doi_url`.
- `populate_data.py` usa nombres de campo antiguos y valores de `tipo_producto` libre, incompatibles con `PublicationType.choices`.

### 4. Validaciones HU-17 ausentes
- No se validaba que `estado` `ACEPTADO`/`PUBLICADO` requiera `doi` **o** `evidencia`.
- No se bloqueaban fechas de publicación futuras.
- No existía `PublicationViewSet` con permisos ni registro en router.

### 5. Pruebas HU-17 rotas
- `test_hu17.py` enviaba `semester: 1` sin crear el semestre de prueba, provocando `ValueError` de clave foránea.
- Serializador no mapeaba nombres de API a nombres de columna.

## Correcciones Aplicadas

### Backend
**models.py**
- Restaurada la jerarquía `AcademicOutputBase` con campo `evidencia`.
- Reagregados `AcademicEvent`, `ResearchStay`, `OtherProduct` (esquema 0001 inicial).
- `Publication` mantiene campos de migración (`autores_texto`, `revista_editorial`, `doi_url`) y `clean()` valida reglas de HU-17.
- `PublicationType` y `PublicationStatus` como `TextChoices`.

**serializers.py**
- Restaurados serializers legacy (`StudentCreateSerializer`, `AgreementSerializer`, `ThesisProgressSerializer`, etc.).
- `PublicationSerializer` expone API con nombres HU-17 vía `source`:
```python
autores = CharField(source='autores_texto')
revista = CharField(source='revista_editorial')
doi = CharField(source='doi_url')
```
- `validate()` impone: DOI/evidencia obligatorio para `ACEPTADO`/`PUBLICADO` y fecha no futura.

**views.py**
- Restauradas vistas Sprint 1-3: `LoginView`, `LogoutView`, `MeView`, `UserRoleListView/UpdateView`, `InstitutionalUserCreateView`, `CommitteeAssignmentListCreateView/UpdateView`, `AdminStudentListView`, `AdminAuditLogListView`, `StudentRecordView`, `StudentSemesterListCreateView/DetailView`, `TutoringSessionViewSet`, `AgreementViewSet`, `EvidenceViewSet`, `ThesisProgressViewSet`, `GlobalAcademicOverviewView`, `TimelineView`.
- Agregado `PublicationViewSet` con queryset filtrado por `academic.read.global` / `records.read.assigned` / propia y `perform_create` con `can_access_student`.
- `can_access_student()` helper reutilizado.

**urls.py**
- Restaurado `router.register` para estudiantes, tutorías, acuerdos, evidencias, tesis.
- Agregado `router.register(r'academic-output/publications', PublicationViewSet, basename='publications')`.
- Rutas legadas de autenticación y administración restauradas.

**permissions.py**
- Restauradas clases `CanAssignRoles`, `CanReadGlobalAcademics`, `CanCreateTutoring`, `CanManageCommittee`, `CanManageSemesters` y `permissions_for_user`.

**management/commands/populate_data.py**
- `PLAN_PRODUCCION` actualizado con valores de `PublicationType` válidos (`JCR`, `SCOPUS`, `CONACYT`, `OTRO_INDEXADO`).
- Campos `autores_texto`, `revista_editorial`, `doi_url` mantenidos.

**tests/test_hu17.py**
- `setUp` crea `Semester` y usa `self.semester.id` en payloads.
- Se importó `Semester`.

## Validación

- `python manage.py check` → *System check identified no issues*.
- `python manage.py test nexus` → **144 tests OK**.
- `nexus.test_hu17` → 3 tests OK:
  - Creación válida de publicación con DOI/evidencia → 201 Created.
  - Creación sin DOI/evidencia con estado `PUBLICADO` → 400 Bad Request.
  - Fecha futura → 400 Bad Request.

## Archivos Tómados/Tocados

- `Backend/nexus/nexus/models.py`
- `Backend/nexus/nexus/serializers.py`
- `Backend/nexus/nexus/views.py`
- `Backend/nexus/nexus/urls.py`
- `Backend/nexus/nexus/permissions.py`
- `Backend/nexus/nexus/management/commands/populate_data.py`
- `Backend/nexus/nexus/test_hu17.py`

## Resultado

HU-17 queda operativa sin romper funcionalidad existente. Los endpoints heredados vuelven a responder y las nuevas publicaciones científicas cumplen criterios de aceptación y reglas de negocio.
