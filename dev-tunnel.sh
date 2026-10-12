#!/usr/bin/env bash
# Levanta backend (Django), frontend (Angular) y un túnel público de Cloudflare
# para que el equipo pueda probar la aplicación desde fuera de la red local.
#
# Uso:  ./dev-tunnel.sh
# Detener todo: Ctrl+C  (los tres procesos caen juntos)
#
# Es un entorno de DEMOSTRACIÓN: DEBUG activo y datos sembrados. Ver el
# documento de despliegue para el paso a producción.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$ROOT/Backend/.venv"
CLOUDFLARED="${CLOUDFLARED:-$HOME/.local/bin/cloudflared}"
LOG_DIR="$ROOT/.tunnel-logs"
mkdir -p "$LOG_DIR"

if [ ! -x "$CLOUDFLARED" ]; then
  echo "ERROR: no encuentro cloudflared en $CLOUDFLARED" >&2
  echo "Instálalo con:  curl -sL -o ~/.local/bin/cloudflared \\" >&2
  echo "  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" >&2
  echo "  && chmod +x ~/.local/bin/cloudflared" >&2
  exit 1
fi

# El túnel sirve en *.trycloudflare.com, así que ALLOWED_HOSTS debe aceptar ese
# dominio o Django responderá 400 a toda visita que no venga de localhost.
export DJANGO_DEBUG="${DJANGO_DEBUG:-True}"
export DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:-django-insecure-tunnel-demo-only}"
export DJANGO_ALLOWED_HOSTS="${DJANGO_ALLOWED_HOSTS:-.trycloudflare.com,localhost,127.0.0.1}"

pids=()
cleanup() {
  echo ""
  echo "Deteniendo…"
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

wait_for_port() {
  local port="$1" name="$2" tries=0
  while ! (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; do
    tries=$((tries + 1))
    if [ "$tries" -gt 90 ]; then
      echo "ERROR: $name no abrió el puerto $port. Log: $LOG_DIR/$name.log" >&2
      exit 1
    fi
    sleep 1
  done
  echo "  $name escuchando en el puerto $port"
}

echo "==> Base de datos"
(cd "$ROOT/Backend/nexus" && "$VENV/bin/python" manage.py migrate --noinput >"$LOG_DIR/migrate.log" 2>&1) \
  && echo "  migraciones aplicadas" \
  || { echo "  fallo migrate; ver $LOG_DIR/migrate.log" >&2; exit 1; }

echo "==> Backend (Django)"
(cd "$ROOT/Backend/nexus" && "$VENV/bin/python" manage.py runserver 127.0.0.1:8000 --noreload) \
  >"$LOG_DIR/backend.log" 2>&1 &
pids+=($!)
wait_for_port 8000 backend

echo "==> Frontend (Angular)"
(cd "$ROOT/FrontEnd/nexus_project" && pnpm exec ng serve --host 127.0.0.1 --port 4200 --proxy-config proxy.conf.json) \
  >"$LOG_DIR/frontend.log" 2>&1 &
pids+=($!)
wait_for_port 4200 frontend
echo "  compilando el primer bundle, puede tardar medio minuto…"

echo "==> Túnel de Cloudflare"
# http2 en vez del quic por defecto: en redes inestables el datagrama manager
# de quic se cae con "no recent network activity" y tumba el túnel.
"$CLOUDFLARED" tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:4200 \
  >"$LOG_DIR/tunnel.log" 2>&1 &
pids+=($!)

URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" 2>/dev/null | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "ERROR: el túnel no entregó URL; ver $LOG_DIR/tunnel.log" >&2
  exit 1
fi

cat <<BANNER

  ┌───────────────────────────────────────────────────────────────┐
  │  N.E.X.U.S. — entorno de pruebas compartido                   │
  └───────────────────────────────────────────────────────────────┘

  URL pública:  $URL
  Backend:      http://127.0.0.1:8000/api/v1/  (a través del proxy de Angular)

  La URL cambia cada vez que se reinicia este script: es un túnel rápido.
  Para una URL fija hace falta un túnel con nombre y un dominio en Cloudflare.

  Logs en:  $LOG_DIR
  Detener:  Ctrl+C

BANNER

wait
