# HU-17 — Plan de Implementación: Registrar Publicaciones Científicas

## Metadatos
- **ID:** HU-17
- **Épica:** E06 — Trayectoria Académica
- **Sprint:** Sprint 4
- **Equipo Responsable:** Equipo 1
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-03 (Registrar estudiante), HU-05 (Gestionar semestres), HU-21 (Cargar evidencias)

---

## 1. Definición y Objetivo
**Como** estudiante doctoral o asesor tutor,  
**quiero** registrar los artículos científicos y capítulos derivados de la investigación doctoral,  
**para** evidenciar la producción científica formal exigida para la obtención del grado doctoral e integrarla al expediente y línea de tiempo.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-17.1:** Campos obligatorios de captura:
  - Título del artículo o publicación.
  - Lista completa de autores (incluyendo orden de autoría y afiliación).
  - Tipo de publicación (`JCR`, `SCOPUS`, `CONACYT`, `OTRO_INDEXADO`).
  - Nombre de la revista editorial o libro.
  - Estado del manuscrito (catálogo cerrado: `PREPARACION`, `ENVIADO`, `EN_REVISION`, `ACEPTADO`, `PUBLICADO`).
  - Semestre académico al que se atribuye la producción.
- **CA-17.2:** Si el estado es `ACEPTADO` o `PUBLICADO`, debe ser obligatorio proporcionar al menos una evidencia documental (`evidencia_id`) o identificador DOI/URL (`doi`).
- **CA-17.3:** La fecha de publicación o envío no puede ser posterior a la fecha actual del sistema.
- **CA-17.4:** Autorización: Solo el estudiante propietario y su comité tutorial pueden registrar o editar publicaciones.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Listar y Registrar Publicaciones
- **Rutas:**
  - `GET /api/v1/academic-output/publications/?student=4` (Paginado)
  - `POST /api/v1/academic-output/publications/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "student": 4,
  "semester": 2,
  "titulo": "Deep Fuzzy Reinforcement Learning for Adaptive Robotics Control",
  "autores": "Fuentes, D., Gómez, R., Soto, E.",
  "tipo": "JCR",
  "revista": "IEEE Transactions on Fuzzy Systems",
  "estado": "PUBLICADO",
  "fecha_publicacion": "2026-05-12",
  "doi": "https://doi.org/10.1109/TFUZZ.2026.123456",
  "evidencia": 15
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 5,
  "student": 4,
  "semester": 2,
  "titulo": "Deep Fuzzy Reinforcement Learning for Adaptive Robotics Control",
  "autores": "Fuentes, D., Gómez, R., Soto, E.",
  "tipo": "JCR",
  "revista": "IEEE Transactions on Fuzzy Systems",
  "estado": "PUBLICADO",
  "fecha_publicacion": "2026-05-12",
  "doi": "https://doi.org/10.1109/TFUZZ.2026.123456",
  "evidencia": 15,
  "evidencia_archivo": "http://localhost:8000/media/evidencias/2026/05/paper.pdf",
  "created_at": "2026-09-14T12:00:00Z"
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_publication`)
- Modelo: `Publication` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `student`: ForeignKey(`Student`, on_delete=CASCADE, related_name='publications')
  - `semester`: ForeignKey(`Semester`, on_delete=CASCADE)
  - `titulo`: CharField(max_length=255)
  - `autores`: TextField()
  - `tipo`: CharField(max_length=50, choices=PublicationType.choices)
  - `revista`: CharField(max_length=255)
  - `estado`: CharField(max_length=30, choices=PublicationStatus.choices, default='PREPARACION')
  - `fecha_publicacion`: DateField(null=True, blank=True)
  - `doi`: URLField(blank=True, default='')
  - `evidencia`: ForeignKey(`Evidence`, null=True, blank=True, on_delete=SET_NULL)

### 4.2. Serializers y Vistas
- `PublicationSerializer`: Validación de que `evidencia` o `doi` esté presente si `estado in ['ACEPTADO', 'PUBLICADO']`.
- `PublicationViewSet`: Paginado estándar DRF, permisos relacionales `can_access_student(..., write=True)`.

### 4.3. Pruebas Backend (`test_hu17.py`)
- Creación válida de publicación JCR en estado `PUBLICADO` con DOI $\rightarrow$ `201 Created`.
- Intento de marcar `PUBLICADO` sin DOI ni evidencia $\rightarrow$ `400 Bad Request`.
- Validación de fecha no futura $\rightarrow$ `400 Bad Request`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `PublicationFormComponent` (`src/app/academic-output/publication-form.ts`).
  - Select para tipo (`JCR`, `Scopus`, `Conacyt`, `Otro`).
  - Select para estado con badges semafóricos (Gris: Preparación, Ámbar: En revisión, Verde: Publicado).
  - Campo DOI con enlace de prueba y selector de evidencia vinculada.
- Componente: `PublicationsListComponent` con cards de publicación estilizadas según el Design System.

---

## 6. Definition of Done (DoD)
- [ ] Endpoints `/api/v1/academic-output/publications/` implementados y probados.
- [ ] Validación de evidencia/DOI obligatoria para artículos aceptados/publicados.
- [ ] Pruebas unitarias backend (`test_hu17.py`) y frontend aprobadas al 100%.
- [ ] Integración en la pestaña "Producción Científica" del expediente del estudiante.
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
