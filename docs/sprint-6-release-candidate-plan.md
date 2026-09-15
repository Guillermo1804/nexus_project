# Sprint 6 — Plan Maestro: Release Candidate, Hardening y Despliegue

## Metadatos
- **Sprint:** Sprint 6 (Sprint de Cierre)
- **Equipos Participantes:** Equipo 1, Equipo 2, Equipo 3 (Unificados)
- **Objetivo Central:** Release Candidate 1.0 (Versión Final Demostrable y Estable)
- **Fecha Límite de Entrega:** 23 de Noviembre
- **Regla Fundamental de Alcance:** **Cero funcionalidades nuevas.** Todo el esfuerzo se concentra en estabilización, pruebas integrales, accesibilidad WCAG 2.1 AA, seguridad, auditoría, documentación y despliegue.

---

## 1. Objetivos del Sprint 6
1. **Hardening de Seguridad:** Auditar y cerrar cualquier vulnerabilidad residual (RBAC, JWT, CORS, HSTS, variables de entorno, saneamiento de entradas).
2. **Accesibilidad Integral (WCAG 2.1 Nivel AA):** Garantizar operabilidad 100% por teclado, contrastes cromáticos normativos, jerarquía de encabezados, lectores de pantalla y soporte para `prefers-reduced-motion`.
3. **Optimización de Rendimiento:** Asegurar consultas optimizadas sin N+1, índices de base de datos adecuados, presupuestos de compilación frontend respetados y compresión de activos.
4. **Batería de Pruebas Integrales:** Ejecución de pruebas backend exhaustivas (cobertura >85%), pruebas frontend completas, pruebas de carga básica y verificación de flujos de extremo a extremo.
5. **Documentación Técnica y Manuales:** Manual de despliegue en producción con Docker, guía de usuario por rol y bitácora técnica de arquitectura final.
6. **Despliegue y Release Candidate:** Empaquetado final en contenedores Docker validados, base de datos de demostración lista y etiquetado formal del tag `v1.0.0-rc1` en la rama `main`.

---

## 2. Eje 1: Hardening de Seguridad y RBAC

### 2.1. Lista de Verificación de Seguridad Backend
- [ ] Ejecución de `python manage.py check --deploy` en modo estricto (`DJANGO_DEBUG=False`).
- [ ] Validación de cookies seguras: `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`.
- [ ] HSTS activo: `SECURE_HSTS_SECONDS=31536000`, `SECURE_HSTS_INCLUDE_SUBDOMAINS=True`, `SECURE_HSTS_PRELOAD=True`.
- [ ] Redirección forzada a HTTPS: `SECURE_SSL_REDIRECT=True`.
- [ ] `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` configurados estrictamente desde variables de entorno (rechazar comodines `*`).
- [ ] Rotación y lista negra de JWT (`rest_framework_simplejwt.token_blacklist`): revocación verificada de refresh tokens tras logout.
- [ ] Validación de tipos MIME y números mágicos en todas las cargas de archivos de evidencia.
- [ ] Auditoría de inyección SQL y control de acceso objeto por objeto (prevenir IDOR).

### 2.2. Seguridad Frontend
- [ ] Confirmar ausencia total de datos sensibles o secretos en el bundle compilado.
- [ ] Prevención de XSS en interpolaciones de plantillas Angular.
- [ ] Encabezado `Authorization: Bearer` inyectado exclusivamente en rutas pertenecientes a la API institucional.

---

## 3. Eje 2: Accesibilidad Web (WCAG 2.1 Nivel AA)

### 3.1. Pruebas Automatizadas con `axe-core`
- Integrar auditoría con `@axe-core/karma` o `pa11y` sobre las rutas clave:
  - `/login`
  - `/home`
  - `/expediente/:id`
  - `/coordinator/dashboard`
  - `/coordinator/students/new`
  - `/coordinator/committee`
  - `/admin/roles`
  - `/admin/audit`
- Criterio de aceptación: **0 violaciones críticas o graves**.

### 3.2. Pruebas Manuales de Interacción
- **Navegación 100% por Teclado:**
  - Orden lógico de tabulación (`Tab` y `Shift+Tab`).
  - Indicador visual de foco evidente (`focus-visible`) en todos los elementos interactivos.
  - Tecla `Escape` cierra modales, drawers y menús desplegables.
  - Trampa de foco (*focus trap*) activa en diálogos modales; foco retornado al disparador al cerrar.
- **Lectores de Pantalla (NVDA / Orca):**
  - Todos los botones tienen nombre accesible (`aria-label` o texto visible).
  - Tablas con `<caption>` y atributos `scope="col"` en encabezados.
  - Estados dinámicos y alertas comunicados mediante `aria-live="polite"` o `role="alert"`.
  - Iconos decorativos marcados con `aria-hidden="true"`.
- **Diseño Universal:**
  - Contraste de texto y elementos gráficos $\ge 4.5:1$ contra el fondo (validado con tokens Inter).
  - La información semafórica no depende exclusivamente del color (acompañada siempre de texto o icono explícito).
  - Zoom de navegador al 200% y 400% sin pérdida de contenido ni superposiciones horizontales.
  - Respeto a preferencias de usuario: `@media (prefers-reduced-motion: reduce)` desactiva animaciones.

---

## 4. Eje 3: Optimización y Presupuestos de Compilación

### 4.1. Frontend Angular
- Resolver advertencias de presupuesto CSS en `angular.json`:
  - Componentes `home.scss`, `student-overview.scss` y `committee-management.scss` optimizados para cumplir los límites presupuestarios (warning 4 kB, error 8 kB).
- Extracción de utilidades comunes y estilos compartidos en `src/styles.scss`.
- Compilación final en modo producción:
  ```bash
  pnpm build
  ```
- Verificación del tamaño del bundle: chunks iniciales $< 500 \text{ kB}$.

### 4.2. Backend Django y Base de Datos
- Revisión de consultas ORM en endpoints clave (`overview`, `timeline`, `dashboard`, `dossier`):
  - Inclusión de `select_related` y `prefetch_related` para garantizar $\le 5$ consultas SQL por petición de lectura.
- Verificación de índices B-Tree en campos de filtrado frecuente (`student_id`, `semester_id`, `fecha_sesion`, `fecha_limite`, `matricula`).

---

## 5. Eje 4: Suite de Pruebas Integradas y de Regresión

### 5.1. Batería Completa de Pruebas
1. **Backend:**
   ```bash
   cd Backend/nexus
   python manage.py test nexus -v 2
   ```
   - Cobertura esperada: >85% de líneas en modelos, serializers y vistas.
   - Criterio de éxito: **100% de pruebas aprobadas (0 fallos, 0 errores)**.
2. **Frontend:**
   ```bash
   cd FrontEnd/nexus_project
   pnpm test --watch=false --browsers=ChromeHeadless
   ```
   - Criterio de éxito: **100% de pruebas aprobadas (0 fallos)**.

### 5.2. Verificación del Flujo Principal de Demostración (End-to-End Manual)
Ejecución del escenario central de punta a punta frente al comité evaluador:
1. `Coordinador` inicia sesión con credenciales institucionales.
2. `Coordinador` da de alta a un nuevo doctorando (`HU-03`) con matrícula de 20 caracteres y le asigna su comité tutorial (`HU-04`).
3. `Coordinador` genera el Semestre 1 (`HU-05`).
4. `Asesor Principal` inicia sesión y registra la primera sesión de tutoría (`HU-07`) con participantes (`HU-08`), observaciones (`HU-09`), próxima reunión (`HU-10`) y dos acuerdos (`HU-11`, `HU-12`).
5. `Estudiante` inicia sesión mediante enlace seguro de "Mi expediente académico".
6. `Estudiante` actualiza el estado de su acuerdo a `EN_PROCESO` (`HU-13`), carga su primera evidencia documental de 15 MiB (`HU-21`) y captura su avance de tesis del 25% (`HU-15`).
7. `Estudiante`, `Asesor` y `Coordinador` consultan la Línea de Tiempo Longitudinal (`HU-23`), observando la correlación cronológica perfecta de todos los eventos.
8. `Coordinador` consulta el Dashboard Ejecutivo (`HU-24`), revisa alertas de supervisión (`HU-25`, `HU-26`), genera el Reporte Integral Cédula Imprimible (`HU-27`) y descarga los archivos en Excel y PDF (`HU-28`).

---

## 6. Eje 5: Preparación del Release Candidate y Despliegue

### 6.1. Contenedores Docker de Producción
- Construcción y validación de las imágenes:
  ```bash
  docker compose build
  docker compose up -d
  ```
- Verificación de que el contenedor Django aplique migraciones automáticamente y corra bajo servidor seguro.
- Verificación de que el contenedor Angular sirva los activos optimizados.

### 6.2. Protocolo de Integración en Git y Liberación
1. Todos los cambios de estabilización se integran mediante Pull Requests aprobados hacia la rama `Development`.
2. Ejecución de la suite completa de pruebas en `Development`.
3. Creación de Pull Request formal de `Development` hacia la rama principal `main`.
4. Etiquetado oficial del Release Candidate en `main`:
   ```bash
   git tag -a v1.0.0-rc1 -m "Release Candidate 1.0 - Sistema Colaborativo de Seguimiento de Tutorías de Posgrado"
   git push origin v1.0.0-rc1
   ```

---

## 7. Definition of Done (DoD) del Sprint 6
- [ ] 0 defectos críticos o de seguridad reportados.
- [ ] `python manage.py check --deploy` aprobado sin alertas.
- [ ] 100% de pruebas unitarias y de integración backend y frontend aprobadas.
- [ ] Auditoría de accesibilidad WCAG 2.1 AA completada sin violaciones graves.
- [ ] Escenario de demostración de extremo a extremo probado y validado en contenedores Docker.
- [ ] Tag `v1.0.0-rc1` creado y publicado en la rama `main`.
