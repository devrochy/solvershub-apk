# ADR-APP-06 — Un solo OpenAPI como fuente de tipos para las dos superficies de la app

- **Estado:** aceptado
- **Fecha:** 2026-10-05
- **Contexto:** SPEC-25 (solvershub-docs), decisión D-SPEC-25-6

## Contexto

La app consume dos superficies del backend agent-core: la API admin `/api/v1` (incluye
`/api/v1/pack/*`) con OpenAPI commiteado en `docs/openapi.json` (ADR-0077), y la API de campo
`/api/pack/pack_cobranza` (api_gestor, ~45 rutas camelCase) cuyo contrato vive solo en
`packages/pack-cobranza/docs/api-gestor.md` y en `src/types/gestor.ts` del APK, escritos a mano.
Dos fuentes de verdad para tipos derivan en desfases entre app y backend.

## Decisión

**Extender el exportador del backend** (`scripts/export_openapi.py`) para incluir las rutas públicas
de packs (empezando por `/api/pack/pack_cobranza`) y generar en la app un único
`src/api/schema.d.ts` con `openapi-typescript` (mismo mecanismo que el panel usa hoy, `make api-types`).
Los tipos a mano de `src/types/gestor.ts` se reemplazan por alias generados; el contrato manual
queda como documentación de referencia.

Flujo: backend cambia una ruta → CI regenera `docs/openapi.json` (falla si hay diff sin regenerar) →
app ejecuta `npm run api:types` (falla si hay diff) → typecheck de la app valida el consumo.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Mantener `src/types/gestor.ts` a mano | Es la causa del desfase actual; no escala a 10 módulos |
| Generar tipos desde el repo del panel | El panel genera solo `/api/v1`; no incluye la API de campo |
| Codegen por superficie separado (dos archivos) | Duplica tooling sin beneficio; una superficie unificada permite alias compartidos |

## Consecuencias

**Positivas:** un solo contrato verificable en CI en los tres repos; el typecheck de la app detecta
cambios de contrato del backend antes del runtime.

**Negativas / lo que aceptamos pagar:** hay que mantener las rutas públicas de packs incluidas en
el exportador; el OpenAPI crece.

**Qué haría que revisáramos esto:** si la API de campo pasa a ser generada por FastAPI
completamente tipada y el exportador se vuelve trivial (se mantiene la decisión, cambia la
implementación).

## Impacto en el código

- Backend: `scripts/export_openapi.py` + `docs/openapi.json` (HU-APP-02 y siguientes).
- App: `scripts/sync-api-types.mjs`, `src/api/schema.d.ts` generado, reemplazo de `src/types/gestor.ts`
  por alias (HU-APP-01 y HU-APP-07).
