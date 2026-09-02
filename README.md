# N.E.X.U.S. — Núcleo de Expediente y Seguimiento Universitario Superior

Bienvenido al repositorio oficial del sistema **N.E.X.U.S.**, la plataforma institucional de gestión, seguimiento académico y supervisión longitudinal de posgrados universitarios (Versión canónica de producción v1.0).

El sistema unifica el expediente de los estudiantes de posgrado integrando en tiempo real: sesiones de tutoría, conformación de comités tutoriales, minutas y acuerdos con semáforos de vencimiento, seguimiento porcentual de avance de tesis, repositorio polimórfico de evidencias con soporte DOI, indicadores de supervisión activa y motores de reportabilidad institucional en formatos PDF vectorizado y Microsoft Excel multi-hoja.

---

## 1. Arquitectura del Sistema

El proyecto está diseñado bajo una arquitectura de **Monolito Modular Desacoplado**:

* **Backend (Django & Django REST Framework):**
  - Estructurado en 9 aplicaciones modulares (`identity`, `students`, `tutoring`, `agreements`, `thesis`, `academic_output`, `evidence`, `monitoring`, `reporting`).
  - Autenticación y seguridad mediante JSON Web Tokens (`djangorestframework-simplejwt`) con control de acceso basado en roles (RBAC: `STUDENT`, `TUTOR`, `COMMITTEE_MEMBER`, `PROGRAM_COORDINATOR`, `ACADEMIC_ADMIN`, `SYSTEM_ADMIN`).
  - Persistencia relacional normalizada con soporte para SQLite (entorno local) y PostgreSQL (producción).
  - Motores de generación documental con `reportlab` (PDF) y `openpyxl` (Excel).
* **Frontend (Angular 20 Standalone):**
  - Arquitectura moderna basada 100% en **Standalone Components** y reactividad con **Angular Signals** y Formularios Reactivos.
  - Organización por capas: `core/` (guards, interceptores JWT, modelos, servicios HTTP), `features/` (módulos de negocio) y `shared/` (componentes reutilizables, App Shell, línea de tiempo longitudinal y Badges semafóricos).
  - Comunicación asíncrona mediante cliente HTTP tipado contra el estándar de API REST `/api/v1/`.

---

## 2. Guía de Inicio Rápido para Desarrolladores

### 2.1. Prerrequisitos
- Python 3.11+
- Node.js 20.x o superior con npm
- Git

---

### 2.2. Configuración del Backend (Django)

1. **Navegar a la carpeta del backend y crear el entorno virtual:**
   ```bash
   cd BackEnd
   python3 -m venv .venv
   source .venv/bin/activate  # En Windows: .venv\Scripts\activate
   ```

2. **Instalar dependencias del proyecto:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar migraciones de base de datos:**
   ```bash
   python manage.py migrate
   ```

4. **Crear superusuario administrador:**
   ```bash
   python manage.py createsuperuser
   ```

5. **Iniciar el servidor de desarrollo:**
   ```bash
   python manage.py runserver 8000
   ```
   *El backend estará disponible en `http://127.0.0.1:8000/api/v1/` y el panel de administración en `http://127.0.0.1:8000/admin/`.*

---

### 2.3. Configuración del Frontend (Angular)

1. **Navegar a la carpeta del frontend:**
   ```bash
   cd FrontEnd/nexus_project
   ```

2. **Instalar dependencias de Node:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo con Proxy integrado:**
   ```bash
   npm start
   ```
   *El frontend iniciará en `http://localhost:4200/` con proxy inverso automático hacia Django (`http://127.0.0.1:8000`).*

---

## 3. Gobernanza de Git y Flujo de Trabajo Colaborativo

Para mantener la integridad y calidad del código en el equipo multidisciplinario, todos los integrantes deben adherirse a las siguientes directivas:

### 3.1. Estrategia de Ramas (*Branching Strategy*)
* **Rama Principal (`main`):** Código de producción y releases estables. **El push directo a `main` está estrictamente prohibido.**
* **Ramas de Integración de Sprint (`sprint-N-integration`):** Rama común donde se integran las características de cada Sprint.
* **Ramas de Característica (*Feature Branches*):**  
  Toda rama de trabajo individual o por subequipo debe crearse a partir de la rama de integración activa siguiendo la nomenclatura:
  ```
  feature/HU-{ID}-{nombre_corto}
  ```
  *Ejemplo:* `feature/HU-07-registro-sesion-tutoria`

---

### 3.2. Política de Pull Requests (PR) y Code Review
1. Todo cambio debe integrarse mediante Pull Request hacia la rama `sprint-N-integration`.
2. El PR debe incluir:
   - Resumen técnico de los cambios implementados.
   - Referencia a los Criterios de Aceptación de la Historia de Usuario.
   - Evidencia de pruebas unitarias aprobadas.
3. **Aprobación Obligatoria:** Ningún PR podrá mergearse sin la revisión y aprobación formal de al menos un integrante de otro equipo de desarrollo.

---

### 3.3. Definition of Done (DoD)
Una tarea o Historia de Usuario se considera formalmente terminada (**Done**) únicamente cuando cumple la totalidad de los siguientes criterios:
- [x] **0 Errores de Compilación y Tipado:** El frontend compila con `npm run build` sin advertencias ni tipos `any` injustificados.
- [x] **Pruebas Unitarias Aprobadas:** Las suites de pruebas en backend (`python manage.py test`) y frontend (`npm test`) se ejecutan con 100% de éxito.
- [x] **Cero Datos Simulados (*Mocks Hardcodeados*):** Los componentes de interfaz consumen servicios HTTP reales conectados a los endpoints de `/api/v1/`.
- [x] **Contrato de API Cumplido:** El payload y códigos de estado HTTP se apegan a la especificación `docs/architecture/api_contract_v1.md`.
- [x] **Integridad de Esquema:** Las migraciones de base de datos reflejan la especificación canónica `docs/architecture/database_schema_specification.md`.

---

## 4. Estructura de Documentación de Arquitectura

Para consultar los contratos y especificaciones técnicas oficiales del sistema, remitirse a la carpeta `docs/architecture/`:

| Documento | Contenido |
| :--- | :--- |
| `docs/architecture/database_schema_specification.md` | Especificación canónica de las 23 tablas relacionales y reglas de integridad. |
| `docs/architecture/api_contract_v1.md` | Estándar de diseño de endpoints REST v1.0, payloads y códigos de respuesta. |
| `docs/architecture/dependencies_matrix.md` | Matriz de dependencias técnicas y contratos entre las Historias de Usuario (HU-01 a HU-28). |
| `docs/architecture/ERD.mermaid` | Diagrama Entidad-Relación canónico del sistema. |
