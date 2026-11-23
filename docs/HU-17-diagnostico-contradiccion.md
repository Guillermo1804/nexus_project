# HU-17 — Diagnóstico de Contradicción: Subir archivo no permite registrar publicación

## Contexto

Al intentar registrar una publicación con estado `ACEPTADO` o `PUBLICADO` y subiendo un archivo de evidencia a través del `PublicationFormComponent`, el usuario recibe un **400 Bad Request** del backend (`/api/v1/academic-output/publications/`).

## Diagnóstico

El problema radica en la interacción entre el selector de archivos y el formulario reactivo de Angular:

### 1. El input de archivo no actualiza el form control

- **Archivo:** `publication-form.ts:117-123`
- **Método:** `onFileChange(event: Event)`
- **Comportamiento actual:** Al seleccionar un archivo, éste se almacena en `this.selectedFile`, pero **no se actualiza el valor del form control `evidencia`**.
- **Consecuencia:** El control `evidencia` permanece en `null`.

### 2. Validador dinámico bloquea el envío

- **Archivo:** `publication-form.ts:73-85`
- **Método:** `initializeForm()`
- **Comportamiento actual:** Cuando el estado es `ACEPTADO` o `PUBLICADO`, se añade `Validators.required` al control `evidencia`.
- **Consecuencia:** Como el control `evidencia` es `null`, el formulario queda **inválido** y `onSubmit` (**publication-form.ts:126-129**) regressa temprano sin hacer nada.

### 3. Flujo de subida de evidencia no se ejecuta

- **Archivo:** `publication-form.ts:169-190`
- **Método:** `onSubmit()`
- **Comportamiento actual:** La lógica de subir el archivo (`uploadPublicationEvidence`) solo se ejecuta si `this.selectedFile` está definido. Pero como el formulario ya es inválido, `onSubmit` nunca llega a ese punto.

### 4. Caso de borde: evidencia previa

Si el usuario ya tiene una evidencia subida (`uploadedEvidenceId` definido), el formulario puede pasar la validación. Pero si el payload final no incluye `doi` ni `evidencia` válido, el backend devuelve **400 Bad Request**.

## Plan de Solución

### Paso 1: Corregir la validación del formulario

- **Archivo a modificar:** `publication-form.ts`
- ** Cambio:** Eliminar `Validators.required` del control `evidencia`. El upload de archivos se maneja por separado, no a través del form control.
- **Mantener:** `Validators.required` en `doi` cuando el estado sea `ACEPTADO` o `PUBLICADO`.
- **Rationale:** El backend ya valida correctamente que al menos uno de los dos campos (`doi` o `evidencia`) esté presente. La validación del lado del cliente debe ser más permisiva para permitir el flujo de subida de archivos.

### Paso 2: Asegurar que el payload siempre tenga evidencia o DOI

- **Archivo a modificar:** `publication-form.ts`
- ** Cambio:** En `onSubmit`, después de subir el archivo, verificar que `payload.evidencia` esté definido antes de enviar.
- **Rationale:** Prevenir envíos parciales que provoquen 400 del backend.

### Paso 3: Limpiar el estado de carga en todos los caminos

- **Archivo a modificar:** `publication-form.ts`
- ** Cambio:** Asegurarse de que `this.loading` se resetee en todos los caminos de error.
- **Rationale:** Evitar que la interfaz quede bloqueada después de un error.

## Archivos Afectados

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `src/app/academic-output/publication-form.ts` | 61-86, 125-194 | Corregir validadores y flujo de submit |
| `src/app/academic-output/publication-form.html` | 51-63 | Ajustar bindings si es necesario |

## Criterios de Aceptación

- [ ] Al subir un archivo con estado `ACEPTADO` o `PUBLICADO`, la publicación se registra correctamente (201 Created).
- [ ] Al proporcionar solo `doi` (sin archivo) con estado `ACEPTADO` o `PUBLICADO`, la publicación se registra correctamente.
- [ ] Al intentar registrar con estado `ACEPTADO` o `PUBLICADO` sin `doi` ni archivo, se muestra un error claro.
- [ ] Estados `PREPARACION`, `ENVIADO`, `EN_REVISION` no requieren `doi` ni evidencia.