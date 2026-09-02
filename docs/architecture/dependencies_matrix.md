# Matriz de Dependencias Técnicas y Contratos de Integración
## Sistema N.E.X.U.S. (Núcleo de Expediente y Seguimiento Universitario Superior)
**Documento Normativo de Ingeniería de Software**  
**Versión:** 1.0 — Canónica de Producción  
**Clasificación:** Restringido / Especificación Oficial de Arquitectura e Integración  

---

## 1. Fundamentación Arquitectónica

El sistema N.E.X.U.S. se rige bajo una arquitectura de **Monolito Modular de Alta Cohesión y Bajo Acoplamiento**. Para garantizar la estabilidad del modelo de datos relacional y asegurar la interoperabilidad sin colisiones entre los módulos, la implementación del Product Backlog (**HU-01 a HU-28**) debe seguir estrictamente la **Secuencia Canónica de Dependencias de Dominio**.

Ningún módulo de nivel superior (supervisión activa, línea de tiempo longitudinal, reportabilidad o exportación documental) puede consumirse sin que sus entidades proveedoras de datos hayan formalizado y publicado sus contratos de API REST bajo el estándar `/api/v1/`.

---

## 2. Mapa Jerárquico de Dominio

```
+---------------------------------------------------------------------------------+
|                       NIVEL 0: NÚCLEO TRANSVERSAL                               |
|              HU-01 / HU-02: Autenticación JWT y Roles RBAC (identity)           |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------+
|                    NIVEL 1: EXPEDIENTES Y ESTRUCTURA BASE                       |
|       HU-03: Registro y Padrón de Estudiantes (students)                        |
|       HU-04: Asignación de Asesor, Coasesor y Comité Tutorial (students)        |
|       HU-05: Catálogo y Gestión de Semestres 1 a 6 (students)                   |
|       HU-06: Vista Integral de Expediente - Student Overview 70/30 (students)   |
+-------------------+-------------------+-------------------+---------------------+
                    |                   |                   |
                    v                   v                   v
+-----------------------+ +-----------------------+ +-----------------------+
| NIVEL 2.1: TUTORÍAS   | | NIVEL 2.2: TESIS      | | NIVEL 2.3: PRODUCTOS  |
| HU-07 a HU-10:        | | HU-15 / HU-16:        | | HU-17 a HU-20:        |
| Sesiones, Asistencia, | | Avance 0-100%,        | | Publicaciones,        |
| Observaciones y       | | Componentes e         | | Congresos, Estancias  |
| Próxima Reunión       | | Histórico             | | y Productos           |
| (tutoring)            | | (thesis)              | | (academic_output)     |
+-----------+-----------+ +-----------------------+ +-----------+-----------+
            |                                                   |
            v                                                   |
+-----------------------+                                       |
| NIVEL 2.4: ACUERDOS   |                                       |
| HU-11 a HU-14:        |                                       |
| Registro, Responsables|                                       |
| Máquina de Estados y  |                                       |
| Bitácora (agreements) |                                       |
+-----------+-----------+                                       |
            |                                                   |
            +---------------------------+-----------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------+
|                      NIVEL 3: REPOSITORIO DE EVIDENCIAS                         |
|      HU-21 / HU-22: Carga Documental (15MB) y Validación Enlaces/DOI (evidence)  |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------+
|                NIVEL 4: SUPERVISIÓN ACTIVA Y LÍNEA DE TIEMPO                    |
|      HU-23: Línea de Tiempo Longitudinal Multi-Nodo (monitoring - Hito MVP)     |
|      HU-24: Dashboard Ejecutivo del Coordinador (monitoring)                    |
|      HU-25: Alertas de Acuerdos por Vencer / Vencidos (monitoring)              |
|      HU-26: Alertas de Tutorías y Evidencias Pendientes (monitoring)             |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v
+---------------------------------------------------------------------------------+
|               NIVEL 5: REPORTABILIDAD INSTITUCIONAL Y DOSSIER                   |
|      HU-27: Reporte Integral por Estudiante / Cédula Imprimible (reporting)    |
|      HU-28: Motores de Exportación Institucional XLSX y PDF (reporting)         |
+---------------------------------------------------------------------------------+
```

---

## 3. Matriz Exhaustiva del Product Backlog (HU-01 a HU-28)

| ID | Sprint / Equipo | Historia de Usuario | Módulo Responsable | Prerrequisitos de Dominio | Contrato / Endpoint Clave (`/api/v1/`) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **HU-01** | Sprint 1 [E1] | Autenticarse (JWT Login/Refresh) | `identity` | Ninguno (Núcleo) | `POST /api/v1/auth/login/`<br>`POST /api/v1/auth/token/refresh/` |
| **HU-02** | Sprint 1 [E2] | Controlar acceso por rol (RBAC) | `identity` | `HU-01` | Permisos RBAC: `IsCoordinator`, `IsAssignedAdvisorOrStudent` |
| **HU-03** | Sprint 1 [E1] | Registrar estudiante | `students` | `HU-01`, `HU-02` | `GET/POST /api/v1/students/`<br>`GET /api/v1/students/{id}/` |
| **HU-04** | Sprint 1 [E2] | Asignar asesor, coasesor y comité | `students` | `HU-01`, `HU-03` | `GET/POST /api/v1/students/{id}/committee/` |
| **HU-05** | Sprint 1 [E1] | Gestionar semestres 1 a 6 | `students` | `HU-03` | `GET/POST /api/v1/students/{id}/semesters/` |
| **HU-06** | Sprint 1 [E3] | Consultar expediente del estudiante (Student Overview 70/30) | `students` | `HU-03`, `HU-04`, `HU-05` | Componente Angular `<app-student-overview>` |
| **HU-07** | Sprint 2 [E1] | Registrar sesión de tutoría | `tutoring` | `HU-03`, `HU-04`, `HU-05` | `POST /api/v1/tutoring-sessions/` |
| **HU-08** | Sprint 2 [E1] | Registrar asistencia y participantes de sesión | `tutoring` | `HU-07` | Inclusión nested: `participants: [...]` |
| **HU-09** | Sprint 2 [E1] | Registrar observaciones y minutas | `tutoring` | `HU-07` | Inclusión nested: `observations: [...]` |
| **HU-10** | Sprint 2 [E1] | Programar fecha y notas de próxima reunión | `tutoring` | `HU-07` | `proxima_reunion_fecha`, `proxima_reunion_notas` |
| **HU-11** | Sprint 2 [E2] | Registrar acuerdos y compromisos | `agreements` | `HU-03`, `HU-07` | `POST /api/v1/agreements/` |
| **HU-12** | Sprint 2 [E2] | Asignar responsable y fecha límite | `agreements` | `HU-11` | DTO: `responsable`, `fecha_limite` |
| **HU-13** | Sprint 2 [E2] | Máquina de estados de acuerdos (`PENDIENTE` $\rightarrow$ `CONCLUIDO` / `VENCIDO`) | `agreements` | `HU-11`, `HU-12` | `PATCH /api/v1/agreements/{id}/status/` |
| **HU-14** | Sprint 2 [E2] | Bitácora inmutable de auditoría de acuerdos | `agreements` | `HU-13` | `AgreementAuditLog`, `GET /api/v1/agreements/{id}/audit-logs/` |
| **HU-15** | Sprint 3 [E2] | Registrar porcentaje de avance de tesis (0-100%) y desglose de componentes | `thesis` | `HU-03`, `HU-05` | `POST /api/v1/thesis/` (`porcentaje_avance`, `componentes_json`) |
| **HU-16** | Sprint 4 [E2] | Histórico longitudinal de avances y curva de evolución | `thesis` | `HU-15` | `GET /api/v1/thesis/history/?student={id}` |
| **HU-17** | Sprint 4 [E1] | Registrar publicaciones científicas (JCR, Scopus, Conacyt) | `academic_output` | `HU-03`, `HU-21` | `GET/POST /api/v1/academic-output/publications/` |
| **HU-18** | Sprint 4 [E1] | Registrar ponencias y congresos | `academic_output` | `HU-03`, `HU-21` | `GET/POST /api/v1/academic-output/events/` |
| **HU-19** | Sprint 4 [E1] | Registrar estancias de investigación doctorales | `academic_output` | `HU-03`, `HU-21` | `GET/POST /api/v1/academic-output/research-stays/` |
| **HU-20** | Sprint 4 [E1] | Registrar otros productos: patentes, software y bases de datos | `academic_output` | `HU-03`, `HU-21` | `GET/POST /api/v1/academic-output/other-products/` |
| **HU-21** | Sprint 3 [E2] | Cargar evidencias documentales (Archivos locales hasta 15MB) | `evidence` | `HU-01`, `HU-03` | `POST /api/v1/evidence/upload/` (Multipart/form-data) |
| **HU-22** | Sprint 3 [E2] | Registrar y validar identificadores persistentes DOI / URL | `evidence` | `HU-01`, `HU-03` | `POST /api/v1/evidence/` (`tipo='ENLACE_DOI'`) |
| **HU-23** | Sprint 3 [E3] | Línea de tiempo longitudinal multi-nodo (Hito MVP) | `monitoring` | `HU-07`, `HU-11`, `HU-15`, `HU-21` | `GET /api/v1/monitoring/timeline/?student={id}` |
| **HU-24** | Sprint 4 [E3] | Dashboard ejecutivo del coordinador | `monitoring` | `HU-04`, `HU-07`, `HU-15`, `HU-17` | `GET /api/v1/monitoring/dashboard/` |
| **HU-25** | Sprint 3 [E3] | Alertas de acuerdos por vencer y vencidos | `monitoring` | `HU-11`, `HU-12`, `HU-13` | `GET /api/v1/monitoring/alerts/?student={id}` |
| **HU-26** | Sprint 5 [E2] | Alertas de tutorías (>45 días) y evidencias pendientes | `monitoring` | `HU-07`, `HU-13`, `HU-21` | `GET /api/v1/monitoring/supervision-alerts/` |
| **HU-27** | Sprint 5 [E3] | Reporte integral por estudiante / Cédula imprimible (Full Dossier) | `reporting` | `HU-01` a `HU-26` | `GET /api/v1/reporting/dossier/?student={id}` |
| **HU-28** | Sprint 5 [E1] | Motores de exportación institucional a Excel (.xlsx) y PDF vectorizado | `reporting` | `HU-27` | `GET /api/v1/reporting/dossier/pdf/`<br>`GET /api/v1/reporting/dossier/excel/` |

---

## 4. Análisis de la Ruta Crítica de Integración

La ruta crítica del sistema define la secuencia técnica obligatoria de dependencias directas:

$$\text{HU-01 (Auth)} \longrightarrow \text{HU-03 (Students)} \longrightarrow \text{HU-07 (Tutoring)} \longrightarrow \text{HU-11 (Agreements)} \longrightarrow \text{HU-15 (Thesis)} \longrightarrow \text{HU-23 (Timeline)} \longrightarrow \text{HU-27 (Full Dossier)} \longrightarrow \text{HU-28 (Export)}$$

### Reglas Clave de Integración
1. **Desacoplamiento entre Tutorías y Acuerdos (`HU-07` $\rightarrow$ `HU-11`):**  
   El modelo `Agreement` mantiene `session = models.ForeignKey(TutoringSession, null=True, blank=True, on_delete=models.SET_NULL)`, permitiendo compromisos autónomos o vinculados a una minuta de sesión.
2. **Asociación Polimórfica de Evidencias (`HU-21/22` $\rightarrow$ `HU-17..20`):**  
   Los productos académicos y acuerdos referencian evidencias documentales mediante clave foránea nulable (`evidencia = models.ForeignKey(Evidence, null=True, on_delete=models.SET_NULL)`), permitiendo adjuntar archivos antes o después del registro.
3. **Punto de Convergencia MVP (`HU-23`):**  
   La Línea de Tiempo Longitudinal consolida cronológicamente las tutorías (`HU-07`), acuerdos (`HU-11`), avances de tesis (`HU-15`) y evidencias (`HU-21`), validando la integración transversal del sistema en Sprint 3.
