# HU-21 — Plan de Implementación: Cargar Evidencias Documentales

## Metadatos
- **ID:** HU-21
- **Épica:** E07 — Evidencias
- **Sprint:** Sprint 3
- **Equipo Responsable:** Equipo 2
- **Prioridad:** Must (Alto Valor)
- **Story Points:** 5 SP
- **Prerrequisitos de Dominio:** HU-01 (Autenticación), HU-03 (Registrar estudiante), HU-05 (Gestionar semestres)

---

## 1. Definición y Objetivo
**Como** estudiante o integrante autorizado del comité tutorial,  
**quiero** cargar archivos digitales de evidencia documental (hasta un límite estricto de 15 MiB) asociados a una actividad académica específica,  
**para** respaldar probatoriamente los avances de tesis, tutorías celebradas, acuerdos concluidos y productos de investigación.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-21.1:** Toda evidencia física debe vincularse obligatoriamente a:
  - Un estudiante existente.
  - Un semestre académico perteneciente a dicho estudiante.
  - Un tipo de actividad académica (`actividad_tipo` $\in$ `['TUTORIA', 'ACUERDO', 'TESIS', 'OTRO']`).
  - Un identificador de actividad válido (`actividad_id`) que exista y pertenezca al mismo estudiante (si `actividad_tipo` es distinto de `OTRO`).
- **CA-21.2:** Tamaño y formato de archivo:
  - Límite máximo estricto: **15 MiB** (`15 * 1024 * 1024` = 15,728,640 bytes). Se rechaza cualquier archivo de `15 MiB + 1 byte`.
  - Extensiones y firmas binarias admitidas: PDF, PNG, JPG/JPEG, DOCX y ZIP.
  - Se valida el MIME real y los números mágicos del archivo, no solo la extensión declarada.
- **CA-21.3:** Control de descarga y acceso:
  - Solo el estudiante evaluado, los miembros de su comité tutorial y el coordinador con permiso global pueden acceder o descargar el archivo de evidencia (`403 Forbidden` para otros usuarios).
- **CA-21.4:** Si ocurre un error en la transacción de base de datos, el archivo subido en el sistema de archivos o almacenamiento temporal debe eliminarse de inmediato para evitar archivos huérfanos.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Subir Evidencia (Multipart)
- **Ruta:** `POST /api/v1/evidence/`
- **Content-Type:** `multipart/form-data`
- **Autenticación:** `Bearer <access_token>`

#### Form Data Fields:
- `student`: 4 (entero, required)
- `semester`: 1 (entero, optional)
- `actividad_tipo`: "TUTORIA" (string, choices: `TUTORIA`, `ACUERDO`, `TESIS`, `OTRO`)
- `actividad_id`: 12 (entero, required si actividad_tipo != 'OTRO')
- `titulo`: "Minuta firmada de la sesión de tutoría 1" (string, required, max 255)
- `descripcion`: "Documento con firmas autógrafas de asesor y estudiante." (string, optional)
- `archivo_adjunto`: `<archivo binario>` (required)

#### Response Payload (`201 Created`):
```json
{
  "id": 14,
  "student": 4,
  "semester": 1,
  "tipo": "ARCHIVO_LOCAL",
  "actividad_tipo": "TUTORIA",
  "actividad_id": 12,
  "titulo": "Minuta firmada de la sesión de tutoría 1",
  "descripcion": "Documento con firmas autógrafas de asesor y estudiante.",
  "archivo_adjunto": "http://localhost:8000/media/evidencias/2026/09/minuta_1.pdf",
  "enlace_url": "",
  "fecha_carga": "2026-09-14",
  "created_by": 15
}
```

#### Respuestas de Error:
- `400 Bad Request`: Archivo superior a 15 MiB, extensión/MIME no permitido o `actividad_id` no pertenece al estudiante.
- `403 Forbidden`: Usuario no tiene acceso relacional sobre el estudiante.
- `404 Not Found`: Estudiante, semestre o actividad referida inexistente.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Persistencia (`nexus_evidence`)
- Modelo: `Evidence` en `Backend/nexus/nexus/models.py`.
- Campos:
  - `student`: ForeignKey(`Student`, on_delete=CASCADE, related_name='evidences')
  - `semester`: ForeignKey(`Semester`, null=True, blank=True, on_delete=SET_NULL)
  - `tipo`: CharField(max_length=20, choices=EvidenceType.choices, default=LOCAL_FILE)
  - `actividad_tipo`: CharField(max_length=20, choices=ActivityType.choices)
  - `actividad_id`: PositiveIntegerField(null=True, blank=True)
  - `titulo`: CharField(max_length=255)
  - `descripcion`: TextField(blank=True, default='')
  - `archivo_adjunto`: FileField(upload_to='evidencias/%Y/%m/', validators=[validate_file_size_15mib, validate_file_extension])
  - `created_by`: ForeignKey(`CustomUser`, on_delete=SET_NULL, null=True)
  - `fecha_carga`: DateField(auto_now_add=True)

### 4.2. Validación de Integridad de Actividad
En `EvidenceSerializer.validate()`:
```python
def validate(self, attrs):
    # 1. Validación de tamaño y MIME binario
    archivo = attrs.get('archivo_adjunto')
    if archivo and archivo.size > 15 * 1024 * 1024:
        raise serializers.ValidationError({'archivo_adjunto': 'El archivo excede el límite máximo de 15 MiB.'})

    # 2. Validación de coherencia de actividad_id
    actividad_tipo = attrs.get('actividad_tipo')
    actividad_id = attrs.get('actividad_id')
    student = attrs.get('student')

    if actividad_tipo == Evidence.ActivityType.TUTORIA:
        if not TutoringSession.objects.filter(id=actividad_id, student=student).exists():
            raise serializers.ValidationError({'actividad_id': 'La sesión de tutoría especificada no existe o no pertenece al alumno.'})
    elif actividad_tipo == Evidence.ActivityType.ACUERDO:
        if not Agreement.objects.filter(id=actividad_id, student=student).exists():
            raise serializers.ValidationError({'actividad_id': 'El acuerdo especificado no existe o no pertenece al alumno.'})
    elif actividad_tipo == Evidence.ActivityType.TESIS:
        if not ThesisProgress.objects.filter(id=actividad_id, student=student).exists():
            raise serializers.ValidationError({'actividad_id': 'El registro de avance de tesis no existe o no pertenece al alumno.'})
    return attrs
```

### 4.3. Pruebas Backend (`test_hu21.py`)
- Archivo de 15 MiB exactos $\rightarrow$ `201 Created`.
- Archivo de 15 MiB + 1 byte $\rightarrow$ `400 Bad Request`.
- Archivo con extensión `.pdf` pero contenido de script ejecutable $\rightarrow$ `400 Bad Request` por firma binaria inválida.
- Intento de asociar `actividad_id` perteneciente a otro estudiante $\rightarrow$ `400 Bad Request`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Componente: `EvidenceUploadComponent` (`src/app/expediente/evidence-upload.ts`).
  - Input file estilizado con drag-and-drop y botón "Seleccionar archivo".
  - Selectores para `semestre`, `actividad_tipo` y selector dependiente para `actividad_id`.
  - Validación en cliente antes de la carga: si el archivo supera 15 MiB, bloquear inmediatamente y mostrar mensaje claro en pantalla.
  - Barra de progreso de carga `[progress]` durante la transmisión multipart.
- Integración en la vista de expediente: solo visible y habilitado si el usuario autenticado es el estudiante propietario o integrante de su comité.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Input con atributo `accept=".pdf,.png,.jpg,.jpeg,.docx,.zip"`.
- Mensajes de error en línea asociados mediante `aria-describedby` al control de archivo.
- Estado de carga indicado con `aria-busy="true"` en el botón de subida.

---

## 6. Definition of Done (DoD)
- [ ] Endpoint `POST /api/v1/evidence/` implementado con validación de 15 MiB y firma binaria.
- [ ] Validación de integridad referencial de `actividad_id` aprobada en tests backend.
- [ ] Pruebas unitarias backend (`test_hu21.py`) y frontend aprobadas al 100%.
- [ ] Componente `EvidenceUploadComponent` integrado en el expediente con prevalidación de tamaño y accesibilidad WCAG 2.1 AA.
