---
estado: completado
tags: [tokens, diseno, tema, accesibilidad]
---

# HU-DS-01 · Tokens v1.4 en la app

- **Origen:** SPEC-29 de `solvershub-docs` (Diseño aprobado, D-32), HU-DS-01. Panel:
  `devrochy/solvershub-panel#60` (issue #59).
- **Estado:** completado. Falta solo el merge del PR del panel, que es la fuente de los tokens.

## Qué se hizo

1. **`scripts/sync-tokens.mjs`**: copiaba a `src/theme/tokens.ts`, una ruta que dejó de
   existir con HU-APP-01. Ahora escribe en `src/core/theme/tokens.ts`.
2. **`src/core/theme/tokens.ts`** regenerado desde la marca v1.4. Es aditivo:
   - `shTheme.{light,dark}` suma `statusSuccessFg/Bg/Border` (y `warning`, `danger`, `info`),
     `dataCat1..4`, `dataSingle`, `dataSeq1..5`, `dataGrid`, `dataAxis` y `elev0..3`
     (cadenas `boxShadow`).
   - `shColor` suma `status.{light,dark}` y `data.{light,dark}`.
   - Nuevos `shDensity`, `shMotion` (ms y curvas `[x1, y1, x2, y2]` para `Easing.bezier`) y
     `shType` (escala tipográfica con la familia que ya trae el peso, por ejemplo
     `Montserrat_700Bold`).
3. **`src/core/theme/tokens-v2.test.ts`** (nuevo): el texto de estado cumple AA sobre `bg`,
   `surface` y `surface2` en los dos temas; las series de datos llegan a ≥ 3:1 sobre la
   tarjeta; cada familia de `shType` está en el `useFonts` de `App.tsx`; las duraciones
   crecen; `controlLg` ≥ 48 dp.

## Resultado real

- `npm run check`: ver la sección de verificación del PR.
- Ninguna pantalla cambia todavía: `COLORES` (`theme.ts`) sigue igual. Usar estos tokens
  es de HU-DS-09 (kit) y HU-DS-10 (campo de cobranza, mismas vistas por D-SPEC-29-6).

## Pendientes (registrados)

- Regla de lint contra hex sueltos fuera de `src/core/theme` (HU-DS-02).
