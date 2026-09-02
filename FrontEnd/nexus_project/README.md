# Guía Técnica de Desarrollo Frontend — N.E.X.U.S.
## Interfaz de Usuario en Angular 20 Standalone

Esta guía establece la arquitectura, directrices de desarrollo, tokens de diseño y estándares de implementación para la aplicación cliente del sistema **N.E.X.U.S.**.

---

## 1. Directiva Arquitectónica Fundamental

La interfaz está construida íntegramente bajo la arquitectura **Standalone de Angular 20**.
* **Prohibición de NgModules:** Queda estrictamente prohibido el uso de módulos legados (`@NgModule`). Todo componente, directiva o pipe debe declararse como `standalone: true` e importar directamente sus dependencias en el arreglo `imports: [...]`.
* **Manejo del Estado y Reactividad:** Se prioriza el uso de **Angular Signals** (`signal()`, `computed()`, `effect()`) y Formularios Reactivos (`ReactiveFormsModule`) para la gestión del estado de la interfaz.

---

## 2. Estructura Canónica del Proyecto

El código fuente en `src/app/` está organizado en tres capas estrictamente desacopladas:

```
src/app/
├── core/                       # Capa Núcleo (Servicios Singleton, Seguridad y Modelos)
│   ├── guards/                 # Route Guards (ej. auth.guard.ts)
│   ├── interceptors/           # Interceptores HTTP (inyección de token JWT)
│   ├── models/                 # Interfaces TypeScript tipadas (espejo de modelos Django)
│   └── services/               # Clientes HTTP por dominio (StudentService, TutoringService, etc.)
│
├── features/                   # Módulos de Negocio / Páginas Funcionales
│   ├── auth/login/             # Inicio de sesión institucional
│   ├── dashboard/              # Tablero ejecutivo de coordinación y asesor
│   ├── student-overview/       # Ficha integral del estudiante y resumen 360°
│   ├── agreements/             # Listado y drawer lateral de acuerdos/compromisos
│   ├── tutoring/               # Modal de registro y consulta de tutorías
│   ├── thesis/                 # Registro de avance porcentual y gráfico de evolución
│   ├── academic-output/        # Publicaciones, congresos, estancias y productos
│   ├── evidence/               # Carga y gestión documental con soporte DOI
│   └── reporting/              # Generador y previsualizador de expediente (Full Dossier)
│
└── shared/                     # Componentes y Utilidades Reutilizables
    └── components/
        ├── app-shell/          # Layout principal con navegación superior y lateral
        ├── pill-badge/         # Badge semafórico de estados normalizado
        └── timeline/           # Línea de tiempo cronológica multi-nodo
```

---

## 3. Tokens de Diseño y Paleta Institucional

La interfaz utiliza variables SCSS institucionales para garantizar consistencia visual en todos los módulos:

### 3.1. Paleta de Colores Primaria
* **Color Primario (Iris Blue):** `#6365EF` — Botones de acción principal, encabezados activos y acentos.
* **Color Secundario (Deep Indigo):** `#2C1867` — Barra lateral institucional y textos de alto contraste.
* **Fondo General (Background Light):** `#F5F7FB` — Fondo de la aplicación.
* **Bordes y Divisores:** `#D0D5DD` — Contornos de tarjetas, tablas y separadores.

### 3.2. Semáforos de Estado (Pill Badges)
Para el seguimiento de acuerdos, alertas de supervisión y avances, se deben emplear exclusivamente los siguientes tokens semánticos:

| Estado | Token Hexadecimal | Clase / Badge | Significado |
| :--- | :---: | :--- | :--- |
| **`CONCLUIDO`** | `#10B981` | `.badge-success` | Acuerdo cumplido satisfactoriamente o alerta resuelta. |
| **`EN_PROCESO`** | `#F59E0B` | `.badge-warning` | Actividad en curso dentro de los plazos establecidos. |
| **`VENCIDO`** | `#EF4444` | `.badge-danger` | Plazo perentorio superado; requiere atención inmediata. |
| **`PENDIENTE`** | `#6365EF` | `.badge-primary` | Compromiso registrado pendiente de inicio. |

---

## 4. Comandos de Desarrollo y Verificación

Todos los comandos deben ejecutarse desde el directorio `FrontEnd/nexus_project/`:

### 4.1. Iniciar Servidor Local con Proxy
```bash
npm start
```
*Inicia la aplicación en `http://localhost:4200/` con redirección transparente de llamadas `/api/v1/` hacia el backend en `http://127.0.0.1:8000` a través de `proxy.conf.json`.*

### 4.2. Compilación de Producción y Verificación de Tipado
```bash
npm run build
```
*Verifica que no existan errores de sintaxis o tipado en TypeScript y genera el bundle optimizado en `dist/nexus-frontend`.*

### 4.3. Ejecución de Pruebas Unitarias
```bash
npm test
```
*Ejecuta los tests unitarios con Karma y Jasmine para los servicios y componentes de la aplicación.*

---

## 5. Reglas de Implementación para Desarrolladores de Frontend

1. **Tipado Estricto:** Toda llamada HTTP en un servicio debe retornar un `Observable<T>` fuertemente tipado utilizando las interfaces de `core/models/`. No se permite el uso del tipo `any`.
2. **Inyección de Dependencias:** Utilizar la función `inject()` de Angular (ej. `private readonly studentService = inject(StudentService);`) en lugar de constructores verbosos.
3. **Manejo de Errores de API:** Los formularios reactivos deben capturar el diccionario de errores retornado por Django (HTTP 400) y proyectar los mensajes de validación correspondientes en cada control de la vista.
