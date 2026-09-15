# HU-22 — Plan de Implementación: Registrar Evidencia mediante Enlace (DOI / URL)

## Metadatos
- **ID:** HU-22
- **Épica:** E07 — Evidencias
- **Sprint:** Sprint 3
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Medium (Valor Medio)
- **Story Points:** 3 SP
- **Prerrequisitos de Dominio:** HU-01 (Autenticación), HU-03 (Registrar estudiante), HU-21 (Cargar evidencias)

---

## 1. Definición y Objetivo
**Como** estudiante doctoral o integrante del comité tutorial,  
**quiero** registrar un identificador persistente digital (DOI) o un enlace web permanente (URL) como evidencia académica,  
**para** respaldar publicaciones, repositorios de código abierto, patentes o actas en línea sin necesidad de consumir almacenamiento de archivos locales en el servidor.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-22.1:** La evidencia tipo enlace debe registrarse con `tipo = 'ENLACE_DOI'`.
- **CA-22.2:** Debe asociarse obligatoriamente a un estudiante, un semestre académico y una actividad académica concreta (`actividad_tipo` y `actividad_id`).
- **CA-22.3:** El campo `enlace_url` es obligatorio, no debe exceder 500 caracteres y debe validar formato estricto de URL válida (http/https) o formato de DOI estándar (`10.xxxx/...` o `https://doi.org/...`).
- **CA-22.4:** En este tipo de evidencia no se adjunta archivo local (`archivo_adjunto` permanece nulo).
- **CA-22.5:** El enlace debe verificarse a nivel sintáctico en el servidor para evitar esquemas peligrosos (`javascript:`, `file:`, `data:`).

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Registro de Enlace DOI/URL
- **Ruta:** `POST /api/v1/evidence/`
- **Content-Type:** `application/json`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "student": 4,
  "semester": 1,
  "tipo": "ENLACE_DOI",
  "actividad_tipo": "TESIS",
  "actividad_id": 9,
  "titulo": "Repositorio de datos experimentales en Zenodo",
  "descripcion": "Dataset reproducible con los registros crudos del análisis de muestras.",
  "enlace_url": "https://doi.org/10.5281/zenodo.1234567"
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 15,
  "student": 4,
  "semester": 1,
  "tipo": "ENLACE_DOI",
  "actividad_tipo": "TESIS",
  "actividad_id": 9,
  "titulo": "Repositorio de datos experimentales en Zenodo",
  "descripcion": "Dataset reproducible con los registros crudos del análisis de muestras.",
  "archivo_adjunto": null,
  "enlace_url": "https://doi.org/10.5281/zenodo.1234567",
  "fecha_carga": "2026-09-14",
  "created_by": 15
}
```

#### Respuestas de Error:
- `400 Bad Request`: Formato de URL/DOI inválido o esquema no permitido.
- `403 Forbidden`: Usuario no vinculado al expediente del estudiante.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Validaciones en `EvidenceSerializer`
```python
def validate_enlace_url(self, value):
    if not value:
        return value
    validador_url = URLValidator(schemes=['http', 'https'])
    try:
        validador_url(value)
    except ValidationError:
        # Validar si es formato DOI estándar sin esquema https://doi.org/
        if not re.match(r'^10\.\d{4,9}/[-._;()/:A-Za-z0-9]+$', value):
            raise serializers.ValidationError('Proporcione una URL válida (http/https) o un DOI estándar (ej. 10.1000/182).')
    return value
```

### 4.2. Pruebas Backend (`test_hu22.py`)
- Registro exitoso con URL HTTPS $\rightarrow$ `201 Created`.
- Registro exitoso con formato DOI directo $\rightarrow$ `201 Created`.
- Rechazo de esquema `javascript:` o texto arbitrario $\rightarrow$ `400 Bad Request`.
- Intento de omitir `enlace_url` cuando `tipo == 'ENLACE_DOI'` $\rightarrow$ `400 Bad Request`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Pestaña alternativa "Enlace externo / DOI" en el modal de evidencias:
  - Input para `enlace_url` con placeholder `"https://doi.org/10.xxxx/..."` o `"https://..."`.
  - Icono indicador del tipo de enlace detectado (DOI vs URL genérica).
  - Enlace de prueba rápida en una nueva pestaña antes de guardar.
- Renderizado en la lista de evidencias:
  - Icono de hipervínculo con `target="_blank"` y `rel="noopener noreferrer"`.
  - Botón de copiado rápido al portapapeles.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Atributo `target="_blank"` anunciado a lectores de pantalla mediante texto oculto `(se abre en una nueva pestaña)`.
- Indicador visual claro de foco en el botón de copiado.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `POST /api/v1/evidence/` probado y validado para `tipo='ENLACE_DOI'`.
- [ ] Validación de esquemas seguros HTTP/HTTPS y patrones DOI en backend.
- [ ] Pruebas unitarias backend (`test_hu22.py`) y frontend aprobadas al 100%.
- [ ] Renderizado seguro de enlaces externos con `rel="noopener noreferrer"`.
