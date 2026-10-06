# HU-APP-01 · Núcleo modular de la app

## Resultado

Reestructura física del repo a `src/{app,core,shared,data,modules,navigation}` con movimiento
mecánico (cero cambio de comportamiento), fronteras entre módulos verificadas en CI y tipos de API
generados desde el OpenAPI del backend.

### Movimientos (git mv + imports a aliases)

| Antes | Después | Alias |
|---|---|---|
| `src/theme/*` | `src/core/theme/*` | `@core/theme/*` |
| `src/config.ts` | `src/core/config.ts` | `@core/config` |
| `src/api/client.ts`, `multipart.ts` | `src/core/api/*` | `@core/api/*` |
| `src/session/jwt.ts` | `src/core/session/jwt.ts` | `@core/session/jwt` |
| `src/domain/*` | `src/shared/domain/*` | `@shared/domain/*` |
| `src/types/{auth,gestor,gestor-permisos}.ts` | `src/shared/types/*` | `@shared/types/*` |

Aliases `@core/@shared/@data` agregados en `tsconfig.json` (paths) y `jest.config.js`
(moduleNameMapper).

### Núcleo nuevo

- `scripts/check-module-boundaries.mjs` (ADR-APP-01): un módulo solo importa de su carpeta, de
  `@core/`, `@shared/` y `@data/`; core/shared/data no importan de módulos ni legacy; `navigation/`
  y `app/` componen. **114 archivos legacy exentos** hasta HU-APP-07 (los avisa). Corre en
  `scripts/check.sh` → `npm run check`.
- Tipos de API (ADR-APP-06): `openapi-typescript` (devDep) + `scripts/sync-api-types.mjs` +
  `npm run api:types`; salida commiteada `src/core/api/schema.d.ts` (13.360 líneas) y diff-check
  en `check.sh` (se salta con aviso si no está el repo del backend, p. ej. CI sin el clon).
- `docs/modulo-template.md` con el contrato de módulo.
- READMEs de `src/app/`, `src/data/`, `src/modules/` (dirs trackeados).

### Dependencias reparadas (re-resolución de npm por el install)

- `@react-native/jest-preset@0.86.3` y `test-renderer@^1.0.0` como devDeps explícitos (peers de
  `jest-expo` 57 y `@testing-library/react-native` 14 que antes llegaban transitivos).
- `openapi-typescript@^7.4.0` con `--legacy-peer-deps` (su peer es `typescript ^5` y el repo usa
  TS 6; funciona, verificado con la generación).

## Verificación

- `npm run check` completo: fronteras OK · `api:types` sin diff · lint 0 errores · typecheck 0
  errores · **498/498 tests** (baseline de F0: 498).
- `node scripts/sync-api-types.mjs` regenera idéntico (diff-check en verde).

## Deuda registrada

- 90 warnings de lint `import/first` preexistentes (no bloquean; se limpian en HU-APP-07).
- `src/api` (auth/gestor/offline-sync), `session`, `offline`, `screens`, `components`, `features`,
  `navigation` siguen legacy: migran a `modules/cobranza/` en HU-APP-07.
- El schema commiteado corresponde al OpenAPI de develop del backend (los endpoints de los PRs
  #240/#243/#244/#246 entran al regenerar cuando fusionen).
