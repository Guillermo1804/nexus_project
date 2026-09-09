# Validación de vistas del superadministrador

## Cambios realizados

### Backend

- Se agregó `GET /api/admin/students/` para listar únicamente estudiantes activos.
- El endpoint está protegido con `users.role.assign`.
- Se mantuvo `GET /api/auth/users/` como fuente de cuentas institucionales.
- La prueba backend confirma que los estudiantes inactivos no aparecen en el listado.

### Frontend

- La vista de asociaciones ya no solicita IDs escritos manualmente.
- Las cuentas disponibles se cargan desde `/api/auth/users/`.
- Solo se muestran cuentas con rol `TUTOR` o `COMMITTEE_MEMBER`.
- Los estudiantes se cargan desde `/api/admin/students/`.
- Solo se muestran estudiantes activos, filtrados por el backend.
- El formulario bloquea el envío si no se seleccionó cuenta o estudiante.
- Se manejan estados de carga y errores para las tres solicitudes iniciales.
- Se agregó la vista protegida `/admin/audit` para consultar el historial administrativo.
- La auditoría se carga mediante `GET /api/admin/audit/` y muestra acción, actor, cuenta afectada, detalles y fecha.

### Auditoría backend

- Se creó el modelo `AdminAuditLog` y su migración `0002_adminauditlog`.
- Se registran cambios de rol, creación de cuentas institucionales, creación de asociaciones y activación/desactivación de asociaciones.
- Cada registro conserva actor, usuario afectado cuando aplica, asociación relacionada, detalles del cambio y fecha.
- El historial solo puede consultarse con `users.role.assign`.

## Pruebas unitarias Angular agregadas

### Roles

- Carga y muestra usuarios.
- Actualiza la fila y los permisos después de cambiar un rol.

### Cuentas institucionales

- Envía la creación de una cuenta `TUTOR`.
- Muestra confirmación y libera el estado de guardado.

### Asociaciones académicas

- Carga asociaciones, cuentas asignables y estudiantes activos.
- Impide crear una asociación sin seleccionar ambas opciones.

## Resultados de validación

- Backend completo: `python manage.py test nexus` -> **18 pruebas exitosas**.
- Backend integración superadmin: `python manage.py test nexus.tests.SuperAdminApiTests` -> **5 pruebas exitosas**.
- Backend completo final: `python manage.py test nexus` -> **19 pruebas exitosas**.
- Frontend unitario: `pnpm test -- --watch=false --browsers=ChromeHeadless` -> **10 pruebas exitosas**.
- Frontend build: `pnpm build` -> compilación exitosa.
- Migraciones: `python manage.py migrate --check` -> sin migraciones pendientes.

## Pruebas manuales recomendadas

1. Iniciar el backend con `python manage.py runserver` y el frontend con `pnpm start`.
2. Iniciar sesión con la cuenta `SYSTEM_ADMIN` creada mediante `createsuperuser`.
3. Abrir `/admin/committee` y comprobar que los selectores muestran cuentas `TUTOR`/`COMMITTEE_MEMBER` y estudiantes activos.
4. Confirmar que no aparecen estudiantes inactivos.
5. Crear una asociación como `ASESOR_PRINCIPAL` y comprobar que aparece en la tabla.
6. Desactivar la asociación y comprobar que cambia a `Inactiva`.
7. Intentar registrar una tutoría después de desactivarla y confirmar que el backend responde `403`.
8. Abrir `/admin/users`, crear una cuenta institucional y comprobar que se muestra el mensaje de éxito.
9. Intentar crear un correo duplicado y comprobar que se muestra el error sin crear otra cuenta.
10. Iniciar sesión con un usuario que no tenga `users.role.assign` y confirmar que no puede acceder a las rutas administrativas.
11. Abrir `/admin/audit` como `SYSTEM_ADMIN` y comprobar que aparecen los cambios realizados.
12. Cambiar un rol y confirmar que el historial registra rol anterior y nuevo.
13. Crear o desactivar una asociación y confirmar que la acción aparece en el historial.

## Conclusión

La selección de usuarios y estudiantes dejó de depender de identificadores introducidos manualmente. El backend entrega las opciones autorizadas y el frontend las presenta en controles seleccionables, mientras que la autorización final continúa en Django.

## E2E y alcance de esta validación

La suite actual cubre el flujo administrativo mediante pruebas de integración API y pruebas unitarias de componentes. El proyecto todavía no tiene Playwright, Cypress ni otra herramienta E2E de navegador configurada; por eso no se agregó una dependencia nueva en esta iteración.

La validación E2E manual recomendada es iniciar backend y frontend, iniciar sesión como `SYSTEM_ADMIN`, crear una cuenta, crear una asociación, desactivarla y revisar `/admin/audit`. Como siguiente paso automatizable queda incorporar una herramienta E2E y ejecutar ese mismo recorrido en un navegador real.