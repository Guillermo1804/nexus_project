# Especificación Canónica del Esquema de Base de Datos
## Sistema N.E.X.U.S. (Núcleo de Expediente y Seguimiento Universitario Superior)
**Documento Normativo de Arquitectura de Datos**  
**Clasificación:** Especificación Técnica Oficial  

---

## 1. Alcance y Principios de Diseño

El presente documento constituye la **especificación canónica y prescriptiva** del modelo de datos relacional para el sistema N.E.X.U.S. La arquitectura de persistencia está diseñada bajo principios de **integridad referencial estricta, trazabilidad histórica, soporte de control de acceso basado en roles (RBAC) e indexación optimizada** para agregaciones analíticas de alta concurrencia (Línea de Tiempo, Semáforos de Supervisión Activa y Dossier Académico).

El esquema comprende **23 tablas relacionales**, distribuidas en 9 módulos de aplicación de dominio y el subsistema de seguridad de Django.

---

## 2. Mapa Global de Tablas y Módulos

```
                                  +-----------------------+
                                  | identity_customuser   |
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     |                        |                        |
         +-----------v-----------++-----------v-----------++-----------v-----------+
         |   students_student    || students_academiccomm || agreements_agreement  |
         +-----------+-----------++-----------------------++-----------+-----------+
                     |                                                 |
         +-----------v-----------+                         +-----------v-----------+
         |   students_semester   |                         | agreements_auditlog   |
         +-----------+-----------+                         +-----------------------+
                     |
         +-----------+-----------------------------------+
         |                   |                           |
+--------v-----------++------v-------------++------------v-------------+
| tutoring_session   || thesis_progress    || academic_output_*        |
+--------+-----------++--------------------++--------------------------+
         |                                               |
+--------v-----------+                                   |
| tutoring_partic    |                                   |
| tutoring_observ    |                                   |
+--------------------+                                   |
         |                                               |
         +-------------------+---------------------------+
                             |
                   +---------v---------+
                   | evidence_evidence |
                   +-------------------+
```

---

## 3. Especificación Detallada por Módulo

### 3.1. Módulo: `apps.identity` (Autenticación y Seguridad)

#### Tabla: `identity_customuser`
* **Modelo Django:** `apps.identity.models.CustomUser`
* **Descripción:** Entidad central de autenticación y autorización del sistema. Reemplaza el modelo estándar de Django (`AbstractBaseUser`, `PermissionsMixin`).
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Default / Choices | Descripción |
  | :--- | :--- | :---: | :--- | :--- |
  | `id` | `BigAutoField` | No / No | Auto-incremental | Clave primaria. |
  | `password` | `CharField(128)` | No / No | — | Hash PBKDF2/SHA256 del password. |
  | `last_login` | `DateTimeField` | Sí / Sí | `NULL` | Fecha y hora del último inicio de sesión. |
  | `is_superuser` | `BooleanField` | No / No | `False` | Privilegios absolutos en el sistema. |
  | `email` | `EmailField(255)` | No / No | **Único (`unique=True`)** | Identificador principal de inicio de sesión (`USERNAME_FIELD`). |
  | `first_name` | `CharField(150)` | No / No | — | Nombres del usuario. |
  | `last_name` | `CharField(150)` | No / No | — | Apellidos del usuario. |
  | `role` | `CharField(30)` | No / No | `STUDENT` | Rol RBAC: `'STUDENT'`, `'TUTOR'`, `'COMMITTEE_MEMBER'`, `'PROGRAM_COORDINATOR'`, `'ACADEMIC_ADMIN'`, `'SYSTEM_ADMIN'`. |
  | `is_active` | `BooleanField` | No / No | `True` | Estatus operativo de la cuenta. |
  | `is_staff` | `BooleanField` | No / No | `False` | Acceso habilitado a la interfaz administrativa. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True` | Marca temporal de creación. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True` | Marca temporal de última modificación. |

* **Relaciones M2M Automáticas de Seguridad:**
  - `identity_customuser_groups` -> `auth_group(id)` (`CASCADE`)
  - `identity_customuser_user_permissions` -> `auth_permission(id)` (`CASCADE`)
* **Índices y Restricciones:**
  - `unique=True` en `email`.
  - Índice B-Tree implícito en `email` para autenticación $O(1)$ en endpoints de SimpleJWT.

---

### 3.2. Módulo: `apps.students` (Expedientes y Comités)

#### Tabla: `students_student`
* **Modelo Django:** `apps.students.models.Student`
* **Descripción:** Expediente maestro de información académica del estudiante doctoral.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Regla de Integridad |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `user_id` | `OneToOneField(CustomUser)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='student_profile'`. |
  | `matricula` | `CharField(20)` | No / No | `unique=True`, `db_index=True`. Clave pública de búsqueda. |
  | `nombre_completo` | `CharField(255)` | No / No | Nombre oficial registrado. |
  | `programa_doctoral` | `CharField(255)` | No / No | Default: `'Doctorado en Ciencias'`. |
  | `fecha_ingreso` | `DateField` | Sí / Sí | Default: `timezone.now`. |
  | `cohorte` | `CharField(20)` | No / No | `db_index=True` (ej. `'2024-A'`). |
  | `estatus_activo` | `BooleanField` | No / No | Default: `True`, `db_index=True`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

* **Índices Requeridos:**
  - `db_index=True` en `matricula`, `cohorte`, `estatus_activo` para acelerar el filtrado tabular masivo y reportes.

---

#### Tabla: `students_semester`
* **Modelo Django:** `apps.students.models.Semester`
* **Descripción:** Ciclo lectivo semestral cursado por el estudiante (Semestres 1 al 6).
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Restricciones |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='semesters'`. |
  | `numero` | `PositiveSmallIntegerField` | No / No | Rango: `1 <= numero <= 6`. |
  | `fecha_inicio` | `DateField` | No / No | Fecha de inicio del periodo. |
  | `fecha_fin` | `DateField` | No / No | Fecha de conclusión (`fecha_fin >= fecha_inicio`). |
  | `is_active` | `BooleanField` | No / No | Default: `True`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

* **Restricciones de Unicidad:**
  - `UniqueConstraint(fields=['student', 'numero'], name='unique_student_semester')`. Un estudiante no puede tener duplicado el mismo número de semestre.

---

#### Tabla: `students_academiccommittee`
* **Modelo Django:** `apps.students.models.AcademicCommittee`
* **Descripción:** Conformación oficial del comité tutorial del estudiante.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Choices |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='committee_members'`. |
  | `user_id` | `ForeignKey(CustomUser)` | No / No | `on_delete=models.CASCADE`, `related_name='committee_assignments'`. |
  | `rol_comite` | `CharField(30)` | No / No | Choices: `'ASESOR_PRINCIPAL'`, `'COASESOR'`, `'VOCAL'`, `'SECRETARIO'`. |
  | `fecha_asignacion` | `DateField` | No / No | Default: `timezone.now`. |
  | `is_active` | `BooleanField` | No / No | Default: `True`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

* **Restricciones de Integridad y Unicidad:**
  - Validación de dominio: Solo usuarios con `role in ['ASESOR', 'COORDINADOR']` pueden ser asignados.
  - `UniqueConstraint(fields=['student', 'user', 'rol_comite'], name='unique_student_user_committee_role')`.

---

### 3.3. Módulo: `apps.tutoring` (Sesiones y Minutas de Tutoría)

#### Tabla: `tutoring_tutoringsession`
* **Modelo Django:** `apps.tutoring.models.TutoringSession`
* **Descripción:** Registro de cada reunión de tutoría formal celebrada entre el estudiante y su comité.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Choices |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='tutoring_sessions'`. |
  | `semester_id` | `ForeignKey(Semester)` | No / No | `on_delete=models.CASCADE`, `related_name='tutoring_sessions'`. |
  | `fecha_sesion` | `DateField` | No / No | `db_index=True`. Fecha en que ocurrió la sesión. |
  | `modalidad` | `CharField(20)` | No / No | Choices: `'PRESENCIAL'`, `'VIRTUAL'`, `'HIBRIDA'`. Default: `'PRESENCIAL'`. |
  | `resumen` | `TextField` | No / No | Síntesis ejecutiva de la reunión. |
  | `proxima_reunion_fecha` | `DateField` | Sí / Sí | Fecha proyectada para el siguiente encuentro. |
  | `proxima_reunion_notas` | `TextField` | No / Sí | Default: `''`. Temas a preparar. |
  | `created_by_id` | `ForeignKey(CustomUser)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='registered_tutoring_sessions'`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

---

#### Tabla: `tutoring_tutoringparticipant`
* **Modelo Django:** `apps.tutoring.models.TutoringParticipant`
* **Descripción:** Lista de asistencia y roles de los académicos y estudiante en la sesión.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Choices |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `session_id` | `ForeignKey(TutoringSession)`| No / No | `on_delete=models.CASCADE`, `related_name='participants'`. |
  | `user_id` | `ForeignKey(CustomUser)` | No / No | `on_delete=models.CASCADE`, `related_name='tutoring_attendances'`. |
  | `rol_en_sesion` | `CharField(30)` | No / No | Choices: `'ESTUDIANTE'`, `'ASESOR_PRINCIPAL'`, `'COASESOR'`, `'VOCAL'`, `'SECRETARIO'`, `'INVITADO'`. |
  | `asistencia` | `BooleanField` | No / No | Default: `True`. |
  | `notas` | `CharField(255)` | No / Sí | Default: `''`. Justificación o comentarios. |

* **Restricciones de Unicidad:**
  - `UniqueConstraint(fields=['session', 'user'], name='unique_session_participant')`.

---

#### Tabla: `tutoring_tutoringobservation`
* **Modelo Django:** `apps.tutoring.models.TutoringObservation`
* **Descripción:** Observaciones técnicas puntuales emitidas por un docente en la sesión.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Descripción |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `session_id` | `ForeignKey(TutoringSession)`| No / No | `on_delete=models.CASCADE`, `related_name='observations'`. |
  | `autor_id` | `ForeignKey(CustomUser)` | No / No | `on_delete=models.CASCADE`, `related_name='tutoring_observations'`. |
  | `tema_revisado` / `titulo_tema` | `CharField(255)` | No / Sí | Título del tópico evaluado. |
  | `observaciones_detalladas` / `contenido`| `TextField` | No / Sí | Cuerpo de la recomendación o dictamen. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

---

### 3.4. Módulo: `apps.agreements` (Acuerdos, Compromisos y Auditoría)

#### Tabla: `agreements_agreement`
* **Modelo Django:** `apps.agreements.models.Agreement`
* **Descripción:** Compromiso académico formal con fecha de entrega y responsable.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Choices |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `session_id` | `ForeignKey(TutoringSession)`| Sí / Sí | `on_delete=models.SET_NULL`, `related_name='agreements'`. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='agreements'`, `db_index=True`. |
  | `descripcion` | `TextField` | No / No | Detalle claro del entregable comprometido. |
  | `responsable_id` | `ForeignKey(CustomUser)` | No / No | `on_delete=models.CASCADE`, `related_name='assigned_agreements'`. |
  | `fecha_limite` | `DateField` | No / No | `db_index=True`. Fecha perentoria de cumplimiento. |
  | `estado` | `CharField(20)` | No / No | Choices: `'PENDIENTE'`, `'EN_PROCESO'`, `'CONCLUIDO'`, `'VENCIDO'`. Default: `'PENDIENTE'`, `db_index=True`. |
  | `fecha_conclusion`| `DateField` | Sí / Sí | Fecha en que pasó a `'CONCLUIDO'`. |
  | `created_by_id` | `ForeignKey(CustomUser)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='created_agreements'`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

* **Reglas de Negocio Automatizadas:**
  - Transición automática a `'VENCIDO'` si `fecha_limite < hoy` y `estado != 'CONCLUIDO'`.

---

#### Tabla: `agreements_agreementauditlog`
* **Modelo Django:** `apps.agreements.models.AgreementAuditLog`
* **Descripción:** Bitácora inmutable de trazabilidad sobre cada cambio de estado de un acuerdo.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `agreement_id` | `ForeignKey(Agreement)` | No / No | `on_delete=models.CASCADE`, `related_name='audit_logs'`. |
  | `user_id` | `ForeignKey(CustomUser)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='agreement_status_changes'`. |
  | `estado_anterior` | `CharField(20)` | No / No | Estado previo al evento. |
  | `estado_nuevo` | `CharField(20)` | No / No | Nuevo estado aplicado. |
  | `comentario` | `TextField` | No / Sí | Default: `''`. Motivo del cambio. |
  | `fecha_cambio` | `DateTimeField` | No / No | `auto_now_add=True`. |

---

### 3.5. Módulo: `apps.thesis` (Avance de Tesis Doctoral)

#### Tabla: `thesis_thesisprogress`
* **Modelo Django:** `apps.thesis.models.ThesisProgress`
* **Descripción:** Registro cuantitativo y cualitativo del avance del proyecto de tesis doctoral por semestre.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Validaciones |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='thesis_progresses'`, `db_index=True`. |
  | `semester_id` | `ForeignKey(Semester)` | No / No | `on_delete=models.CASCADE`, `related_name='thesis_progresses'`, `db_index=True`. |
  | `porcentaje_avance`| `PositiveSmallIntegerField`| No / No | Validación: `0 <= porcentaje_avance <= 100`. |
  | `componentes_json` | `JSONField` | No / Sí | Estructura canónica: `{"protocolo": N, "estadoArte": N, "marcoTeorico": N, "metodologia": N, "analisis": N, "redaccion": N}`. |
  | `observaciones` | `TextField` | No / Sí | Default: `''`. Notas del comité. |
  | `registrado_por_id`| `ForeignKey(CustomUser)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='registered_thesis_progresses'`. |
  | `fecha_registro` | `DateField` | No / No | Default: `timezone.now`, `db_index=True`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

---

### 3.6. Módulo: `apps.academic_output` (Producción Científica y Estancias)

#### Tabla: `academic_output_publication`
* **Modelo Django:** `apps.academic_output.models.Publication`
* **Descripción:** Registro de artículos en revistas indexadas (JCR/Scopus, Conacyt) y capítulos de libro.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Choices |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='publications'`, `db_index=True`. |
  | `semester_id` | `ForeignKey(Semester)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='publications'`. |
  | `titulo` | `CharField(255)` | No / No | Título de la obra. |
  | `autores_texto` | `TextField` | No / No | Relación de autores (formato APA/IEEE). |
  | `tipo` | `CharField(30)` | No / No | Choices: `'ARTICULO_JCR'`, `'ARTICULO_CONACYT'`, `'CAPITULO_LIBRO'`, `'OTRO'`. |
  | `revista_editorial`| `CharField(255)` | No / No | Nombre de la revista o editorial. |
  | `estado` | `CharField(30)` | No / No | Choices: `'PREPARACION'`, `'ENVIADO'`, `'EN_REVISION'`, `'ACEPTADO'`, `'PUBLICADO'`. Default: `'PREPARACION'`. |
  | `fecha_publicacion`| `DateField` | Sí / Sí | `db_index=True`. |
  | `doi_url` | `CharField(500)` | No / Sí | Default: `''`. Enlace persistente. |
  | `evidencia_id` | `ForeignKey(Evidence)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='publications'`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

---

#### Tabla: `academic_output_academicevent`
* **Modelo Django:** `apps.academic_output.models.AcademicEvent`
* **Descripción:** Ponencias y presentaciones en congresos, coloquios y simposios.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Choices |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='academic_events'`, `db_index=True`. |
  | `semester_id` | `ForeignKey(Semester)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='academic_events'`. |
  | `tipo_evento` | `CharField(40)` | No / No | Choices: `'CONGRESO_NACIONAL'`, `'CONGRESO_INTERNACIONAL'`, `'COLOQUIO'`. |
  | `nombre_evento` | `CharField(255)` | No / No | Nombre oficial del congreso/simposio. |
  | `titulo_ponencia` | `CharField(255)` | No / No | Título de la conferencia dictada. |
  | `fecha_presentacion`| `DateField` | No / No | `db_index=True`. |
  | `sede_lugar` | `CharField(255)` | No / No | Ciudad, país o institución sede. |
  | `modalidad` | `CharField(20)` | No / No | Choices: `'PRESENCIAL'`, `'VIRTUAL'`, `'HIBRIDA'`. Default: `'PRESENCIAL'`. |
  | `evidencia_id` | `ForeignKey(Evidence)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='academic_events'`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

---

#### Tabla: `academic_output_researchstay`
* **Modelo Django:** `apps.academic_output.models.ResearchStay`
* **Descripción:** Estancias de investigación científica nacional e internacional.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='research_stays'`, `db_index=True`. |
  | `semester_id` | `ForeignKey(Semester)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='research_stays'`. |
  | `institucion_receptora`| `CharField(255)` | No / No | Universidad o centro de investigación. |
  | `pais` | `CharField(100)` | No / No | País de la estancia. |
  | `fecha_inicio` | `DateField` | No / No | `db_index=True`. |
  | `fecha_fin` | `DateField` | No / No | Fecha de conclusión (`fecha_fin >= fecha_inicio`). |
  | `responsable_estancia`| `CharField(255)`| No / No | Investigador anfitrión responsable. |
  | `objetivos` | `TextField` | No / Sí | Default: `''`. |
  | `resultados` | `TextField` | No / Sí | Default: `''`. |
  | `evidencia_id` | `ForeignKey(Evidence)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='research_stays'`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

---

#### Tabla: `academic_output_otherproduct`
* **Modelo Django:** `apps.academic_output.models.OtherProduct`
* **Descripción:** Software registrado, patentes, prototipos industriales y bases de datos.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Choices |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='other_products'`, `db_index=True`. |
  | `semester_id` | `ForeignKey(Semester)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='other_products'`. |
  | `tipo_producto` | `CharField(30)` | No / No | Choices: `'SOFTWARE'`, `'PROTOTIPO'`, `'PATENTE'`, `'BASE_DATOS'`, `'OTRO'`. |
  | `titulo` | `CharField(255)` | No / No | Nombre o denominación técnica. |
  | `descripcion` | `TextField` | No / No | Características técnicas. |
  | `fecha_registro` | `DateField` | No / No | Default: `timezone.now`, `db_index=True`. |
  | `evidencia_id` | `ForeignKey(Evidence)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='other_products'`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |
  | `updated_at` | `DateTimeField` | No / No | `auto_now=True`. |

---

### 3.7. Módulo: `apps.evidence` (Repositorio de Archivos y DOIs)

#### Tabla: `evidence_evidence`
* **Modelo Django:** `apps.evidence.models.Evidence`
* **Descripción:** Depósito polimórfico de soporte documental (archivos físicos y DOIs persistentes) vinculado a cualquier actividad académica del estudiante.
* **Campos:**
  | Campo | Tipo Django | Nulo/Blanco | Atributos / Restricciones |
  | :--- | :--- | :---: | :--- |
  | `id` | `BigAutoField` | No / No | Clave primaria. |
  | `student_id` | `ForeignKey(Student)` | No / No | `on_delete=models.CASCADE`, `related_name='evidences'`, `db_index=True`. |
  | `semester_id` | `ForeignKey(Semester)` | Sí / Sí | `on_delete=models.SET_NULL`, `related_name='evidences'`. |
  | `tipo` | `CharField(20)` | No / No | Choices: `'ARCHIVO_LOCAL'`, `'ENLACE_DOI'`. Default: `'ARCHIVO_LOCAL'`, `db_index=True`. |
  | `actividad_tipo` | `CharField(20)` | No / No | Choices: `'TUTORIA'`, `'ACUERDO'`, `'TESIS'`, `'OTRO'`. Default: `'OTRO'`, `db_index=True`. |
  | `actividad_id` | `PositiveIntegerField` | Sí / Sí | ID de la entidad vinculada (`db_index=True`). |
  | `titulo` | `CharField(255)` | No / No | Nombre descriptivo del comprobante. |
  | `descripcion` | `TextField` | No / Sí | Default: `''`. |
  | `archivo_adjunto` | `FileField` | Sí / Sí | Ruta: `evidence/%Y/%m/`. Validación: Máx 15MB, formatos PDF, PNG, JPG, DOCX, ZIP. |
  | `enlace_url` / `url_doi`| `CharField(500)` | No / Sí | Default: `''`. Validador Regex de URL/DOI estándar. |
  | `mime_type` | `CharField(100)` | No / Sí | Detección automática en backend (`application/pdf`, etc.). |
  | `file_size_bytes` | `BigIntegerField` | No / No | Default: `0`. Tamaño en bytes. |
  | `fecha_carga` | `DateField` | No / No | Default: `timezone.now`, `db_index=True`. |
  | `cargado_por_id` / `created_by_id`| `ForeignKey(CustomUser)`| Sí / Sí | `on_delete=models.SET_NULL`, `related_name='uploaded_evidences'`. |
  | `created_at` | `DateTimeField` | No / No | `auto_now_add=True`. |

---

### 3.8. Módulos Analíticos y de Agregación: `apps.monitoring` y `apps.reporting`

Los módulos `monitoring` y `reporting` **no persisten tablas independientes**, sino que operan como **capas de servicios de agregación y cómputo de alto rendimiento** sobre el grafo de tablas relacionales:

1. **`SupervisionRulesEngine` (`apps.monitoring.supervision_rules`):**
   - Ejecuta consultas compuestas indexadas sobre `students_student`, `tutoring_tutoringsession`, `agreements_agreement` y `evidence_evidence` para calcular semáforos de riesgo en tiempo real (alumnos sin tutoría >45 días, acuerdos concluidos sin evidencia adjunta, tutorías próximas <=7 días).
2. **`TimelineService` (`apps.monitoring.views.TimelineView`):**
   - Agrega cronológicamente eventos ordenados por `db_index` de fecha desde `tutoring_tutoringsession`, `agreements_agreement`, `thesis_thesisprogress`, `academic_output_*` y `evidence_evidence`.
3. **`DossierReportEngine` (`apps.reporting.pdf_export` y `excel_export`):**
   - Genera reportes institucionales multi-hoja en Excel (`openpyxl`) y PDF vectorizado (`reportlab`) consolidando el historial íntegro del expediente.

---

### 3.9. Subsistema de Seguridad y Sesiones (Django Core)

| Tabla | Propósito |
| :--- | :--- |
| `auth_group` | Definición de grupos de usuarios. |
| `auth_group_permissions` | M2M entre grupos y permisos del sistema. |
| `auth_permission` | Catálogo de permisos automáticos de Django. |
| `django_admin_log` | Bitácora de auditoría interna de acciones de superusuario. |
| `django_content_type` | Registro de tipos de modelos instalados. |
| `django_migrations` | Registro de versiones de migraciones ejecutadas. |
| `django_session` | Almacenamiento de sesiones web de usuario. |

---

## 4. Política de Integridad Referencial y Rendimiento

1. **Borrado en Cascada (`CASCADE`):**  
   Aplicado exclusivamente a datos subordinados directos del estudiante (`semesters`, `committee_members`, `tutoring_sessions`, `agreements`, `thesis_progresses`, `publications`, `academic_events`, `research_stays`, `other_products`, `evidences`). Si un expediente de estudiante se elimina, se purga todo su árbol subordinado sin dejar registros huérfanos.
2. **Preservación de Auditoría (`SET_NULL`):**  
   Aplicado a relaciones con usuarios creadores (`created_by`, `registrado_por`, `cargado_por`). Si una cuenta de usuario es dada de baja, las minutas, acuerdos y evidencias registradas permanecen intactas en el expediente histórico.
3. **Indexación Estratégica (`db_index=True`):**  
   Todos los campos temporales (`fecha_sesion`, `fecha_limite`, `fecha_registro`, `fecha_publicacion`, `fecha_presentacion`, `fecha_inicio`, `fecha_carga`) y de discriminación de estado (`estado`, `tipo`, `estatus_activo`, `cohorte`, `matricula`) cuentan con índices B-Tree para garantizar respuestas menores a **50 ms** en consultas analíticas y construcción del timeline.
