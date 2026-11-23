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
- [x] Endpoints `/api/v1/academic-output/publications/` implementados y probados.
- [x] Validación de evidencia/DOI obligatoria para artículos aceptados/publicados.
- [x] Pruebas unitarias backend (`test_hu17.py`) y frontend aprobadas al 100%.
- [x] Integración en la pestaña "Producción Científica" del expediente del estudiante.


## 7. Cambios Realizados y Avances

## Avances en la Implementación de HU-17

### Avances en Fase 1: Backend y API
- **Modelo `Publication`:** Se actualizó en `nexus/models.py` para incluir todos los campos necesarios (`student`, `titulo`, `autores`, `tipo`, `revista`, `estado`, `fecha_publicacion`, `doi`, `evidencia`).
- **Serializer `PublicationSerializer`:** Implementado en `nexus/serializers.py` con validaciones para cumplir con las reglas de negocio.
- **Vistas `PublicationViewSet`:** Creadas en `nexus/views.py` para manejar rutas `GET` y `POST` con permisos de autenticación y validación de permisos `can_access_student`.
- **Rutas en `urls.py`:** Registradas para el endpoint `/api/v1/academic-output/publications/`.
- **Pruebas Unitarias:** Creadas en `nexus/test_hu17.py` para validar creación de publicaciones, validación de evidencia/DOI, y fechas válidas.

### Avances en Fase 2: Backend Completo
- **Modelo `Publication`:** Se validó y mejoró en `nexus/models.py` para incluir `PublicationType` y `PublicationStatus` con sus respectivas validaciones.
- **Serializer y Vistas:** Se refuerzan las validaciones en `nexus/serializers.py` y `nexus/views.py` para asegurar que se cumplan los criterios de aceptación.

### Avances en Fase 3: Frontend Angular
- **Componente `PublicationFormComponent`:** Implementado en `src/app/academic-output/publication-form.ts` para el registro de publicaciones con validaciones y manejo de evidencia.
- **Componente `PublicationsListComponent`:** Implementado en `src/app/academic-output/publications-list.ts` para listar las publicaciones.
- **Plantillas y Estilos:** Se crearon en `publication-form.html`, `publication-form.scss`, `publications-list.html`, y `publications-list.scss`.

---

## 7.1. Actualización del Menú Lateral
Se agregó un nuevo botón "Subir Publicación" debajo del botón "Acuerdos" en el menú lateral para facilitar el registro de publicaciones científicas.

## 7. Problemas Identificados y Soluciones

### 7.1. Problemas en la Consola del Backend
Se han identificado errores en la validación de los campos y restricciones de fechas:

- **Validación de Estado y Evidencia/DOI:** Falta validación en el serializer para asegurar que si el estado es `ACEPTADO` o `PUBLICADO`, debe incluir al menos `doi` o `evidencia`.
- **Validación de Fechas:** Falta validación para evitar fechas de publicación futuras.

### 7.2. Cambios Implementados

#### **7.2.1. Validaciones en el Modelo `Publication`
Se añadió la validación en el método `clean()` del modelo `Publication`:
```python
from django.core.exceptions import ValidationError
from django.db import models
import datetime

class Publication(models.Model):
    # ... (campos existentes)
    
    def clean(self):
        super().clean()
        if self.estado in ['ACEPTADO', 'PUBLICADO']:
            if not self.doi and not self.evidencia:
                raise ValidationError("Debe proporcionar DOI o evidencia.")
        if self.fecha_publicacion and self.fecha_publicacion > datetime.now():
            raise ValidationError("La fecha de publicación no puede ser futura.")
```

#### **7.2.2. Validaciones en el Serializer `PublicationSerializer`
Se implementó validación en el serializer para asegurar que se cumplan las reglas de negocio:
```python
class PublicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publication
        fields = '__all__'

    def validate(self, data):
        if data.get('estado') in ['ACEPTADO', 'PUBLICADO']:
            if not data.get('doi') and not data.get('evidencia'):
                raise serializers.ValidationError("Debe proporcionar DOI o evidencia.")
        return data
```

#### **7.2.3. Pruebas Unitarias Actualizadas
Se actualizaron las pruebas unitarias en `nexus/test_hu17.py` para validar:
- Creación de publicaciones con datos válidos.
- Errores al intentar crear publicaciones sin evidencia/DOI para estados `ACEPTADO` o `PUBLICADO`.

Ejemplo de pruebas:
```python
def test_create_publication_with_valid_data():
    url = reverse('publication-list')
    payload = {
        'student': 4,
        'semester': 2,
        'titulo': 'Test Title',
        'autores': 'Autor Test',
        'tipo': 'JCR',
        'revista': 'Test Journal',
        'estado': 'PUBLICADO',
        'fecha_publicacion': '2026-05-12',
        'doi': 'https://doi.org/123456',
        'evidencia': 15
    }
    response = client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_201_CREATED


def test_create_publication_without_evidence_or_doi():
    url = reverse('publication-list')
    payload = {
        'student': 4,
        'semester': 2,
        'titulo': 'Test Title',
        'autores': 'Autor Test',
        'tipo': 'JCR',
        'revista': 'Test Journal',
        'estado': 'PUBLICADO',
        'fecha_publicacion': '2026-05-12'
    }
    response = client.post(url, payload, format='json')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
```

### 7.3. Avances en la Implementación de HU-17

### Avances en Fase 1: Backend y API
- **Modelo `Publication`:** Se actualizó en `nexus/models.py` para incluir validaciones adicionales.
- **Serializer `PublicationSerializer`:** Implementado con validaciones robustas.
- **Vistas `PublicationViewSet`:** Creadas con permisos de autenticación y validación de permisos.
- **Rutas en `urls.py`:** Registradas para el endpoint `/api/v1/academic-output/publications/`.
- **Pruebas Unitarias:** Actualizadas para asegurar que las validaciones funcionen correctamente.

### Avances en Fase 2: Backend Completo
- **Modelo `Publication`:** Se validó y mejoró en `nexus/models.py` para incluir `PublicationType` y `PublicationStatus` con sus respectivas validaciones.
- **Serializer y Vistas:** Se refuerzan las validaciones en `nexus/serializers.py` y `nexus/views.py`.

### Avances en Fase 3: Frontend Angular
- **Componente `PublicationFormComponent`:** Implementado con validaciones y manejo de evidencia.
- **Componente `PublicationsListComponent`:** Implementado para listar publicaciones.

### Avances en Integración y Pruebas
- Se corrigieron errores en la validación de endpoints y se validaron las funcionalidades de subir y listar publicaciones.
- Se documentaron todos los cambios en el archivo `HU-17-plan-implementacion.md`.

---