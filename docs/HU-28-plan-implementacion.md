# HU-28 — Plan de Implementación: Motores de Exportación Institucional (XLSX y PDF)

## Metadatos
- **ID:** HU-28
- **Épica:** E09 — Reportes y Exportación
- **Sprint:** Sprint 5
- **Equipo Responsable:** Equipo 1
- **Prioridad:** Should (Valor Institucional)
- **Story Points:** 8 SP
- **Prerrequisitos de Dominio:** HU-27 (Reporte integral por estudiante / Full Dossier)

---

## 1. Definición y Objetivo
**Como** coordinador del posgrado o asistente administrativo,  
**quiero** descargar la trayectoria completa del estudiante y las métricas de seguimiento en formatos estándar de hoja de cálculo Excel (`.xlsx`) y documento digital vectorizado (`.pdf`),  
**para** alimentar sistemas institucionales externos, presentar auditorías ante comités evaluadores y expedir constancias oficiales de seguimiento doctoral.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-28.1:** Exportación a Excel (`.xlsx`):
  - Generada mediante motor backend `openpyxl`.
  - Libro de trabajo estructurado en pestañas temáticas:
    - *Pestaña 1:* Resumen General y Ficha de Identidad.
    - *Pestaña 2:* Bitácora de Tutorías y Asistencias.
    - *Pestaña 3:* Catálogo de Acuerdos y Estatus de Cumplimiento.
    - *Pestaña 4:* Curva de Avance de Tesis y Componentes.
    - *Pestaña 5:* Producción Científica, Congresos y Movilidad.
  - Celdas formateadas con encabezados institucionales, tipos de datos correctos (fechas, porcentajes, texto) y columnas autoajustadas.
- **CA-28.2:** Exportación a PDF (`.pdf`):
  - Generada mediante motor backend `ReportLab` con salida binaria vectorizada.
  - Membrete y pie de página institucional N.E.X.U.S. en cada página con numeración "Página X de Y".
  - Tablas con bordes limpios, saltos de página controlados y tipografía estándar embebida.
- **CA-28.3:** Encabezados HTTP de descarga:
  - `Content-Disposition: attachment; filename="Dossier_[MATRICULA]_[FECHA].xlsx"` (o `.pdf`).
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `application/pdf`.
- **CA-28.4:** Autorización estricta: Solo usuarios con permiso sobre el estudiante (`can_access_student`).

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Descargar Excel
- **Ruta:** `GET /api/v1/reporting/dossier/excel/?student=4`
- **Autenticación:** `Bearer <access_token>`
- **Response (`200 OK`):** Archivo binario `.xlsx`.

### 3.2. Descargar PDF
- **Ruta:** `GET /api/v1/reporting/dossier/pdf/?student=4`
- **Autenticación:** `Bearer <access_token>`
- **Response (`200 OK`):** Archivo binario `.pdf`.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Dependencias Backend
- En `Backend/requirements.txt`:
  ```text
  openpyxl>=3.1.2
  reportlab>=4.1.0
  ```

### 4.2. Motores de Exportación
- `ExcelExportEngine` en `Backend/nexus/nexus/services/excel_exporter.py`:
  - Construcción del workbook `openpyxl.Workbook()`.
  - Estilos institucionales con fuentes, bordes y colores temáticos.
- `PdfExportEngine` en `Backend/nexus/nexus/services/pdf_exporter.py`:
  - Canvas de `ReportLab` con templates `SimpleDocTemplate`, tablas `Table` y estilos `ParagraphStyle`.

### 4.3. Vistas DRF
- `DossierExcelExportView(APIView)` y `DossierPdfExportView(APIView)` retornando `HttpResponse` con content-type binario y buffer en memoria (`io.BytesIO()`).

### 4.4. Pruebas Backend (`test_hu28.py`)
- Generación de Excel $\rightarrow$ `200 OK`, validación de Content-Type y verificación de apertura con `openpyxl.load_workbook`.
- Generación de PDF $\rightarrow$ `200 OK`, validación de cabecera `%PDF` en los primeros bytes.
- Intento de descarga por usuario no autorizado $\rightarrow$ `403 Forbidden`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Grupo de botones de exportación en la vista de expediente y en el reporte integral:
  - Botón "Exportar a Excel" (icono de hoja de cálculo verde).
  - Botón "Exportar a PDF" (icono de documento rojo).
- Método en `AcademicService.downloadDossierExcel(studentId)` y `downloadDossierPdf(studentId)` usando `responseType: 'blob'`.
- Descarga en navegador mediante creación dinámica de enlace `<a>` con `window.URL.createObjectURL(blob)`.

### 5.2. Experiencia de Usuario y Accesibilidad
- Indicador de carga durante la generación del binario (`Cargando reporte...`).
- Notificación accesible mediante `role="status"` cuando la descarga inicia exitosamente.

---

## 6. Definition of Done (DoD)
- [ ] Librerías `openpyxl` y `reportlab` instaladas y configuradas en backend.
- [ ] Endpoints `/api/v1/reporting/dossier/excel/` y `/pdf/` probados y operativos.
- [ ] Generación de archivos validada en pruebas backend (`test_hu28.py`).
- [ ] Descarga funcional de archivos desde la interfaz Angular verificada en navegadores modernos.
