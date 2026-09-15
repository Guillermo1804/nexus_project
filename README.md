# N.E.X.U.S.

Expediente y seguimiento universitario superior. Estado actual: HU-01 a HU-14 y HU-21 integradas en `Development`; HU-15..20 y HU-22..28 están parciales o planificadas según [la matriz](docs/architecture/dependencies_matrix.md).

## Arquitectura vigente

- Backend: Python/Django 6.1 + Django REST Framework, una aplicación `nexus`, SQLite y tablas de dominio `nexus_*`.
- Seguridad: SimpleJWT; las rutas protegidas reciben `Authorization: Bearer <access_token>`.
- API: sólo `/api/v1/`; contrato exacto en [api_contract_v1.md](docs/architecture/api_contract_v1.md).
- Frontend: Angular 20 standalone; gestor de paquetes pnpm.

## Inicio rápido

```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd nexus
python manage.py migrate
python populate_data.py
python manage.py runserver 8000
```

En otra terminal:

```bash
cd FrontEnd/nexus_project
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

Backend: `http://127.0.0.1:8000/api/v1/`. Frontend: `http://localhost:4200/`.

## Verificación

```bash
cd Backend/nexus && python manage.py test nexus
cd FrontEnd/nexus_project && pnpm test -- --watch=false --browsers=ChromeHeadless
cd FrontEnd/nexus_project && pnpm build
```

## Ramas

- `Development`: integración continua.
- `HU-XX-descripcion`: ramas cortas por historia, creadas desde `Development` e integradas por PR/revisión.
- `main`: releases validados; sin push directo.

## Documentación

- [Contrato API](docs/architecture/api_contract_v1.md)
- [Esquema](docs/architecture/database_schema_specification.md)
- [ERD](docs/architecture/ERD.mermaid)
- [Dependencias/HU](docs/architecture/dependencies_matrix.md)
- [Diseño](docs/design/DESIGN.md)
- [Equipos](docs/teams/)
