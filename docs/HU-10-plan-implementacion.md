# HU-10 — Plan de Implementación: Programar Próxima Reunión

## Metadatos
- **ID:** HU-10
- **Épica:** E03 — Tutorías
- **Sprint:** Sprint 2
- **Equipo Responsable:** Equipo 1
- **Prioridad:** Medium (Valor Medio)
- **Story Points:** 3 SP
- **Prerrequisitos de Dominio:** HU-07 (Registrar sesión de tutoría)

---

## 1. Definición y Objetivo
**Como** participante autorizado de una sesión de tutoría,  
**quiero** programar la fecha tentativa y notas preparatorias de la siguiente reunión de seguimiento,  
**para** asegurar la continuidad del acompañamiento doctoral y clarificar los entregables esperados para la próxima sesión.

---

## 2. Criterios de Aceptación y Reglas de Negocio
- **CA-10.1:** La fecha de próxima reunión debe ser estrictamente posterior a la fecha en que se celebró la tutoría actual.
- **CA-10.2:** Las notas de la próxima reunión son opcionales, pero si se proporcionan, debe haberse definido obligatoriamente una fecha de próxima reunión.
- **CA-10.3:** Las notas no pueden exceder 500 caracteres y deben almacenar indicaciones concisas de preparación.
- **CA-10.4:** Esta funcionalidad no implementa un calendario interactivo ni sincronización con servicios externos (Google Calendar/Outlook); documenta el compromiso acordado en la sesión.
- **CA-10.5:** La información debe poder registrarse al momento de crear la sesión (HU-07) o actualizarse posteriormente por integrantes autorizados.

---

## 3. Fase 1: Contratos de API (`/api/v1/`)

### 3.1. Campos en `TutoringSession`
Los campos forman parte integral del recurso de sesión:
- `proxima_reunion_fecha`: `date` (`YYYY-MM-DD` nullable)
- `proxima_reunion_notas`: `string` (nullable, max 500)

### 3.2. Payload de Ejemplo (`POST` o `PATCH /api/v1/tutoring-sessions/{id}/`)
```json
{
  "proxima_reunion_fecha": "2026-10-20",
  "proxima_reunion_notas": "Revisión final de la formulación de hipótesis para envío a comité de bioética."
}
```

#### Validaciones de Error:
- `400 Bad Request` si `proxima_reunion_fecha <= fecha_sesion`.
- `400 Bad Request` si `proxima_reunion_notas` está presente pero `proxima_reunion_fecha` es nula.

---

## 4. Fase 2: Backend Django (App `nexus`)

### 4.1. Modelo `TutoringSession`
- `proxima_reunion_fecha = models.DateField(null=True, blank=True)`
- `proxima_reunion_notas = models.CharField(max_length=500, blank=True, default='')`

### 4.2. Validación en Serializer
- En `TutoringSessionCreateSerializer` y `TutoringSessionSerializer`:
  ```python
  def validate(self, attrs):
      fecha_sesion = attrs.get('fecha_sesion') or getattr(self.instance, 'fecha_sesion', None)
      prox_fecha = attrs.get('proxima_reunion_fecha')
      prox_notas = attrs.get('proxima_reunion_notas')

      if prox_notas and not prox_fecha:
          raise serializers.ValidationError({
              'proxima_reunion_fecha': 'Debe especificar una fecha si incluye notas preparatorias.'
          })
      if prox_fecha and fecha_sesion and prox_fecha <= fecha_sesion:
          raise serializers.ValidationError({
              'proxima_reunion_fecha': 'La fecha de próxima reunión debe ser posterior a la fecha de la sesión.'
          })
      return attrs
  ```

### 4.3. Pruebas Backend (`test_hu10.py`)
- Programación válida con fecha y notas $\rightarrow$ `200/201 OK`.
- Fecha igual o anterior a la sesión $\rightarrow$ `400 Bad Request`.
- Notas sin fecha $\rightarrow$ `400 Bad Request`.

---

## 5. Fase 3: Frontend Angular 20 Standalone

### 5.1. Componentes y UI
- Sección desplegable o complementaria en `TutoringFormComponent`:
  - Campo `proxima_reunion_fecha` (`<input type="date">`).
  - Campo `proxima_reunion_notas` (`<input type="text">` con contador de caracteres 0/500).
- Visualización destacada en `StudentOverviewComponent`:
  - Card "Próxima Reunión" con icono de calendario, fecha legible y badge semafórico de tiempo restante.

### 5.2. Accesibilidad (WCAG 2.1 AA)
- Mensaje de validación accesible en tiempo real si el usuario ingresa una fecha anterior a la sesión.
- Atributos `aria-describedby` vinculados al hint del campo.

---

## 6. Definition of Done (DoD)
- [ ] Validaciones cruzadas de fecha y notas aprobadas en tests backend (`test_hu10.py`).
- [ ] Integración visual en el formulario de tutoría y card de resumen del estudiante.
- [ ] Pruebas unitarias de validación reactiva en Angular.
