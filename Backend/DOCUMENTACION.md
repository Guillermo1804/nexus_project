# Backend N.E.X.U.S.

## Estado técnico

Backend Django 6.1/DRF en `Backend/nexus`, con una sola aplicación `nexus`. Autenticación SimpleJWT y API exclusivamente bajo `/api/v1/`. SQLite es la base configurada.

## Estructura

```text
Backend/
├── requirements.txt
└── nexus/
    ├── manage.py
    ├── populate_data.py
    └── nexus/
        ├── migrations/
        ├── models.py
        ├── permissions.py
        ├── serializers.py
        ├── settings.py
        ├── urls.py
        ├── views.py
        └── test_hu*.py / tests.py
```

Los modelos viven juntos y generan tablas `nexus_*`: usuario con `grammatical_gender`, estudiante con matrícula de hasta 20 caracteres, semestre, comité + memberships, auditoría, tutorías, acuerdos, avance de tesis, evidencia y producción académica. Detalle exacto: [`../docs/architecture/database_schema_specification.md`](../docs/architecture/database_schema_specification.md).

## Seguridad y permisos

Enviar `Authorization: Bearer <access_token>` en recursos protegidos.

| Rol | Alcance vigente |
|---|---|
| `STUDENT` | Expediente propio. |
| `TUTOR`, `COMMITTEE_MEMBER` | Expedientes/tutorías donde existe membership. |
| `PROGRAM_COORDINATOR` | Lectura global, alta de estudiantes, gestión de comité y semestres. |
| `SYSTEM_ADMIN` | Gestión de cuentas/roles y auditoría; sin lectura académica. |

## API

El inventario real de rutas, métodos, estado y HU está en [`../docs/architecture/api_contract_v1.md`](../docs/architecture/api_contract_v1.md). Resumen implementado:

- `/api/v1/auth/*`: login, refresh, logout, me, usuarios/roles.
- `/api/v1/admin/users/`, `/api/v1/admin/audit/`, `/api/v1/admin/students/`.
- `/api/v1/students/`, detalle/overview y semestres.
- `/api/v1/committees/` y eliminación de memberships.
- `/api/v1/tutoring-sessions/` con participantes, observaciones y acuerdos.
- `/api/v1/agreements/` con estado y auditoría.
- `/api/v1/evidence/` para archivos locales de hasta 15 MiB.

No hay endpoints públicos de tesis, producción académica, DOI/URL, timeline, dashboard analítico, alertas, reportes ni exportación.

## Ejecución y pruebas

```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd nexus
python manage.py migrate
python populate_data.py
python manage.py runserver 8000
python manage.py test nexus
```
