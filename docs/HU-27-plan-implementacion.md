# HU-27 — Plan de Implementación: Reporte Integral por Estudiante (Full Dossier)

## Metadatos
- **ID:** HU-27
- **Épica:** E09 — Reportes y Exportación
- **Sprint:** Sprint 5
- **Equipo Responsable:** Equipo 3
- **Prioridad:** Should (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-01 a HU-26 (Núcleo completo del expediente doctoral)

---

## 1. Definición y Objetivo
**Como** coordinador del programa de posgrado, asesor principal o estudiante,  
**quiero** generar una cédula académica integral imprimible (Full Dossier) que consolide toda la trayectoria doctoral del estudiante en un documento estructurado,  
**para** presentar revisiones colegiadas ante el comité académico, respaldar evaluaciones de permanencia y sustentar la postulación al examen de grado.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-27.1:** El reporte integral debe consolidar de forma exhaustiva las siguientes secciones:
  1. **Ficha de Identidad:** Matrícula, nombre, programa doctoral, cohorte, fecha de ingreso, estatus.
  2. **Comité Tutorial Colegiado:** Asesor principal, coasesor y miembros del comité con filiación.
  3. **Historial de Semestres:** Registro de periodos cursados y estatus de acreditación.
  4. **Sesiones de Tutoría:** Fechas, modalidades, asistentes y minutas resumidas.
  5. **Compromisos y Acuerdos:** Total de acuerdos, desglose por estado (`Concluidos`, `En proceso`, `Vencidos`) y detalle de entregas.
  6. **Evolución de la Tesis:** Curva de avance longitudinal y último porcentaje reportado con desglose temático.
  7. **Producción Científica y Movilidad:** Artículos (JCR/Scopus), ponencias en congresos, estancias doctorales y otros productos de transferencia.
  8. **Índice de Evidencias:** Catálogo de archivos locales y enlaces DOI que respaldan cada actividad registrada.
- **CA-27.2:** Formato de salida estructurado en JSON para renderizado web y maquetación CSS específica de impresión (`@media print`) optimizada para tamaño carta y márgenes limpios.
- **CA-27.3:** Autorización RBAC: Estudiante (solo propio expediente), Comité (solo estudiantes asignados), Coordinador/Admin académico (global).

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Endpoint del Dossier Integral
- **Ruta:** `GET /api/v1/reporting/dossier/?student=4`
- **Autenticación:** `Bearer <access_token>`

#### Response Payload (`200 OK`):
```json
{
  "generado_el": "2026-09-14T18:00:00Z",
  "generado_por": "Dr. Roberto Gómez",
  "estudiante": {
    "id": 4,
    "matricula": "DOC250002",
    "nombre_completo": "Diego Fuentes",
    "programa_doctoral": "Doctorado en Ciencias",
    "cohorte": "2025-B",
    "fecha_ingreso": "2025-08-01"
  },
  "comite": {
    "asesor": "Dr. Roberto Gómez",
    "coasesor": "Dra. Elena Soto",
    "miembros": ["Dr. Marco Téllez", "Dra. Patricia Arredondo"]
  },
  "resumen_ejecutivo": {
    "semestre_actual": 3,
    "porcentaje_tesis_actual": 35,
    "total_tutorias": 4,
    "total_acuerdos": 6,
    "acuerdos_concluidos": 4,
    "acuerdos_pendientes": 1,
    "acuerdos_vencidos": 1,
    "publicaciones_count": 1,
    "congresos_count": 1,
    "estancias_count": 1
  },
  "secciones_detalladas": {
    "tutorias": [],
    "acuerdos": [],
    "tesis_historico": [],
    "publicaciones": [],
    "eventos": [],
    "estancias": [],
    "evidencias": []
  }
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Servicio Agregador de Reporte (`DossierReportEngine`)
- En `Backend/nexus/nexus/services/dossier_engine.py`:
  - Recolección integral en un solo pase optimizado de lectura (`prefetch_related` sobre todas las relaciones del expediente).
  - Cálculo de métricas ejecutivas de cumplimiento y porcentaje global.
  - Validación de autorización relacional `can_access_student()`.

### 4.2. Vista de Reporte
- `DossierView(APIView)` en `Backend/nexus/nexus/views.py`.

### 4.3. Pruebas Backend (`test_hu27.py`)
- Consulta autorizada $\rightarrow$ consolidación completa de las 8 secciones de datos.
- Validación de conteos y métricas exactas.
- Consulta no autorizada $\rightarrow$ `404/403`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `StudentDossierViewComponent` (`src/app/reporting/student-dossier-view.ts`).
  - Cédula imprimible elegante con membrete institucional N.E.X.U.S.
  - Botón "Imprimir / Guardar como PDF del navegador" invocando `window.print()`.
  - Estilos dedicados `@media print` para:
    - Ocultar barras de navegación, botones y pie de página web.
    - Evitar saltos de página huérfanos (`page-break-inside: avoid`).
    - Colores de alto contraste aptos para impresión monocromática o color.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/reporting/dossier/` probado y validado con datos consolidados.
- [ ] Maquetación CSS de impresión probada y validada en Chrome/Firefox.
- [ ] Pruebas unitarias backend (`test_hu27.py`) y frontend aprobadas al 100%.
