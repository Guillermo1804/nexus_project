# N.E.X.U.S. — Núcleo de Expediente y Seguimiento Universitario Superior

Bienvenido al repositorio oficial del sistema **N.E.X.U.S.**, la plataforma institucional de gestión, seguimiento académico y supervisión longitudinal de posgrados universitarios (Versión canónica de producción v1.0).

El sistema unifica el expediente de los estudiantes de posgrado integrando en tiempo real: sesiones de tutoría, conformación de comités tutoriales, minutas y acuerdos con semáforos de vencimiento, seguimiento porcentual de avance de tesis, repositorio polimórfico de evidencias con soporte DOI, indicadores de supervisión activa y motores de reportabilidad institucional en formatos PDF vectorizado y Microsoft Excel multi-hoja.

---

## 1. Arquitectura del Sistema

El proyecto está diseñado bajo una arquitectura de **Monolito Modular Desacoplado**:


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
   cd Backend/nexus
   python3 -m venv ../.venv
   source ../.venv/bin/activate  # En Windows: ..\.venv\Scripts\activate
   ```

2. **Instalar dependencias del proyecto:**
   ```bash
   pip install -r ../requirements.txt
   ```

3. **Ejecutar migraciones de base de datos:**
   ```bash
   python manage.py migrate
   ```

4. **Poblar datos de prueba (Simulación de 2 semanas de uso):**
   ```bash
   python manage.py populate_data
   ```
   *Crea usuarios institucionales, estudiantes, comités, semestres, tutorías, acuerdos con semáforos y avances de tesis con contraseña `Admin1234!`.*

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
* **Rama Principal (`main`):** Código de producción y releases estables aprobados al cierre del Sprint. **El push directo a `main` está estrictamente prohibido.**
* **Rama de Integración Continua (`Development`):** Rama común donde se integran las características terminadas de cada Historia de Usuario.
* **Ramas de Historia de Usuario (*HU Branches*):**  
  Cada equipo trabaja en su rama dedicada siguiendo la nomenclatura:
  ```
  HU-{ID}-{nombre_corto}
  ```
  *Ejemplos:* `HU-01-autenticarse`, `HU-02-controlar-acceso-por-rol`, `HU-03-registrar-estudiante`, `HU-04-asignar-comite-academico`, `HU-05-gestionar-semestres`, `HU-06-consultar-expediente-resumen-estudiante`.
* **Flujo de Trabajo:**
  1. Cada equipo sincroniza los últimos cambios de `Development` hacia su rama de HU.
  2. Completa y valida los criterios de aceptación en su rama.
  3. Ejecuta las pruebas unitarias y de integración.
  4. Realiza el merge hacia `Development`.
  5. Al concluir y validar todas las HU del Sprint, se realiza el merge final de `Development` hacia `main`.

---

### 3.2. Cuentas de Acceso de Demostración (Contraseña para todas: `Admin1234!`)

| Rol | Correo Electrónico | Alcance y Vistas Principales |
|---|---|---|
| **`SYSTEM_ADMIN`** | `admin@nexus.com` | Gestión de roles, creación de cuentas institucionales y bitácora de auditoría. *(Restringido de ver expedientes académicos).* |
| **`PROGRAM_COORDINATOR`** | `memosanchez101@gmail.com` | Padrón general de posgrado, alta de nuevos estudiantes y consulta/gestión integral de expedientes 70/30. |
| **`TUTOR`** | `roberto.gomez@nexus.edu` | Tablero de estudiantes asignados (`AcademicCommitteeCardComponent`) y consulta de sus expedientes. |
| **`STUDENT`** | `ana.morales@nexus.edu` | Consulta de su propio expediente longitudinal 70/30 (`/expediente/:id`). |

---

### 3.3. Política de Pull Requests (PR) y Code Review
1. Todo cambio debe integrarse mediante Pull Request hacia la rama `Development`.
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