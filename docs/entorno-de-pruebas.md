# Entorno de pruebas compartido (túnel de Cloudflare)

Este documento explica cómo publicar el N.E.X.U.S. completo —frontend, backend y base de
datos— en una URL accesible desde fuera de la red local, para que el equipo pueda probarlo
sin instalar nada.

## Cómo levantarlo

```bash
cd /ruta/al/proyecto
./dev-tunnel.sh
```

El script hace tres cosas, en orden:

1. Aplica las migraciones sobre el SQLite local (`Backend/nexus/db.sqlite3`).
2. Levanta el backend Django en `127.0.0.1:8000`.
3. Levanta el frontend Angular en `127.0.0.1:4200` y publica **ese** puerto con un túnel
   rápido de Cloudflare.

Al terminar imprime la URL pública. Se detiene todo con `Ctrl+C`.

Los logs de cada proceso quedan en `.tunnel-logs/`.

## Por qué el túnel apunta al frontend y no al backend

El frontend resuelve la API en `/api/v1` **relativa** cuando no se sirve en `localhost`
(ver `FrontEnd/nexus_project/src/environments/environment.ts`). Como el servidor de
desarrollo de Angular ya tiene un proxy que manda `/api` hacia `127.0.0.1:8000`
(`proxy.conf.json`), todo sale por un único origen. Ventajas: no hay CORS que configurar y
no se expone el puerto 8000.

## Cuentas de prueba

Todas las cuentas de demostración, incluida la de administración del sistema, comparten
la contraseña `Admin1234!`.

| Rol | Correo |
|---|---|
| Coordinación | `coordinacion@nexus.edu`, `jorge@nexus.com`, `control.escolar@nexus.edu`, `memosanchez101@gmail.com` |
| Tutor | `roberto.gomez@nexus.edu`, `elena.soto@nexus.edu`, `tutor_test@nexus.edu` |
| Estudiante | `ana.morales@nexus.edu`, `carlos.mendoza@nexus.edu`, `mariana.castillo@nexus.edu`, `diego.fuentes@nexus.edu`, `alejandro.zarate@nexus.edu` |
| Administración | `admin@nexus.com` — además da acceso al panel de Django en `/admin/` |

## Límites de este entorno

Son reales y conviene recordarlos antes de usarlo en una demostración formal:

- **La URL es pública y cambia.** Es un *tunnel rápido* de `trycloudflare.com`: cualquiera
  que la reciba entra, y se regenera en cada reinicio del script. Para una URL fija hace
  falta un túnel con nombre y un dominio propio en Cloudflare.
- **El entorno muere con la máquina.** Backend, base de datos y túnel viven en la
  computadora de quien lo lanzó. Si esa máquina se apaga o se reinicia, el equipo se queda
  sin servicio.
- **Los datos son los del SQLite local**, con 5 estudiantes, 10 tutorías y 20 acuerdos
  sembrados. Lo que pruebe el equipo se escribe ahí; para reiniciar desde cero hay que
  volver a sembrar con `python populate_data.py`.
- **`DJANGO_DEBUG=True`.** Es lo correcto para pruebas internas, pero en producción hay que
  usar `DEBUG=False` **y** añadir `SECURE_PROXY_SSL_HEADER` a `settings.py`; sin esa
  línea, Django con `DEBUG=False` redirige a HTTPS en bucle detrás de un proxy.
- **Las evidencias subidas** (HU-21) se escriben en `Backend/nexus/media/` de esa misma
  máquina.

## Cómo se arregla el `allowedHosts`

Vite (el servidor de desarrollo de Angular) rechaza por defecto cualquier cabecera `Host`
que no sea local, y responde `403 Blocked request`. Se añadió `allowedHosts` en
`angular.json` para admitir el dominio del túnel:

```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json",
    "host": "0.0.0.0",
    "port": 4200,
    "allowedHosts": [".trycloudflare.com"]
  }
}
```

El backend necesita lo mismo del lado de Django: sin esto respondería `400` a cualquier
visita externa. `dev-tunnel.sh` lo resuelve exportando:

```bash
DJANGO_ALLOWED_HOSTS=".trycloudflare.com,localhost,127.0.0.1"
```

## Si más adelante se quiere una URL estable

1. Un dominio propio con los nameservers de Cloudflare.
2. `cloudflared tunnel login` y `cloudflared tunnel create nexus` desde una cuenta de
   Cloudflare del equipo.
3. `cloudflared tunnel route dns nexus nexus.midominio.com`.
4. Sustituir el túnel rápido en `dev-tunnel.sh` por `cloudflared tunnel run nexus` más un
   `config.yml` que apunte a `http://127.0.0.1:4200`.

Eso sobrevive reinicios, permite proteger la URL con Cloudflare Access (correo
institucional del equipo) y quita la dependencia de la computadora de una sola persona.
