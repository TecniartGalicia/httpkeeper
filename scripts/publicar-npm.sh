#!/usr/bin/env bash
# Inicio de sesión web en npm con reintentos y publicación del paquete.
#
# npm login --auth-type=web imprime una dirección única y se queda sondeando;
# si nadie entra en unos minutos, la sesión caduca y el CLI cae al modo antiguo
# ("Username:"), que aquí no puede contestar nadie. Este script relanza el
# login con una dirección nueva cuando eso pasa, abre cada dirección en el
# navegador, y en cuanto `npm whoami` responde, compila, prepara y publica.
set -u
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${TMPDIR:-/tmp}/npm-login-$$.log"
INTENTOS=0

abrir() { powershell -NoProfile -Command "Start-Process '$1'" >/dev/null 2>&1 || true; }

lanzar_login() {
  INTENTOS=$((INTENTOS + 1))
  : > "$LOG"
  (cd "$RAIZ/npm" && npm login --auth-type=web > "$LOG" 2>&1) &
  PID=$!
  local i=0
  until grep -q "https://www.npmjs.com/login" "$LOG" 2>/dev/null || [ $i -ge 30 ]; do sleep 1; i=$((i + 1)); done
  URL=$(grep -oE "https://www.npmjs.com/login\?next=[^ ]+" "$LOG" | head -1)
  echo "intento $INTENTOS · $(date +%H:%M:%S) · $URL"
  [ -n "$URL" ] && abrir "$URL"
}

lanzar_login
INICIO=$(date +%s)
while ! npm whoami >/dev/null 2>&1; do
  if [ $(( $(date +%s) - INICIO )) -gt 2400 ]; then echo "sin sesión tras 40 min; me rindo"; exit 1; fi
  # La sesión caducó o el proceso murió: dirección nueva.
  if grep -q "Username:" "$LOG" 2>/dev/null || ! kill -0 "$PID" 2>/dev/null; then
    if [ $INTENTOS -ge 4 ]; then echo "cuatro direcciones caducadas sin sesión"; exit 1; fi
    sleep 2
    lanzar_login
  fi
  sleep 5
done
echo "sesión de npm: $(npm whoami) · $(date +%H:%M:%S)"

cd "$RAIZ"
npm run build 2>&1 | grep -E "^asset .*cli" || true
node scripts/preparar-npm.mjs || exit 1
cd npm
npm publish --access public 2>&1 | grep -vE "^npm notice (package|Tarball|name|version|filename|total|shasum|integrity|unpacked|[0-9.]+ ?k?B )" | tail -12
sleep 5
echo "--- en el registro: $(npm view httpkeeper version 2>&1 | tail -1)"
