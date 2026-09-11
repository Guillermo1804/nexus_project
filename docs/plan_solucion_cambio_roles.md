# Plan para solucionar el error al cambiar roles

## Estado actual

- [x] Migración `nexus.0002_adminauditlog` aplicada en `Backend/nexus/db.sqlite3`.
- [x] Cambio de rol y creación de auditoría protegidos con una transacción atómica.
- [x] Frontend conserva el rol confirmado y bloquea el selector durante la petición.
- [x] Pruebas de éxito, error y rollback agregadas.
- [x] Suite backend validada: 20 pruebas exitosas.
- [x] Suite frontend validada: 11 pruebas exitosas.
- [x] Compilación Angular validada correctamente.
- [ ] Aplicar el mismo patrón transaccional a los otros endpoints que escriben en `AdminAuditLog`.
- [ ] Realizar la verificación manual completa desde el navegador.

## 1. Diagnostico

El error principal es:

```text
django.db.utils.OperationalError: no such table: nexus_adminauditlog
```

El endpoint `PATCH /api/auth/users/<id>/role/` cambia el rol y después ejecuta `AdminAuditLog.objects.create(...)`. El modelo y la migración `Backend/nexus/nexus/migrations/0002_adminauditlog.py` existen, pero la base SQLite que utiliza Django no tiene aplicada esa migración.

La base configurada en `Backend/nexus/nexus/settings.py` es `Backend/nexus/db.sqlite3`. El archivo `Backend/db.sqlite3` no debe recibir la migración salvo que una configuración externa lo utilice explícitamente.

## 2. Corrección inmediata de la base de datos — Completada

Desde PowerShell:

```powershell
cd Backend/nexus
..\venv\Scripts\Activate.ps1
python manage.py showmigrations nexus
python manage.py migrate
python manage.py showmigrations nexus
```

Verificar que `0002_adminauditlog` aparezca marcada con `[X]`. Si el entorno virtual está en otra ubicación, activar ese entorno antes de ejecutar los comandos.

Después, reiniciar Django y probar nuevamente el cambio de rol desde el panel.

## 3. Corrección preventiva del backend — Cambio de roles completado

Modificar `UserRoleUpdateView.patch` para ejecutar en una transacción atómica:

1. Validar el usuario y el rol.
2. Guardar el nuevo rol.
3. Crear el registro `AdminAuditLog`.
4. Confirmar ambas operaciones juntas.

Si la tabla de auditoría vuelve a faltar o falla cualquier operación, la transacción debe revertir también el cambio de rol. De esta forma el frontend no recibirá un `500` mientras la base queda parcialmente actualizada.

Queda pendiente aplicar el mismo patrón a los endpoints que crean cuentas institucionales o asociaciones y también escriben en `AdminAuditLog`.

## 4. Comportamiento esperado en el frontend — Implementado

En `FrontEnd/nexus_project/src/app/admin/role-management.ts` y su plantilla:

- Mantener el rol confirmado por el servidor como valor visible.
- Marcar la fila como pendiente mientras se procesa la petición para evitar cambios simultáneos.
- Si la respuesta es `200`, reemplazar el usuario por la respuesta recibida y limpiar el mensaje de error.
- Si la petición falla, restaurar el rol anterior y mostrar un mensaje accionable; no ocultar errores HTTP reales.
- Deshabilitar temporalmente el selector de la fila que está actualizándose.

El mensaje `No fue posible actualizar el rol.` debe aparecer únicamente cuando el backend realmente rechaza o no puede completar la operación. Una vez aplicada `0002_adminauditlog`, el cambio exitoso debe devolver `200` y el mensaje no debe aparecer.

## 5. Pruebas — Ejecutadas

### Backend

Ejecutar desde `Backend/nexus`:

```powershell
python manage.py test nexus.tests.AuthenticationApiTests.test_only_role_manager_can_list_and_assign_roles
python manage.py test
```

Resultado actual: `20 tests` exitosos en la suite completa del backend.

Agregar o verificar una prueba que confirme que, después de cambiar el rol:

- la respuesta es `200`;
- el rol devuelto es el nuevo rol;
- existe un `AdminAuditLog` con `previous_role` y `new_role`;
- un fallo al escribir la auditoría no deja el usuario con un rol no confirmado.

### Frontend

Ejecutar desde `FrontEnd/nexus_project`:

```powershell
pnpm test -- --watch=false
pnpm build
```

Resultado actual: `11 tests` exitosos y compilación Angular completada.

Agregar pruebas para confirmar que:

- una respuesta exitosa actualiza la fila y no deja `error` visible;
- una respuesta fallida restaura el rol anterior y muestra el mensaje;
- el selector queda bloqueado mientras la petición está pendiente.

## 6. Verificación manual y criterios de aceptación — Pendiente

1. Abrir el panel con una cuenta autorizada para administrar roles.
2. Cambiar un usuario de `STUDENT` a `TUTOR`.
3. Confirmar en Network que `PATCH /api/auth/users/<id>/role/` responde `200`.
4. Confirmar que la tabla muestra el rol y permisos devueltos por el backend.
5. Confirmar que no aparece el mensaje de error.
6. Consultar el historial administrativo y verificar el registro del cambio.
7. Repetir con una petición inválida o un usuario inexistente y comprobar que el frontend sí muestra un error y no altera visualmente el rol confirmado.

## 7. Prevención en despliegues

- Ejecutar `python manage.py migrate` como paso obligatorio de inicio o despliegue.
- Ejecutar `python manage.py showmigrations` en la base real antes de probar endpoints administrativos.
- No borrar ni editar migraciones ya aplicadas; crear una nueva migración para cambios posteriores.
- Confirmar que todos los entornos apuntan a la base de datos esperada y no a copias SQLite distintas.