# Solución: error al crear cuenta institucional

Fecha: 11 de septiembre de 2026.

Documento de diagnóstico relacionado: `docs/diagnostico-error-cuenta-institucional.md`.

## Qué se corrigió

El `POST /api/admin/users/` creaba el usuario y después fallaba al escribir `AdminAuditLog` porque la tabla `nexus_adminauditlog` no existía en SQLite de desarrollo. La respuesta era 500, el frontend mostraba error genérico y la cuenta quedaba creada.

## Cambios aplicados

### 1. Migración de la base local

Se ejecutó `python manage.py migrate` en `Backend/nexus`.

Resultado:

```text
Applying nexus.0002_adminauditlog... OK
```

La base `Backend/nexus/db.sqlite3` ahora incluye `nexus_adminauditlog`. Sin este paso, el 500 se repetiría en el servidor de desarrollo aunque el código de auditoría sea correcto.

### 2. Transacción atómica en escrituras administrativas

En `Backend/nexus/nexus/views.py` se envolvió con `@transaction.atomic` la creación de cuenta institucional, el cambio de rol, la creación de asociación y el cambio de estado de asociación.

Si la auditoría falla, Django revierte también el usuario o la asociación. Ya no queda un estado a medias.

### 3. Mensaje de error del frontend

`FrontEnd/nexus_project/src/app/admin/institutional-users.ts` ahora muestra el detalle que envía el backend (por ejemplo correo duplicado). Si no hay un mensaje útil, conserva el texto genérico.

### 4. Pruebas

- Backend: si `AdminAuditLog.objects.create` lanza `OperationalError`, no debe quedar el usuario.
- Frontend: un 400 con `{ email: ['Este correo ya esta registrado.'] }` muestra ese texto.

## Validación ejecutada

- `python manage.py migrate` → `nexus.0002_adminauditlog` aplicada.
- `python manage.py test nexus` → **20 pruebas exitosas**.
- `pnpm test -- --watch=false --browsers=ChromeHeadless` → **11 pruebas exitosas**.

No se verificó el flujo en el navegador contra el servidor en ejecución: no hay herramientas de browser en esta sesión. Si el `runserver` ya estaba levantado, conviene reiniciarlo para que recargue vistas y use la base migrada.

## Cómo comprobarlo a mano

1. Reiniciar `python manage.py runserver` si sigue en ejecución desde antes de la migración.
2. Iniciar sesión como `SYSTEM_ADMIN`.
3. Crear una cuenta en `/admin/users`: debe aparecer el mensaje de éxito, no el 500.
4. Abrir `/admin/audit` y confirmar `INSTITUTIONAL_USER_CREATED`.
5. Repetir el mismo correo: debe mostrarse el error de duplicado, sin crear otra cuenta.

## Qué no se hizo

- No se hizo commit.
- No se desplegó a otro entorno: en cada base hay que aplicar `migrate`.
- No se cambió el manejo de errores de roles ni asociaciones en el frontend; solo el de cuentas institucionales, que era el flujo reportado.
