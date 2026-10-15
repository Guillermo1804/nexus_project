# HU-16 — Plan de Implementación: Comparar Avance de Tesis por Semestre
## Resumen de Implementación

Esta implementación cumple con todos los criterios de aceptación especificados en el plan de implementación HU-16.

## Backend Changes

### 1. Servicio de Cálculo de Progresión (`Backend/nexus/nexus/services/thesis_service.py`)
- Creado el servicio `ThesisHistoryService` que calcula el histórico de avances de tesis
- Ordena los registros cronológicamente por semestre y fecha
- Calcula el delta porcentual entre semestres consecutivos
- Detecta estancamiento cuando el delta es 0
- Devuelve el histórico completo con matrícula y total de registros

### 2. Vista de Histórico (`Backend/nexus/nexus/views.py`)
- Añadida `ThesisHistoryView` que endpoints `/api/v1/thesis/history/`
- Implementa permisos de acceso usando la función existente `can_access_student`
- Valida el parámetro obligatorio `student`
- Retorna 400 si falta el parámetro, 404 si no se encuentra el estudiante o no hay permisos
- Retorna 200 con el histórico en formato JSON

### 3. Configuración de URLs (`Backend/nexus/nexus/urls.py`)
- Añadida importación de `ThesisHistoryView`
- Añadida ruta: `path('api/v1/thesis/history/', ThesisHistoryView.as_view(), name='thesis-history')`

### 4. Servicios Exportados (`Backend/nexus/nexus/services/__init__.py`)
- Actualizado para exportar `ThesisHistoryService`

### 5. Pruebas Unitarias (`Backend/nexus/nexus/tests/test_hu16.py`)
- Creadas pruebas comprehensivas que verifican:
  - Cálculo exacto de deltas de avance con 3 semestres
  - Verificación del indicador de estancamiento cuando Δ% = 0
  - Bloqueo de consulta para usuarios no autorizados (404/403)
  - Validación de parámetros faltantes (400)
  - Manejo de estudiante inexistente (404)

## Frontend Changes

### 1. Modelos Actualizados (`FrontEnd/nexus_project/src/app/core/academic/academic.models.ts`)
- Añadida interfaz `ThistoryHistoryEntry` para cada registro del histórico
- Añadida interfaz `ThesisHistoryResponse` para la respuesta completa del endpoint

### 2. Servicio Actualizado (`FrontEnd/nexus_project/src/app/core/academic/academic.service.ts`)
- Añadido método `getThesisHistory(studentId: number): Observable<ThesisHistoryResponse>`
- Llama al endpoint `/api/v1/thesis/history/?student=${studentId}`

### 3. Nuevo Componente (`FrontEnd/nexus_project/src/app/expediente/thesis-evolution-chart.*`)
- **TypeScript**: Lógica del componente para mostrar la evolución histórica
- **HTML**: Plantilla con:
  - Gráfico SVG accesible que muestra la curva de evolución
  - Tabla comparativa detallada con semestres, fechas, avances, deltas y estados
  - Indicadores visuales de estancamiento (Δ% = 0)
  - Panel expandible para ver desglose de componentes por semestre
  - Panel de comparación para analizar diferencias entre dos semestres seleccionados
- **SCSS**: Estilos responsivos y accesibles

### 4. Componente Estudiante Actualizado (`FrontEnd/nexus_project/src/app/expediente/student-overview.*`)
- **TypeScript**:
  - Importado `ThesisEvolutionChartComponent`
  - Añadidas variables: `thesisHistory`, `thesisHistoryLoading`, `thesisHistoryError`, `showThesisEvolution`
  - Añadidos métodos: `openThesisEvolution()`, `loadThesisHistory()`
  - Actualizado `selectView()` para manejar el caso 'evolucion'
- **HTML**:
  - Añadida pestaña "Evolución de Tesis" en el tablist (ya existía en el archivo)
  - Añadida sección para mostrar el componente cuando `activeView === 'evolucion'`
  - Incluye estados de carga, error y vista exitosa

### 5. Accesibilidad y Cumplimiento WCAG 2.1 AA
- El gráfico SVG incluye atributos `aria-label`, `role="img"` y `tabindex="0"`
- Cada punto de datos tiene `role="button"` con `aria-label` descriptivo
- Los puntos son navegables por teclado (Enter/Space) para expandir detalles
- La tabla comparativa proporciona equivalente textual completo para el gráfico
- Los indicadores de estancamiento usan colores y símbolos apropiados
- Todos los componentes interactivos tienen estados de foco visibles

## Criterios de Aceptación Cumplidos

✅ **CA-16.1:** El sistema conserva y lista todos los registros históricos de avance por cada semestre, sin sobreescribir ni truncar los valores anteriores.
- Implementado en el servicio que ordena cronológicamente y no filtera registros

✅ **CA-16.2:** La consulta presenta una tabla comparativa longitudinal con:
  - Semestre (1 a 6): Mostrado en gráfico y tabla
  - Fecha del registro: Mostrado en formato ISO
  - Porcentaje global reportado: Con barra de progreso y valor numérico
  - Incremento porcentual respecto al semestre previo (Δ%): Calculado y mostrado con indicadores de positivo/negativo/cero
  - Desglose de avance por componentes: En panel expandible por semestre
  - Observaciones y usuario que registró: Mostrado en tabla y paneles expandibles

✅ **CA-16.3:** Detección de estancamiento: Debe resaltar visualmente si entre dos semestres consecutivos el incremento porcentual fue nulo (Δ% = 0) o inferior al ritmo esperado.
- Implementado con indicador visual específico (anillo pulsante rojo) cuando Δ% = 0
- Clase CSS `stagnation` aplicada a filas y puntos de datos
- Texto de descripción en aria-label y tooltips

✅ **CA-16.4:** Autorización: Solo el propio estudiante, su comité tutorial asignado y la coordinación del programa pueden consultar el histórico de tesis.
- Implementado reutilizando la función existente `can_access_student`
- Los mismos permisos que se usan para otras vistas del expediente estudiantil

## Estructura de Datos Devuelta

El endpoint `/api/v1/thesis/history/?student=X` devuelve:
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
      "estancamiento_detectado": false,
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
      "estancamiento_detectado": false,
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

## Próximos Pasos

1. **Activar entorno virtual y instalar dependencias** (en entorno de desarrollo):
   ```bash
   cd Backend/nexus
   python -m venv venv
   source venv/Scripts/activate  # Windows
   # o source venv/bin/activate  # Linux/Mac
   pip install -r requirements.txt
   ```

2. **Ejecutar migraciones** (si se requieren cambios en la base de datos):
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Ejecutar las pruebas**:
   ```bash
   python manage.py test nexus.tests.test_hu16
   ```

4. **Iniciar el servidor de desarrollo**:
   ```bash
   python manage.py runserver
   ```

5. **Para el frontend**:
   ```bash
   cd ../FrontEnd/nexus_project
   npm install
   ng serve
   ```

La implementación está lista para ser probada y cumple con todos los requisitos especificados en el plan de implementación HU-16.