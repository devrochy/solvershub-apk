#!/usr/bin/env bash
# Publica un OTA (EAS Update) al canal indicado con la API correcta (HU-APP-17).
#
# Por qué existe: EXPO_PUBLIC_API_URL se incrusta en el bundle JS y `eas update` NO usa
# el `env` de los perfiles de build de eas.json: sin esto tomaría .env.local (la API de
# la LAN) y un OTA a producción dejaría la app apuntando a otro lado. Una variable
# exportada gana sobre los .env.
#
# Uso: scripts/publicar-ota.sh <preview|pin-negativo|staging|production> "mensaje"
set -euo pipefail

CANAL="${1:-}"
MENSAJE="${2:-}"
API_TEST="https://test.solvershub.site/api/pack/pack_cobranza"
API_PROD="https://app.solvershub.site/api/pack/pack_cobranza"

case "$CANAL" in
  preview | pin-negativo | staging) API="$API_TEST"; ENTORNO="preview" ;;
  production) API="$API_PROD"; ENTORNO="production" ;;
  *)
    echo "Canal inválido: '$CANAL' (preview | pin-negativo | staging | production)." >&2
    exit 1
    ;;
esac
if [ -z "$MENSAJE" ]; then
  echo "Falta el mensaje del OTA (aparece en el historial de EAS)." >&2
  exit 1
fi

echo "OTA → canal '$CANAL' con EXPO_PUBLIC_API_URL=$API"
EXPO_PUBLIC_API_URL="$API" npx eas-cli update \
  --channel "$CANAL" --environment "$ENTORNO" --platform android \
  --message "$MENSAJE" --non-interactive
