# HU-20 — Plan de Implementación: Registrar Otros Productos Académicos

## Metadatos
- **ID:** HU-20
- **Épica:** E06 — Trayectoria Académica
- **Sprint:** Sprint 4
- **Equipo Responsable:** Equipo 3
- **Prioridad:** Could (Prioridad Opcional / Descartable si hay riesgo de Sprint)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-03 (Registrar estudiante), HU-05 (Gestionar semestres), HU-21 (Cargar evidencias)

---

## 1. Definición y Objetivo
**Como** estudiante doctoral,  
**quiero** registrar productos académicos de valor tecnológico o de transferencia (software, patentes, bases de datos de investigación, prototipos físicos o capítulos de libro),  
**para** documentar formalmente aportaciones científicas complementarias que no corresponden a publicaciones periódicas ni congresos.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-20.1:** Catálogo de tipos de producto contemplados:
  - `SOFTWARE`: Código fuente, librerías, algoritmos o paquetes computacionales.
  - `PATENTE`: Solicitud o concesión de propiedad intelectual / patente.
  - `BASE_DATOS`: Datasets o corpus de investigación estructurados.
  - `PROTOTIPO`: Prototipos de hardware, dispositivos o maquetas experimentales.
  - `CAPITULO_LIBRO`: Capítulos en libros colectivos con ISBN.
  - `OTRO`: Otros entregables de transferencia tecnológica.
- **CA-20.2:** Campos obligatorios de captura:
  - Título o nombre del producto.
  - Tipo de producto (del catálogo de CA-20.1).
  - Descripción técnica detallada.
  - Fecha de registro / liberación.
  - Semestre académico.
  - Enlace web, DOI o repositorio si aplica.
  - Evidencia documental de respaldo (constancia, registro de derecho de autor o documento de patente).
- **CA-20.3:** Regla de Priorización Ágil: Si durante el Sprint 4 el Equipo 3 identifica riesgo de incumplimiento del Sprint Goal en HU-24 (Dashboard), esta historia puede ser postergada formalmente al Sprint 5 sin comprometer la entrega del sprint.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Listar y Registrar Otros Productos
- **Rutas:**
  - `GET /api/v1/academic-output/other-products/?student=4` (Paginado)
  - `POST /api/v1/academic-output/other-products/`
- **Autenticación:** `Bearer <access_token>`

#### Request Payload (`application/json`):
```json
{
  "student": 4,
  "semester": 3,
  "titulo": "NEXUS Benchmark Dataset v1.0",
  "tipo_producto": "BASE_DATOS",
  "descripcion": "Corpus etiquetado de 5,000 registros para pruebas de consistencia de protocolos.",
  "fecha_registro": "2026-06-10",
  "evidencia": 15
}
```

#### Response Payload (`201 Created`):
```json
{
  "id": 2,
  "student": 4,
  "semester": 3,
  "titulo": "NEXUS Benchmark Dataset v1.0",
  "tipo_producto": "BASE_DATOS",
  "descripcion": "Corpus etiquetado de 5,000 registros para pruebas de consistencia de protocolos.",
  "fecha_registro": "2026-06-10",
  "evidencia": 15,
  "created_at": "2026-09-14T12:00:00Z"
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_otherproduct`)
- Modelo: `OtherProduct` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `student`: ForeignKey(`Student`, on_delete=CASCADE, related_name='other_products')
  - `semester`: ForeignKey(`Semester`, on_delete=CASCADE)
  - `titulo`: CharField(max_length=255)
  - `tipo_producto`: CharField(max_length=50, choices=OtherProductType.choices)
  - `descripcion`: TextField(blank=True, default='')
  - `fecha_registro`: DateField()
  - `evidencia`: ForeignKey(`Evidence`, null=True, blank=True, on_delete=SET_NULL)

### 4.2. Pruebas Backend (`test_hu20.py`)
- Creación válida de producto software $\rightarrow$ `201 Created`.
- Validación de choices válidos $\rightarrow$ rechazo ante tipo no contemplado.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `OtherProductFormComponent` (`src/app/academic-output/other-product-form.ts`).
  - Select de tipo de producto con iconos representativos por tipo (código, chip, libro, base de datos).
  - Integración en la subpestaña "Otros Productos y Transferencia" del expediente.

---

## 6. Definition of Done (DoD)
- [ ] Endpoints `/api/v1/academic-output/other-products/` probados y operativos.
- [ ] Pruebas unitarias backend (`test_hu20.py`) aprobadas al 100%.
- [ ] Visualización en el expediente doctoral completada.
