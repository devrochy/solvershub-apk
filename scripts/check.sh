#!/usr/bin/env bash
# Verificación completa antes de marcar cualquier tarea como completada.
set -euo pipefail

echo "==> Fronteras de módulos (ADR-APP-01)"
node scripts/check-module-boundaries.mjs

echo "==> Tipos de API (ADR-APP-06)"
npm run api:types --silent
if [ -f src/core/api/schema.d.ts ]; then
  git diff --exit-code -- src/core/api/schema.d.ts >/dev/null || {
    echo "ERROR: src/core/api/schema.d.ts desactualizado; corre 'npm run api:types'." >&2
    exit 1
  }
fi

echo "==> Lint"
npm run lint --silent

echo "==> Typecheck"
npm run typecheck --silent

echo "==> Tests"
npm test -- --silent

echo "==> OK: lint + typecheck + tests pasaron correctamente."