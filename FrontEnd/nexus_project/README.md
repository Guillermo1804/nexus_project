# N.E.X.U.S. Frontend

Aplicación Angular 20 con componentes standalone.

## Requisitos

- Node.js 20 o superior
- Corepack
- pnpm 11.20.0

## Instalación

```bash
corepack enable
pnpm install --frozen-lockfile
```

## Desarrollo

```bash
pnpm start
```

La aplicación estará disponible en `http://localhost:4200/` y usará `proxy.conf.json` para comunicarse con Django.

## Compilación

```bash
pnpm build
```

## Pruebas unitarias

```bash
pnpm test -- --watch=false --browsers=ChromeHeadless
```
