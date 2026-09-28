---
estado: completado
tags: [tokens, diseno, tema]
---

# Tokens de marca SolversHub en la APK (paleta centralizada)

- **Origen:** plan del panel (SolversHub) — "aplicar el sistema de diseño también al panel y a la APK" (tanda 6E).
- **Estado:** completado y validado (`npm run check` en verde).

## Qué se hizo

1. **`scripts/sync-tokens.mjs`** (nuevo) + script `npm run tokens:sync`: copia el tema RN
   generado por la marca (`solvershub/brand/tokens/dist/theme.ts`, fuente `tokens.json`
   en formato DTCG) a **`src/theme/tokens.ts`** (archivo generado, con banner).
   Ruta alterna por argumento: `node scripts/sync-tokens.mjs <ruta-al-brand>`.
2. **`src/theme/theme.ts`**: los 10 roles de `ColoresTema` (`fondo`, `tarjeta`, `texto`,
   `textoSuave`, `borde`, `primario`, `sobrePrimario`, `acento`, `activoSuave`, `peligro`)
   ahora se **derivan de los tokens semánticos** (`shTheme.light/dark`, `shColor`), no de
   hex sueltos. La interfaz no cambió: ningún componente necesitó tocarse.
3. **`src/theme/theme-tokens.test.ts`** (nuevo): verifica que los 10 roles existen en ambos
   temas, que no están vacíos y que mapean a los tokens (`claro.acento === light.link`,
   `oscuro.acento === cyan.400`, `peligro === danger`, `primario === navy.700`).
4. Tests de componentes que afirmaban hex del tema, ahora referencian `COLORES`
   (`HeaderPantalla.test.tsx`, `ModalConFooter.test.tsx`, `TrayectoDiarioScreen.test.tsx`):
   cambiar la paleta ya no rompe esas pruebas.

## Resultado real

- `npm run check` (lint + typecheck + jest): **68 suites, 490 tests, todo en verde**.
- Paleta efectiva: claro fondo `#F7F9FC`, texto `#0B1733`, acento `#2560E6`, peligro `#D64545`;
  oscuro fondo `#0B1733`, tarjeta `#11224D`, acento `#22C7E0`.
- Flujo de cambio de marca: editar `brand/tokens/tokens.json` → `npm run build` (en
  `brand/tokens`) → `npm run tokens:sync` en la APK.

## Pendientes (registrados)

- **Barrido de hex hardcodeados**: varios componentes aún traen colores literales fuera del
  tema (`HeaderPantalla` `#ffffff/#d4dff0`, `BannerMensaje` `#f0fdf4/#bbf7d0/#fef2f2/#fecaca`
  y su texto `#15803d/#b91c1c`, `CampoTelefono` `#f5f7ff/#16a34a`, y el gris `#64748b` de
  `ClientesScreen`/acentos de `TrayectoDiarioScreen`). Migrarlos al tema + actualizar sus
  tests (los que afirman hex literal seguirán pasando hasta entonces).
- **Tipografías de marca** (Montserrat display / Inter cuerpo, manual §6): hoy la APK usa
  Roboto vía `@expo-google-fonts/roboto`. Requiere instalar `@expo-google-fonts/{montserrat,inter}`,
  registrarlas en `App.tsx` y un pase de estilos.
- **Validación de marca del vertical**: confirmar si CobraIA usa la paleta SolversHub tal cual
  o una variante (la infraestructura de tokens ya lo permite sin tocar componentes).
