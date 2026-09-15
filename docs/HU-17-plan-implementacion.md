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
