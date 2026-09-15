# Documento del Equipo 1: Núcleo, Tutorías y Producción Académica
## Enfoque, Responsabilidades y Historias de Usuario

Este documento de trabajo define de manera rigurosa las responsabilidades, historias de usuario y criterios de aceptación específicos para el **Equipo 1: Núcleo, Tutorías y Producción Académica**.

### Rol del Equipo 1 en el Proyecto:
El **Equipo 1** es el responsable de cimentar las bases del sistema de información. Lidera el desarrollo de la identidad del usuario, el registro fundamental de estudiantes, la gestión temporal de semestres, la estructuración técnica del módulo de tutorías, el registro de productos de difusión científica (publicaciones y congresos/coloquios) y la exportación estructurada del expediente hacia formatos universales como Excel y PDF.

### Interacciones y Dependencias Técnicas:
1. **Permisos y Seguridad (con Equipo 2):** Para controlar el acceso en las tutorías y el expediente de estudiantes, el Equipo 1 depende estrechamente de la HU-02 (Control de acceso por rol) desarrollada por el Equipo 2.
2. **Evidencias y Seguimiento (con Equipo 2):** Al registrar tutorías, el Equipo 1 proporciona el punto de anclaje de donde el Equipo 2 colgará los avances académicos (HU-09) y los acuerdos resultantes (HU-11). Asimismo, depende del Equipo 2 para consumir el módulo de carga de evidencias físicas (HU-21, HU-22).
3. **Línea de Tiempo e Indicadores (con Equipo 3):** El Equipo 1 entrega datos estructurados de tutorías, publicaciones y eventos que el Equipo 3 consolidará visualmente en el historial longitudinal (HU-23) y en el Dashboard del Coordinador (HU-24).
4. **Exportación de Reportes (con Equipo 3):** La HU-28 (Exportar a Excel/PDF) desarrollada por el Equipo 1 depende directamente del formato de Reporte Integral (HU-27) generado por el Equipo 3.

---

## Historias de Usuario y Criterios de Aceptación del Equipo 1

A continuación se detallan de forma íntegra las historias de usuario bajo responsabilidad directa de este equipo, incluyendo todas sus descripciones y criterios de aceptación, tal como se definen en el plan del proyecto:

### HU-01 — Autenticarse
- **Definición:** Como usuario autorizado, quiero iniciar sesión, para acceder a la información correspondiente a mi rol.
- **Criterios de Aceptación:**
  - **CA-01.1:** Dado un usuario activo con credenciales válidas, cuando inicie sesión, entonces accederá al sistema.
  - **CA-01.2:** Dadas credenciales incorrectas, cuando intente ingresar, entonces el acceso será rechazado sin revelar qué dato fue incorrecto.
  - **CA-01.3:** Dado un usuario autenticado, cuando cierre sesión, entonces dejará de tener acceso a recursos protegidos.

### HU-03 — Registrar estudiante
- **Definición:** Como coordinador, quiero registrar un estudiante de doctorado, para crear su expediente longitudinal.
- **Criterios de Aceptación:**
  - **CA-03.1:** El sistema solicitará como mínimo datos de identificación, programa y fecha de ingreso.
  - **CA-03.2:** No permitirá duplicar un estudiante utilizando el identificador institucional definido.
  - **CA-03.3:** Después del registro se creará un expediente consultable.

### HU-05 — Gestionar semestres
- **Definición:** Como coordinador, quiero organizar la trayectoria del estudiante por semestre, para consultar su evolución doctoral.
- **Criterios de Aceptación:**
  - **CA-05.1:** Un expediente podrá contener los semestres 1 a 6.
  - **CA-05.2:** Las actividades registradas deberán asociarse a un semestre.
  - **CA-05.3:** El sistema no permitirá asociar una actividad a un semestre inexistente del estudiante.

### HU-07 — Registrar sesión de tutoría
- **Definición:** Como asesor, quiero registrar una sesión de tutoría, para conservar evidencia del seguimiento realizado.
- **Criterios de Aceptación:**
  - **CA-07.1:** La tutoría deberá asociarse obligatoriamente a estudiante, semestre y fecha.
  - **CA-07.2:** No podrá guardarse si faltan los campos obligatorios.
  - **CA-07.3:** Una tutoría guardada deberá aparecer en el semestre correspondiente del expediente.

### HU-08 — Registrar modalidad y participantes
- **Definición:** Como asesor, quiero registrar modalidad y participantes, para documentar las condiciones en las que ocurrió la tutoría.
- **Especificaciones Técnicas:** Debe permitir:
  - **Modalidad:** presencial, virtual.
  - **Participantes:** estudiante, asesor, coasesor, miembros autorizados del comité.

### HU-10 — Registrar próxima reunión
- **Definición:** Como participante de la tutoría, quiero registrar la próxima reunión prevista, para facilitar la continuidad del seguimiento.
- **Especificaciones Técnicas:**
  - Debe permitir al menos fecha prevista y observaciones.
  - No convierte al sistema en una agenda completa; simplemente registra el compromiso futuro de la sesión.

### HU-17 — Registrar publicación
- **Definición:** Como estudiante, quiero registrar una publicación, para documentar mi producción científica.
- **Especificaciones de Campos Obligatorios:**
  - Título, autores, tipo, revista/evento, estado, fecha, DOI/URL, evidencia.
  - **Estados definidos:** Preparación / Enviado / En revisión / Aceptado / Publicado.

### HU-18 — Registrar congreso o coloquio
- **Definición:** Como estudiante, quiero registrar mi participación en actividades académicas, para conservar evidencia de difusión y retroalimentación.
- **Especificaciones Técnicas:**
  - El tipo permitirá distinguir de forma clara entre: **congreso** y **coloquio**.
  - Los campos particulares del registro pueden cambiar según el tipo de evento seleccionado.

### HU-28 — Exportar información
- **Definición:** Como coordinador, quiero exportar información a Excel o PDF, para utilizarla fuera del sistema.
- **Especificaciones Técnicas:**
  - Primero debe implementarse una exportación estructurada genérica de la información.
  - Posteriormente se adecuará para proporcionar un formato de archivo compatible con el Excel institucional cuando esté disponible.

# Plan de Trabajo - Sistema Colaborativo de Seguimiento de Tutorías de Posgrado

Este documento técnico de alineación contiene el plan de trabajo estructurado para el desarrollo del **Sistema Colaborativo de Seguimiento de Tutorías de Posgrado**. La información contenida aquí es la fuente de verdad oficial del proyecto y debe ser acatada de forma rigurosa.

## 1. Visión del producto
**Sistema Colaborativo de Seguimiento de Tutorías de Posgrado**
**Objetivo:** Desarrollar un expediente digital longitudinal que permita a estudiantes, asesores, coasesores y coordinadores registrar, consultar y dar seguimiento a las tutorías, acuerdos, avances de tesis, producción académica y evidencias de un estudiante durante los seis semestres del doctorado.

La aplicación no debe ser una agenda de reuniones. El objeto central es la trayectoria del estudiante.

### Escenario central del producto:
Un alumno registra una tutoría, documenta avances, genera acuerdos; el tutor también puede registrar una tutoría, asigna responsables y fechas, el alumno incorpora evidencias, los acuerdos cambian de estado, todo aparece posteriormente en el historial longitudinal del alumno.

## 2. Actores y roles
| Actor | Responsabilidades principales |
| :--- | :--- |
| **Estudiante** | Registra tutorías, consulta trayectoria, avances y acuerdos; registra determinados avances; aporta evidencias. |
| **Asesor/director** | Registrar tutorías, observaciones, acuerdos, avance de tesis y seguimiento. |
| **Coasesor** | Consultar y participar en tutorías; registrar observaciones y revisar acuerdos. |
| **Coordinador** | Consultar estudiantes, indicadores, alertas, trayectorias y reportes globales. |
| **Miembro de comité tutorial** | Consultar información autorizada y participar en tutorías/observaciones. |
| **Administrador** | Gestionar cuentas, roles y catálogos básicos; no necesariamente consultar contenido académico sensible. |

*Nota:* La autorización debe basarse en **rol + relación con el estudiante**. Por ejemplo, un asesor no debería consultar automáticamente a todos los doctorandos del programa.

## 3. Épicas del Proyecto
| ID Épica | Alcance |
| :--- | :--- |
| **E01** | Identidad y acceso (Autenticación, roles y permisos) |
| **E02** | Expediente doctoral (Estudiante, asesoría, semestres y datos generales) |
| **E03** | Tutorías (Sesiones, participantes, avances, observaciones y próxima reunión) |
| **E04** | Acuerdos y compromisos (Responsables, vencimientos y estados) |
| **E05** | Seguimiento de tesis (Componentes y evolución del avance) |
| **E06** | Trayectoria académica (Publicaciones, congresos, coloquios, estancias y productos) |
| **E07** | Evidencias (Archivos, enlaces y asociación con actividades) |
| **E08** | Seguimiento longitudinal (Timeline, dashboard y alertas) |
| **E09** | Reportes y exportación (Reportes, Excel y PDF) |

## 4. Product Backlog Priorizado General
Este es el Product Backlog compartido que sirve como repositorio único del proyecto:

| ID | Épica | Historia Resumida | Prioridad | Valor | SP | Dependencias | Equipo Responsable | Sprint |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HU-01** | E01 | Autenticarse | Must | Alto | 5 | — | **Equipo 1** | 1 |
| **HU-02** | E01 | Controlar acceso por rol | Must | Alto | 5 | HU-01 | **Equipo 2** | 1 |
| **HU-03** | E02 | Registrar estudiante | Must | Alto | 5 | HU-01, HU-02 | **Equipo 1** | 1 |
| **HU-04** | E02 | Asignar asesor, coasesor y comité | Must | Alto | 3 | HU-03 | **Equipo 2** | 1 |
| **HU-05** | E02 | Gestionar semestres | Must | Alto | 3 | HU-03 | **Equipo 1** | 1 |
| **HU-06** | E02 | Consultar expediente del estudiante | Must | Alto | 3 | HU-03, HU-05 | **Equipo 3** | 1 |
| **HU-07** | E03 | Registrar tutoría | Must | Alto | 8 | HU-03, HU-05 | **Equipo 1** | 2 |
| **HU-08** | E03 | Registrar modalidad y participantes | Must | Alto | 3 | HU-04, HU-07 | **Equipo 1** | 2 |
| **HU-09** | E03 | Registrar avances y observaciones | Must | Alto | 5 | HU-07 | **Equipo 2** | 2 |
| **HU-10** | E03 | Registrar próxima reunión | Must | Medio | 3 | HU-07 | **Equipo 1** | 2 |
| **HU-11** | E04 | Crear acuerdos desde tutoría | Must | Alto | 5 | HU-07 | **Equipo 2** | 2 |
| **HU-12** | E04 | Asignar responsable y compromiso | Must | Alto | 3 | HU-11 | **Equipo 2** | 2 |
| **HU-13** | E04 | Actualizar estado del acuerdo | Must | Alto | 5 | HU-11, HU-12 | **Equipo 2** | 2 |
| **HU-14** | E04 | Consultar acuerdos pendientes y vencidos | Must | Alto | 5 | HU-11, HU-12, HU-13 | **Equipo 3** | 2 |
| **HU-15** | E05 | Registrar avance de tesis | Must | Alto | 8 | HU-03, HU-05 | **Equipo 2** | 3 |
| **HU-16** | E05 | Comparar avance por semestre | Must | Alto | 5 | HU-15 | **Equipo 2** | 4 |
| **HU-17** | E06 | Registrar publicación | Must | Alto | 5 | HU-03, HU-05 | **Equipo 1** | 4 |
| **HU-18** | E06 | Registrar congreso o coloquio | Must | Alto | 5 | HU-03, HU-05 | **Equipo 1** | 4 |
| **HU-19** | E06 | Registrar estancia doctoral | Must | Medio | 5 | HU-03, HU-05 | **Equipo 3** | 4 |
| **HU-20** | E06 | Registrar otro producto | Could | Bajo | 5 | HU-03, HU-05 | **Equipo 3** | 4 |
| **HU-21** | E07 | Cargar evidencia | Must | Alto | 5 | HU-03, HU-05 | **Equipo 2** | 3 |
| **HU-22** | E07 | Registrar URL/DOI como evidencia | Must | Medio | 3 | HU-03, HU-05 | **Equipo 2** | 3 |
| **HU-23** | E08 | Consultar línea de tiempo longitudinal | Must | Alto | 8 | HU-07, HU-13, HU-15, HU-21 | **Equipo 3** | 3 |
| **HU-24** | E08 | Dashboard del coordinador | Should | Alto | 8 | HU-06, HU-14, HU-23 | **Equipo 3** | 4 |
| **HU-25** | E08 | Alertar acuerdos por vencer/vencidos | Must | Alto | 5 | HU-12, HU-13 | **Equipo 3** | 3 |
| **HU-26** | E08 | Alertar tutorías/evidencias pendientes | Should | Medio | 5 | HU-07, HU-10, HU-21 | **Equipo 2** | 5 |
| **HU-27** | E09 | Generar reporte integral por estudiante | Should | Alto | 5 | HU-23, HU-24 | **Equipo 3** | 5 |
| **HU-28** | E09 | Exportar a Excel/PDF | Should | Medio | 8 | HU-27 | **Equipo 1** | 5 |

*Nota:* El **Sprint 6** no está deliberadamente cargado de nuevas funcionalidades. Debe reservarse para integración, pruebas, correcciones, accesibilidad básica, seguridad, documentación y el release candidate.

## 5. Dependencias Principales e Integración
El desarrollo sigue dos flujos de dependencias principales que convergen en la línea de tiempo longitudinal:

### Flujo Central de Tutorías y Acuerdos:
`HU-01 (Autenticación)` -> `HU-02 (Roles)` -> `HU-03 (Estudiante)` -> bifurca en `HU-04 (Comité)` y `HU-05 (Semestre)`. Ambas confluyen en `HU-07 (Tutoría)`, de donde se derivan `HU-09 (Avances/Obs)`, `HU-10 (Próxima Reunión)` y `HU-11 (Crear Acuerdos)`. De `HU-11` se sigue `HU-12 (Asignar Responsable)` -> `HU-13 (Actualizar Estado)` -> `HU-14 (Consultar Acuerdos)` -> `HU-25 (Alertar Acuerdos)`.

### Flujo de Seguimiento de Investigación:
`Estudiante + Semestre (HU-03 + HU-05)` -> `HU-15 (Registrar Avance de Tesis)` -> `HU-16 (Evolución de Avance por Semestre)`.

### Convergencia Longitudinal (Integración):
La **Línea de Tiempo Longitudinal (HU-23)** es el principal punto de integración de todo el proyecto. Requiere la consolidación de:
- Tutorías (desarrollado por el Equipo 1)
- Acuerdos (desarrollado por el Equipo 2)
- Avance de Tesis (desarrollado por el Equipo 2)
- Evidencias (desarrollado por el Equipo 2)
- Producción académica, congresos y estancias (desarrollados posteriormente)

Esta historia (HU-23) es deliberadamente responsabilidad del **Equipo 3**, que no desarrolla todos los módulos que consume, obligando a una estrecha integración técnica y comunicación entre los tres equipos.

## 6. El Producto Mínimo Viable (MVP) - Fin del Sprint 3
El MVP debe estar 100% funcional y listo al terminar el **Sprint 3**. El proyecto se considerará "sano" únicamente si este flujo funciona de extremo a extremo en la versión integrada.

### Alcance del MVP:
Incluye obligatoriamente las historias de la **HU-01 a la HU-15** (exceptuando funcionalidades no indispensables de trayectoria académica avanzada), más la carga de evidencias (**HU-21**), evidencias externas por enlace (**HU-22**), la línea de tiempo longitudinal (**HU-23**), y las alertas internas de acuerdos (**HU-25**).

### Flujo de Demostración del MVP:
`Login` -> `Selección de Estudiante` -> `Selección de Semestre` -> `Registrar Tutoría` -> `Documentar Avances` -> `Generar Acuerdo` -> `Asignar Responsable y Fecha` -> `Actualización de Estado` -> `Cargar Evidencia` -> `Registrar Avance de Tesis` -> `Visualizar en la Línea de Tiempo`.

*Escenario de prueba para el MVP:*
La estudiante María González se encuentra en tercer semestre. El asesor registra una tutoría, documenta el avance de metodología, genera el acuerdo "terminar instrumento de evaluación" para María con fecha 25 de septiembre. María carga posteriormente el instrumento como evidencia y marca el acuerdo concluido. Al consultar su expediente, la tutoría, el acuerdo, la evidencia y el avance aparecen perfectamente sincronizados en su trayectoria longitudinal.

## 7. Distribución Inicial de Responsabilidades de los Equipos
Para evitar el desarrollo de silos y fomentar el trabajo colaborativo e integrador, se establece la siguiente distribución inicial de módulos:

- **Equipo 1 — Núcleo, tutorías y producción académica:**
  - Lidera: Autenticación, estudiantes, semestres, tutorías, próximas reuniones, publicaciones, congresos/coloquios y exportación.
  - Depende de: Equipo 2 para permisos, participantes, evidencias y datos de seguimiento; y del Equipo 3 para reportes que posteriormente exportará.
- **Equipo 2 — Acuerdos, tesis y evidencias:**
  - Lidera: Permisos, comité tutorial, avances de tutoría, acuerdos, responsables, tesis, evidencias y alertas por seguimiento incompleto.
  - Depende de: Equipo 1 para estudiantes y tutorías. Entrega información consumida por el Equipo 3.
- **Equipo 3 — Seguimiento longitudinal y coordinación:**
  - Lidera: Expediente resumen, pendientes/vencidos, línea de tiempo, estancias doctorales, otros productos académicos, dashboard del coordinador, alertas y reportes integrales.
  - Depende de: Altamente de los datos provistos por los Equipos 1 y 2. Este equipo actúa como el gran integrador funcional del sistema.

### Consecuencia Pedagógica Crítica:
Ningún equipo puede decir: *"Mi módulo funciona de forma aislada, yo ya terminé"*. El único criterio de éxito válido para la evaluación es: **¿Funciona el producto completamente integrado en el repositorio común?**

## 8. Estrategia de Coordinación e Integración Técnica
Para asegurar la viabilidad del proyecto de doce semanas en un ámbito universitario, se definen estrictas reglas de coordinación y arquitectura:

### Arquitectura de Software:
Se implementará una **única aplicación Django `nexus`**, organizada internamente por dominios conceptuales y desplegada como monolito modular; se descarta de manera categórica el uso de microservicios. Los dominios comparten configuración, proceso, API y base de datos, y no deben confundirse con aplicaciones Django independientes.

Estructura de la aplicación:
```text
Aplicación Django única `nexus`
│
├── identity          (dominio conceptual: autenticación, usuarios y roles)
├── students          (dominio conceptual: estudiantes y semestres)
├── tutoring          (dominio conceptual: tutorías y participantes)
├── agreements        (dominio conceptual: acuerdos y fechas límite)
├── thesis            (dominio conceptual: avance de tesis)
├── academic-output   (dominio conceptual: publicaciones, congresos, estancias y productos)
├── evidence          (dominio conceptual: archivos y enlaces)
├── monitoring        (dominio conceptual futuro: timeline, dashboard y alertas)
└── reporting         (dominio conceptual futuro: reportes consolidados)
```

### Decisiones Técnicas Vigentes del Ciclo:
- Backend en una **única app Django `nexus`**, con los módulos enumerados como dominios conceptuales y tablas propias `nexus_*`.
- API canónica exclusivamente bajo `/api/v1/`; JWT con `access` de 15 minutos, `refresh` de 7 días, rotación y blacklist.
- `matricula` tiene longitud máxima de 20 caracteres y los usuarios incluyen `grammatical_gender`.
- Comité agrupado por estudiante con `memberships` y cargos `ASESOR`, `COASESOR`, `COMMITTEE_MEMBER`; máximo un coasesor.
- Sólo `PROGRAM_COORDINATOR` crea o modifica semestres.
- `VENCIDO` es derivado por fecha y no una transición manual.
- Evidencias físicas: máximo **15 MiB**. Frontend: **pnpm**.

### Recursos Compartidos por los Tres Equipos:
1. **Un solo repositorio Git** (alojado en una plataforma centralizada).
2. **Un solo modelo de datos de base de datos** (con migraciones compartidas).
3. **Una única API** (con contratos de interfaz documentados formalmente).
4. **Una Definition of Done (DoD) unificada**.
5. **Un único Product Backlog** priorizado para todo el proyecto.
6. **Un entorno integrado de pruebas y despliegue**.
7. **Estándares visuales y de interfaz comunes (Design System mínimo)**.

### Reglas de Git y Flujo de Trabajo:
- El repositorio estará estructurado en base a ramas cortas de características (Feature Branches) que se integran a la rama principal:
  `main` <- `Pull Request` <- `Development` <- `Pull Request` <- `HU-[ID]-[nombre-de-historia]`
- **No se permiten tres repositorios independientes**.
- **No se permite una rama permanente por equipo**.
- **No se permite postergar la integración para el final del proyecto**.

### 8 Reglas de Oro de Desarrollo:
1. Las ramas `Development` y `main` deben permanecer ejecutables; `Development` es la rama de integración y `main` recibe únicamente incrementos estabilizados mediante PR.
2. Las ramas de características deben ser lo más cortas posibles en tiempo de vida.
3. Todo cambio significativo debe ingresar exclusivamente mediante un **Pull Request (PR)**.
4. Todo PR debe contar con, al menos, una revisión aprobada de otro integrante del equipo.
5. En componentes compartidos o núcleos del sistema, se procurará obtener la revisión y aprobación de un miembro de otro equipo.
6. Cualquier modificación al modelo de datos común debe ser comunicada y consensuada antes de integrarse.
7. Los contratos de API deben ser documentados y actualizados inmediatamente al realizar cambios.
8. Toda dependencia técnica o de desarrollo entre equipos debe estar explícitamente reflejada como una tarea visible en el tablero físico/digital.

*Práctica Obligatoria:* Cada equipo debe realizar **al menos una revisión cruzada de código** (Code Review) a otro equipo de desarrollo durante cada Sprint.

### Dinámica del Scrum de Scrums:
Se mantendrá una reunión de coordinación inter-equipos con las siguientes características:
- **Duración máxima:** 15 minutos.
- **Frecuencia:** Dos veces por semana.
- **Participantes:** Un representante rotativo de cada uno de los tres equipos.
- **Enfoque estricto:** Únicamente se discuten dependencias entre equipos, bloqueos de integración técnica, cambios en contratos de APIs, problemas de infraestructura compartida y riesgos para el incremento del Sprint.
- **No se permite utilizar este espacio para reportar avances individuales** de tareas secundarias (no es para decir *"el Equipo 1 hizo cinco tareas, el Equipo 2 hizo cuatro..."*).
- **Pregunta guía de la reunión:** *¿Qué necesita otro equipo de nosotros o qué necesitamos nosotros de otro equipo para que el incremento integrado funcione perfectamente?*

## 9. Plan Detallado de Sprints

### Sprint 1 — Base Común
- **Sprint Goal:** Disponer de una primera versión integrada que permita autenticar usuarios y consultar el expediente básico de un estudiante.
- **Asignación de Historias:**
  - **Equipo 1:** HU-01 (Autenticarse), HU-03 (Registrar estudiante), HU-05 (Gestionar semestres).
  - **Equipo 2:** HU-02 (Controlar acceso por rol), HU-04 (Asignar asesor, coasesor y comité).
  - **Equipo 3:** HU-06 (Consultar expediente del estudiante).
- **Incremento Esperable:** El usuario inicia sesión -> consulta la lista de estudiantes -> selecciona un estudiante -> observa su semestre actual, asesor/coasesor asignados y expediente inicial.
- **Sprint Review:** No se acepta la presentación de diagramas, mockups o diapositivas como evidencia de avance principal. Se debe demostrar la aplicación real funcionando directamente en el entorno de pruebas común.

### Sprint 2 — Tutoría y Compromisos
- **Sprint Goal:** Registrar una sesión de tutoría completa y convertir sus decisiones académicas en acuerdos formales susceptibles de seguimiento individual.
- **Asignación de Historias:**
  - **Equipo 1:** HU-07 (Registrar tutoría), HU-08 (Registrar modalidad y participantes), HU-10 (Registrar próxima reunión).
  - **Equipo 2:** HU-09 (Registrar avances y observaciones), HU-11 (Crear acuerdos desde tutoría), HU-12 (Asignar responsable y compromiso), HU-13 (Actualizar estado del acuerdo).
  - **Equipo 3:** HU-14 (Consultar acuerdos pendientes y vencidos).
- **Incremento Esperable:** Flujo integrado de: `Estudiante` -> `Tutoría` -> `Avances/Observaciones` -> `Creación de Acuerdos` -> `Asignación de Responsable, Fecha Límite y Estado`.
- **Sprint Review:** Registrar en vivo frente al profesor una tutoría realista con datos académicos y posteriormente localizar y gestionar el acuerdo generado dentro del sistema.

### Sprint 3 — MVP Longitudinal
- **Sprint Goal:** Integrar el seguimiento de tesis, evidencias físicas, compromisos generales y la trayectoria histórica integral del estudiante.
- **Asignación de Historias:**
  - **Equipo 1:** Integración y refinamiento completo del flujo de tutorías.
  - **Equipo 2:** HU-15 (Registrar avance de tesis), HU-21 (Cargar evidencia), HU-22 (Registrar URL/DOI como evidencia).
  - **Equipo 3:** HU-23 (Consultar línea de tiempo longitudinal), HU-25 (Alertar acuerdos por vencer/vencidos).
- **Incremento Esperable:** **MVP Completo y Funcional.** Demostración del flujo de extremo a extremo (según escenario detallado en la Sección 6).
- **Sprint Review:** Evaluación crítica de viabilidad académica y técnica. El MVP debe funcionar sin fallos en el servidor común.

### Sprint 4 — Trayectoria Académica y Coordinación
- **Sprint Goal:** Ampliar el expediente longitudinal con la producción académica, la movilidad estudiantil e indicadores iniciales de seguimiento global.
- **Asignación de Historias:**
  - **Equipo 1:** HU-17 (Registrar publicación), HU-18 (Registrar congreso o coloquio).
  - **Equipo 2:** HU-16 (Comparar avance por semestre).
  - **Equipo 3:** HU-19 (Registrar estancia doctoral), HU-20 (Registrar otro producto), HU-24 (Dashboard del coordinador).
- **Incremento Esperable:** La línea de tiempo longitudinal integra no solo tutorías y avances de tesis, sino también publicaciones, congresos y estancias del estudiante.
- *Nota:* HU-20 (Registrar otro producto) está clasificada como prioridad "Could" y puede descartarse si pone en riesgo el Sprint Goal.

### Sprint 5 — Supervisión y Reportes
- **Sprint Goal:** Facilitar al coordinador de posgrado la identificación oportuna de situaciones de seguimiento incompleto y la generación de reportes integrales y exportación.
- **Asignación de Historias:**
  - **Equipo 1:** HU-28 (Exportar a Excel/PDF).
  - **Equipo 2:** HU-26 (Alertar tutorías/evidencias pendientes) + tareas de integración general.
  - **Equipo 3:** HU-27 (Generar reporte integral por estudiante) + refinamiento del dashboard de coordinación.
- **Incremento Esperable:** Sistema operativo con alertas de retrasos, generación de reportes consolidados exportables e interfaz de coordinación refinada.
- *Nota:* Al estar disponible el formato de Excel institucional, se adaptará el formato de exportación final en este sprint.

### Sprint 6 — Release Candidate
- **Sprint Goal:** Obtener una versión final estable, completamente integrada, exhaustivamente evaluada y demostrable del producto completo.
- **Alcance:** No se agrega ninguna funcionalidad nueva. Todos los equipos se unifican para trabajar exclusivamente en:
  - Corrección de defectos y bugs reportados.
  - Pruebas unitarias, funcionales y de estrés básico.
  - Ajustes de seguridad y controles de acceso por rol.
  - Refinamiento de la experiencia de usuario (UX) y accesibilidad básica.
  - Elaboración de documentación técnica y manuales de usuario.
  - Preparación de datos de prueba/demostración.
  - Optimización del rendimiento básico y despliegue final.
- **Incremento Esperable:** **Release Candidate 1.0.** El producto final estable debe entregarse exactamente en la fecha acordada (23 de noviembre).

## 10. Definition of Done (DoD)
Una historia de usuario se considera formalmente **Done (Terminada)** únicamente cuando cumple la totalidad de los siguientes criterios:
- La funcionalidad requerida está completamente implementada en código ejecutable.
- Cumple rigurosamente todos y cada uno de sus criterios de aceptación definidos.
- Está completamente integrada con el resto del producto funcional.
- El código fuente correspondiente ha sido subido al repositorio Git común.
- Existe un Pull Request formal para su integración.
- El PR fue revisado y aprobado formalmente por al menos otro integrante del equipo.
- No contiene defectos ni errores críticos conocidos (Zero Critical Bugs).
- Cuenta con las pruebas funcionales correspondientes ejecutadas con éxito.
- La persistencia de datos (base de datos) funciona correctamente cuando aplica.
- Respeta de forma estricta los permisos de acceso y control de roles definidos.
- La interfaz de usuario utiliza fielmente los componentes y estándares visuales acordados.
- La documentación técnica y de usuario asociada está completamente actualizada.
- El tablero de control Kanban/Scrum refleja con precisión el estado real de la tarea.
- La historia puede demostrarse sin problemas directamente desde la versión integrada del sistema.
- La rama `main` del repositorio permanece ejecutable tras la integración.

*Reglas de Oro de Calidad:*
1. *"Programado"* o *"Listo para probar"* **NO significa Done**.
2. *"Funciona en mi computadora/local"* **NO significa Done**.

## 11. Ceremonias Scrum y Trabajo en Equipo

### Sprint Planning:
Se realiza al inicio de cada Sprint y se divide en dos fases:
1. **Fase Conjunta:** Todos los equipos se reúnen para revisar el Product Goal, definir prioridades globales, aclarar dependencias críticas entre equipos y acordar los objetivos de integración.
2. **Fase de Equipo:** Cada equipo trabaja de manera independiente para seleccionar sus historias de usuario del backlog, estimar las tareas necesarias y detallar su plan.
- **Resultado:** Cada equipo sale de la ceremonia con un Sprint Goal compartido, sus historias seleccionadas, dependencias claramente identificadas y documentadas, y un tablero de Sprint actualizado.
- *Criterio Pedagógico:* Los estudiantes no deben comprometerse a *"terminar X cantidad de Story Points"* como objetivo primordial; deben comprometerse con el **resultado de valor funcional expresado en el Sprint Goal**.

### Daily Scrum Adaptado:
Se estructura de la siguiente manera para acoplarse a la dinámica del curso académico:
- Se implementará un canal de comunicación digital diaria breve.
- **Plantilla pedagógica obligatoria (3 preguntas):**
  1. *¿Qué avancé desde el último reporte?* (para visibilidad).
  2. *¿En qué trabajaré hoy?* (para planeación interna).
  3. *¿Qué impedimento tengo o de quién dependo?* (para alertar bloqueos).
- En los días de clase presencial, se realizará un Daily presencial rápido de **máximo 10 minutos** al iniciar la sesión académica.

### Sprint Review:
Se realiza estrictamente al concluir cada Sprint (cada dos semanas):
- **Regla Inquebrantable:** Se demuestra única y exclusivamente el **producto integrado corriendo en vivo**, no tres productos por separado ni implementaciones locales.
- **Sustitutos prohibidos:** Bajo ninguna circunstancia se aceptarán presentaciones de PowerPoint, capturas de pantalla (screenshots), diseños en Figma, ni explicaciones verbales o promesas de *"ya casi funciona"*.
- **Orden de la sesión:**
  1. Recordar el Sprint Goal definido para el Sprint.
  2. Ejecutar escenarios de uso reales con datos de prueba realistas frente a la audiencia.
  3. Identificar claramente cuáles historias de usuario están verdaderamente "Done" bajo la DoD.
  4. Recibir retroalimentación directa del profesor y usuarios.
  5. Modificar y actualizar formalmente el Product Backlog.

### Sprint Retrospective:
Cada equipo debe realizar su análisis reflexivo al final de cada Sprint utilizando la técnica **Mantener / Cambiar / Probar**:
- *¿Qué prácticas funcionaron bien y debemos mantener?*
- *¿Qué factores nos dificultaron avanzar y debemos cambiar?*
- *¿Qué nueva acción o experimento probaremos en el siguiente Sprint?*
- **Condición de Salida:** Toda reunión de retrospectiva debe concluir de manera obligatoria con **al menos una acción de mejora observable, concreta y asignada** para el siguiente Sprint.

## 12. Evidencias de Trabajo Colaborativo y Evaluación
La evaluación del desempeño de los estudiantes en este proyecto académico multiequipo no se limitará al número de commits en Git. Se implementará un modelo de evaluación basado en la **triangulación de evidencias**:

| Evidencia | Qué permite observar / Evaluar |
| :--- | :--- |
| **Issues** | Registro formal de trabajo asumido, asignación y seguimiento del ciclo de vida. |
| **Pull Requests (PR)** | Contribuciones directas integradas al código de la aplicación común. |
| **Code Reviews** | Colaboración efectiva, calidad de código y conocimiento técnico compartido. |
| **Comentarios técnicos** | Negociación técnica, debates constructivos y resolución de problemas complejos. |
| **Tablero de Control** | Cumplimiento de compromisos, límites WIP y transparencia de cara al grupo. |
| **Historial del backlog** | Participación activa en las sesiones de planificación e historias. |
| **Pruebas de software** | Contribución directa a la estabilidad, pruebas funcionales e integración. |
| **Diseños e interfaces** | Aportación al diseño de experiencia de usuario (UX) y apego al design system. |
| **Documentación** | Externalización formal del conocimiento técnico y funcional. |
| **Scrum of Scrums** | Capacidad de coordinación, comunicación asertiva inter-equipos y liderazgo. |
| **Sprint Reviews** | Dominio demostrado sobre el incremento de producto y capacidad de demo. |
| **Retrospectivas** | Nivel de reflexión, autocrítica y compromiso con la mejora continua. |
| **Coevaluación** | Percepción técnica y de colaboración de los compañeros del mismo equipo. |

### Bitácora Individual de Contribución por Sprint:
Cada estudiante deberá completar obligatoriamente la siguiente bitácora al finalizar cada Sprint:
- **Principal aportación:** Enlace directo al Issue, Pull Request o artefacto completado.
- **Revisión de código realizada:** Enlace al PR de otro compañero que fue revisado y aprobado.
- **Colaboración con otro integrante:** Descripción de actividades de ayuda mutua.
- **Dependencia técnica resuelta:** Breve descripción de cómo se solventó un bloqueo de integración.
- **Participación en la integración común:** Evidencias técnicas de pruebas en el entorno común.
- **Aprendizaje / Adaptación:** Reflexión personal de entre 2 y 3 líneas sobre conocimientos adquiridos.

## 13. Gestión de Riesgos y Mitigaciones

| Riesgo Detectado | Estrategia de Mitigación Obligatoria |
| :--- | :--- |
| **Tres equipos crean tres sistemas aislados** | Uso riguroso de un único repositorio común, un solo backlog unificado y definición clara de arquitectura de monolito modular desde el primer día. |
| **Integración tardía y catastrófica** | Exigir integración funcional continua de ramas `HU-*` hacia `Development` y promoción estabilizada de `Development` hacia `main` desde el Sprint 1. |
| **Dependencias técnicas invisibles** | Registro visual obligatorio en el tablero de trabajo común y discusión en Scrum of Scrums. |
| **Efecto "Héroe" (un estudiante hace todo)** | Auditoría de evidencias individuales, rotación de tareas y revisión cruzada de PRs. |
| **Equipos organizados rígidamente (frontend vs backend)** | Definición de responsabilidades principales por módulo, pero con revisión y colaboración cruzadas en todo el stack. |
| **Exceso de alcance de historias de usuario** | Aplicación rigurosa de priorización MoSCoW y enfoque absoluto en el Product Goal de cada Sprint. |
| **Cuello de botella de tareas "en progreso"** | Establecimiento y control de límites de trabajo en progreso (WIP limits) por desarrollador. |
| **Historias de usuario demasiado grandes** | Refinamiento del backlog antes del Sprint y división vertical de historias de usuario. |
| **Cambios en base de datos rompen código** | Uso obligatorio de modelo compartido, scripts de migración versionados y revisión de base de datos antes de hacer merge. |
| **Interfaces inconsistentes o caóticas** | Adopción estricta de un Design System mínimo (componentes visuales reutilizables) desde el Sprint 1. |
| **Evidencias académicas expuestas** | Implementación rigurosa de autorización y controles de acceso basados en la relación de pertenencia estudiante-asesor. |
| **Desgaste en la exportación a Excel institucional** | Analizar el formato requerido previamente y construir la exportación estructurada básica antes de acomodar detalles visuales. |
| **Dashboard se desborda a Business Intelligence** | Restringir el alcance a indicadores operativos básicos de seguimiento a tutorías. |
| **Sistemas de notificaciones consumen esfuerzo** | Implementar exclusivamente alertas internas dentro del sistema web en la primera fase. |
| **El Sprint 6 se desvía para terminar desarrollo base** | Cumplimiento obligatorio e inamovible de un MVP 100% funcional en el Sprint 3. |

## 14. Cinco Recomendaciones Clave de Viabilidad
Para asegurar que el proyecto se complete con éxito en el tiempo estipulado, todos los equipos deben acatar estrictamente estas cinco recomendaciones:
1. **Primera:** Desarrollar única y exclusivamente una **sola aplicación web responsiva**, descartando cualquier intento de construir aplicaciones nativas móviles paralelas.
2. **Segunda:** Mantener una arquitectura de **monolito modular**, asegurando simplicidad en el desarrollo y despliegue del software.
3. **Tercera:** Diseñar e implementar **alertas internas primero**. Los sistemas de envío de correos, notificaciones por WhatsApp, mensajería SMS y notificaciones push quedan descartados para el alcance actual y se reservan para versiones futuras del producto.
4. **Cuarta:** **No implementar firma electrónica** de documentos, acuerdos o reportes en esta fase, ya que consume excesivo tiempo de desarrollo y pruebas de seguridad.
5. **Quinta:** El **MVP debe estar 100% completo e integrado en el Sprint 3**. Los tres Sprints restantes (4, 5 y 6) deben servir para ampliar la trayectoria académica, validar exhaustivamente el funcionamiento, corregir errores y refinar la usabilidad de un producto que ya funciona de forma estable.
