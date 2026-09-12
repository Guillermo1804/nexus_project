# Diagnóstico: error al crear cuenta institucional

Fecha: 11 de septiembre de 2026.

## Síntoma

Al crear una cuenta institucional desde `/admin/users`, la interfaz muestra que no se pudo crear. En consola Django aparece:

```text
django.db.utils.OperationalError: no such table: nexus_adminauditlog
[11/Sep/2026 11:09:45] "POST /api/admin/users/ HTTP/1.1" 500 23533
[11/Sep/2026 11:10:09] "GET /api/auth/users/ HTTP/1.1" 200 610
```

La cuenta sí queda persistida: el `GET /api/auth/users/` posterior la lista.

## Causa raíz

El fallo no está en la creación del usuario. Está en el registro de auditoría que ocurre **después** de guardar la cuenta.

1. El modelo `AdminAuditLog` existe en código (`Backend/nexus/nexus/models.py`).
2. La migración `0002_adminauditlog` existe y crea la tabla `nexus_adminauditlog`.
3. La base local `Backend/nexus/db.sqlite3` **no tiene esa tabla**. Solo tiene aplicada `nexus.0001_initial`.

Consulta realizada sobre SQLite de desarrollo:

- Tablas `nexus_*` presentes: usuarios, estudiantes, comité, tutorías, etc.
- Tabla `nexus_adminauditlog`: **ausente**.
- `django_migrations` para la app `nexus`: únicamente `0001_initial`.

El servidor de desarrollo usa esa misma base (`DATABASES['default']['NAME'] = BASE_DIR / 'db.sqlite3'`, con `BASE_DIR` = `Backend/nexus`).

## Flujo que produce el 500 y la cuenta creada

Frontend (`institutional-users.ts`) llama `POST /api/admin/users/`. Si la respuesta no es exitosa, muestra:

> No fue posible crear la cuenta. Verifica los datos e inténtalo nuevamente.

Backend (`InstitutionalUserCreateView.post`):

1. Valida el payload con `InstitutionalUserCreateSerializer`.
2. `serializer.save()` crea el `CustomUser` y lo confirma en SQLite.
3. Intenta `AdminAuditLog.objects.create(...)`.
4. SQLite lanza `OperationalError` porque no existe `nexus_adminauditlog`.
5. Django responde **500**. La vista **no** envuelve creación + auditoría en `transaction.atomic()`, así que el usuario ya creado no se revierte.

Por eso el administrador ve error y, al recargar o listar usuarios, la cuenta sí aparece.

```112:122:Backend/nexus/nexus/views.py
    def post(self, request):
        serializer = InstitutionalUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        AdminAuditLog.objects.create(
            action=AdminAuditLog.Action.INSTITUTIONAL_USER_CREATED,
            actor=request.user,
            target_user=user,
            details={'role': user.role},
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
```

```19:32:FrontEnd/nexus_project/src/app/admin/institutional-users.ts
    this.admin.createInstitutionalUser(this.form).subscribe({
      next: (user) => {
        this.message = `Cuenta creada para ${user.email}.`;
        ...
      },
      error: () => {
        this.error = 'No fue posible crear la cuenta. Verifica los datos e inténtalo nuevamente.';
        this.saving = false;
      },
    });
```

## Alcance del mismo defecto

Cualquier operación que escriba o lea `AdminAuditLog` fallará contra esta base hasta aplicar la migración:

| Operación | Endpoint | Efecto |
| --- | --- | --- |
| Crear cuenta institucional | `POST /api/admin/users/` | Usuario se crea; auditoría 500 |
| Cambiar rol | `PATCH /api/auth/users/<id>/role/` | Rol se guarda; auditoría 500 |
| Crear asociación | `POST /api/admin/committee/` | Asociación se crea; auditoría 500 |
| Activar/desactivar asociación | `PATCH /api/admin/committee/<id>/` | Cambio se guarda; auditoría 500 si cambia `is_active` |
| Consultar historial | `GET /api/admin/audit/` | 500 inmediato |

Las pruebas unitarias de Django no fallan porque `manage.py test` aplica todas las migraciones en una base temporal.

## Qué no es el problema

- Validación de correo, contraseña o rol institucional.
- Autorización (`CanAssignRoles`).
- Ruta Angular `/admin/users` o el cliente `AdminService`.
- Ausencia del modelo o de la migración en el repositorio: ambos existen.

## Correcciones propuestas (pendientes de autorización)

1. Aplicar migraciones pendientes sobre la base de desarrollo:
   `python manage.py migrate` en `Backend/nexus`.
2. Envolver creación/cambio + auditoría en `transaction.atomic()` para que un fallo posterior no deje estado a medias.
3. Opcional: mostrar en el frontend el detalle de error del backend cuando exista, para no confundir un 500 de auditoría con datos inválidos.

## Cómo verificar después del arreglo

1. `python manage.py migrate` y confirmar que existe `nexus_adminauditlog`.
2. Crear una cuenta institucional: respuesta 201 y mensaje de éxito en la UI.
3. `GET /api/admin/audit/` debe incluir `INSTITUTIONAL_USER_CREATED`.
4. Intentar el mismo correo otra vez: error de duplicado, sin crear otra cuenta.
5. Repetir cambio de rol y asociación; no deben devolver 500.
