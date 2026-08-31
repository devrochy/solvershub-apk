#!/usr/bin/env bash
# Verificación completa antes de marcar cualquier tarea como completada.
set -euo pipefail

echo "==> Lint"
npm run lint --silent

echo "==> Typecheck"
npm run typecheck --silent

echo "==> Tests"
npm test -- --silent

echo "==> OK: lint + typecheck + tests pasaron correctamente."