# HU-16 — Plan de Implementación: Comparar Avance de Tesis por Semestre

## Metadatos
- **ID:** HU-16
- **Épica:** E05 — Seguimiento de Tesis
- **Sprint:** Sprint 4
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-15 (Registrar avance de tesis)

---

## 1. Definición y Objetivo
**Como** asesor, coasesor o coordinador del programa,  
**quiero** consultar la curva histórica de evolución del avance de tesis comparada semestre a semestre,  
**para** evaluar el ritmo de progreso de la investigación doctoral, identificar oportunamente periodos de estancamiento y retroalimentar al estudiante.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-16.1:** El sistema debe conservar y listar todos los registros históricos de avance por cada semestre, sin sobreescribir ni truncar los valores anteriores.
- **CA-16.2:** La consulta debe presentar una tabla comparativa longitudinal con:
  - Semestre (1 a 6).
  - Fecha del registro.
  - Porcentaje global reportado.
  - Incremento porcentual respecto al semestre previo ($\Delta\%$).
  - Desglose de avance por componentes (`componentes_json`).
  - Observaciones y usuario que registró.
- **CA-16.3:** Detección de estancamiento: Debe resaltar visualmente si entre dos semestres consecutivos el incremento porcentual fue nulo ($\Delta\% = 0$) o inferior al ritmo esperado.
- **CA-16.4:** Autorización: Solo el propio estudiante, su comité tutorial asignado y la coordinación del programa pueden consultar el histórico de tesis.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Histórico de Avances
- **Ruta:** `GET /api/v1/thesis/history/?student=4`
- **Autenticación:** `Bearer <access_token>`

#### Response Payload (`200 OK`):
```json
{
  "student_id": 4,
  "matricula": "DOC250002",
  "total_registros": 3,
  "historico": [
    {
      "id": 3,
      "semestre_numero": 1,
      "fecha": "2025-06-20",
      "porcentaje_avance": 15,
      "delta_porcentaje": 15,
      "componentes_json": { "protocolo": 80, "marco_teorico": 30 },
      "observaciones": "Aprobación de protocolo.",
      "registrado_por_nombre": "Dr. Roberto Gómez"
    },
    {
      "id": 9,
      "semestre_numero": 2,
      "fecha": "2025-12-15",
      "porcentaje_avance": 35,
      "delta_porcentaje": 20,
      "componentes_json": { "protocolo": 100, "marco_teorico": 80, "metodologia": 50 },
      "observaciones": "Avance en recolección de muestras.",
      "registrado_por_nombre": "Diego Fuentes"
    },
    {
      "id": 14,
      "semestre_numero": 3,
      "fecha": "2026-06-18",
      "porcentaje_avance": 35,
      "delta_porcentaje": 0,
      "estancamiento_detectado": true,
      "componentes_json": { "protocolo": 100, "marco_teorico": 80, "metodologia": 50 },
      "observaciones": "Dificultades en laboratorio.",
      "registrado_por_nombre": "Diego Fuentes"
    }
  ]
}
```

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Servicio de Cálculo de Progresión
- En `Backend/nexus/nexus/services/thesis_service.py`:
  - Queryset ordenado cronológicamente por `semester__numero` y `created_at`.
  - Cálculo de `delta_porcentaje` en Python iterando sobre los registros.
  - Indicador `estancamiento_detectado = (delta_porcentaje == 0)`.

### 4.2. Vista de Histórico
- Acción o vista dedicada: `ThesisHistoryView(APIView)`.
- Permisos `can_access_student(request.user, student)`.

### 4.3. Pruebas Backend (`test_hu16.py`)
- Consulta de estudiante con 3 semestres $\rightarrow$ cálculo exacto de deltas de avance.
- Verificación del indicador de estancamiento cuando $\Delta\% = 0$.
- Bloqueo de consulta para usuarios no autorizados $\rightarrow$ `404/403`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `ThesisEvolutionChartComponent` (`src/app/thesis/thesis-evolution-chart.ts`).
  - Gráfico de líneas o barras SVG accesible representando la curva de evolución (eje X: Semestres 1 a 6; eje Y: 0% a 100%).
  - Tabla comparativa detallada debajo del gráfico con badge rojo de alerta ante estancamiento.
  - Vista expandible para comparar el desglose de componentes temáticos entre dos semestres seleccionados.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- El gráfico cuenta con equivalente textual completo en formato tabla semántica (`<table>`).
- Puntos de datos del gráfico enfocables por teclado con tooltips legibles por screen readers.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `/api/v1/thesis/history/` probado y validado con cálculo de progresión.
- [ ] Pruebas unitarias backend (`test_hu16.py`) aprobadas al 100%.
- [ ] Componente visual de curva histórica integrado en el expediente del estudiante con accesibilidad accesible.
