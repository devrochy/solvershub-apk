---
estado: completada
tags: [tarea]
---

# Tarea: Login con el logo definitivo y estilo suave

- **Origen:** Petición directa del usuario (2026-10-27): quitar el texto «SolversHub» del login y usar el isotipo + logo definitivo, con un estilo moderno y suave.
- **Estado:** completada
- **Fecha inicio:** 2026-10-27

## Objetivo
Reemplazar el título de texto del login unificado por la pieza de marca definitiva y modernizar la
pantalla (safe area, tipografía del kit, campos con foco, CTA y detalle suave) sin tocar la lógica
de autenticación ni los testIDs.

## Decisiones tomadas (con el usuario)
- **Logo vertical completo** (isotipo cerebro-foco + SOLVERS / — HUB —), la pieza que el
  `brand/logo-definitivo/README.md` indica para splash y login.
- **Pantalla limpia sin tarjeta**: columna centrada, aire y un halo suave detrás del isotipo.
- **Adaptado al tema**: variante `-tema-claro` y `-tema-oscuro` según `useTheme()`; oscuro por
  defecto como el resto de la app (D-34).

## Bloques (checklist TDD)
- [x] Bloque 1: derivar `assets/logo-login-{claro,oscuro}.png` (760 px de ancho) del set
  `brand/logo-definitivo/png/logo-vertical/`; no se editan las fuentes de marca.
- [x] Bloque 2: `src/modules/auth/marca.ts` expone `LOGO_POR_TEMA` con los dos `require` estáticos.
- [x] Bloque 3: rediseño de `LoginUnificadoScreen`.
  - Test(s): `src/modules/auth/screens/LoginUnificadoScreen.test.tsx`

## Cambios de UI
- `SafeAreaView` + `KeyboardAvoidingView` + `ScrollView` (edge-to-edge y teclado, DESIGN.md).
- `Image` con `testID="login-logo"`, `accessibilityLabel="SolversHub"` y `aspectRatio` del set.
- Halo decorativo con `tonos.accent.bg` (token, sin colores sueltos).
- Campos al kit (`TextField` / `PasswordField`), botón `Button` (primary lg fullWidth) y
  enlace con `Button variant="link"`; error con `Icono` + región viva; fila de biometría con
  roles del kit.
- Se conservan lógica, props y testIDs (`login-usuario`, `login-password`, `login-error`,
  `login-entrar`, `login-recuperar`, `login-biometria`).

## Resultado final
- Comandos ejecutados: `npm run lint` (verde), `npm run typecheck` (verde),
  `node scripts/check-module-boundaries.mjs` (verde), `npm test` → **147 suites / 949 tests en verde**.
- `npm run check` se detiene en el paso `api:types`: el `src/core/api/schema.d.ts` commiteado está
  desfasado contra `origin/develop` del backend (6 045 inserciones ajenas a esta tarea). Se revirtió
  el archivo generado para no mezclar cambios; lint + typecheck + tests corren por separado en verde.
- Archivos:
  - `assets/logo-login-claro.png`, `assets/logo-login-oscuro.png` (nuevos)
  - `src/modules/auth/marca.ts` (nuevo)
  - `src/modules/auth/screens/LoginUnificadoScreen.tsx` (+ `.test.tsx`)
- Pendientes/seguimiento: regenerar `schema.d.ts` en una tarea aparte cuando el backend de
  integración y la app vuelvan a alinearse.
