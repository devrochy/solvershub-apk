---
estado: completada
tags: [tarea]
---

# Tarea: wordmark centrado en los menús + fondo navy de la web

- **Origen:** Petición directa del usuario (2026-10-30): el logo del menú debe ir más centrado, sin el
  isotipo y con más presencia; el fondo del menú debe usar el azul de la web.
- **Estado:** completada
- **Fecha inicio:** 2026-10-30

## Objetivo

Reemplazar el logo compuesto (isotipo + wordmark) del cajón del panel y del menú de campo por el
**wordmark de una línea** del set de marca, centrado y más grande. Mantener el fondo del cajón en
`#11224D` (Navy 800, el `surface` de la web) en tema oscuro.

## Decisiones

- Variante: **wordmark de una línea** (`wordmark-1-linea-tema-{claro,oscuro}`), sin isotipo.
- Medida: **232 × 34 dp** en ambos menús (relación 640 × 94); centrado con `alignItems: "center"`.
- El fondo navypedido (`#11224D`) **solo aplica en tema oscuro**, donde el `Drawer` ya pinta
  `c.surface` (`shTheme.dark.surface = #11224D`). En tema claro el cajón sigue blanco.
- El menú de campo pasa a mostrar el wordmark “SOLVERSHUB” (antes: isotipo `route` + texto “Solver”).

## Bloques

- [x] Bloque 1: assets `assets/marca/wordmark-1-linea-tema-{claro,oscuro}.png` (640 px de ancho) y
      `marca-panel.ts` apunta `LOGO_PANEL` al wordmark, con medidas compartidas.
- [x] Bloque 2: `CajonPanel` centra el wordmark y lo agranda a 232 × 34.
- [x] Bloque 3: `MenuLateral` cambia icono + “Solver” por el wordmark centrado (`testID="menu-marca"`).
- [x] Bloque 4: tests de marca en `CajonPanel.test.tsx` y `MenuLateral.test.tsx`; test de fondo
      `#11224D` en tema oscuro en `Drawer.test.tsx`.
- [x] Bloque 5: `DESIGN.md` documenta el wordmark centrado sin isotipo.

## Resultado final

- Archivos modificados:
  - `assets/marca/wordmark-1-linea-tema-claro.png` (nuevo)
  - `assets/marca/wordmark-1-linea-tema-oscuro.png` (nuevo)
  - `src/navigation/marca-panel.ts`
  - `src/navigation/CajonPanel.tsx`
  - `src/navigation/MenuLateral.tsx`
  - `src/navigation/CajonPanel.test.tsx`
  - `src/navigation/MenuLateral.test.tsx`
  - `src/shared/ui/Drawer.test.tsx`
  - `DESIGN.md`
- Verificación (2026-10-30):
  - `npm run lint` → OK.
  - `npm run typecheck` → OK.
  - `npm test -- --silent` → **198 suites / 1311 tests** en verde.
  - `npm run check` se detiene en la guarda de fronteras por 5 violaciones **preexistentes en
    `develop`** (`datos-prueba` fuera de módulo en calendario, cobranza-admin, comercio, onboarding y
    suscripciones); no las introduce esta tarea.
- Pendientes/seguimiento: si se quiere que el navy `#11224D` se vea también en tema claro, habría que
  forzar la tinta clara del cajón; hoy se mantiene el blanco por decisión del usuario.
