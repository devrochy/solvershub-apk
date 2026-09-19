---
estado: completada
tags: [tarea]
---

# Tarea: logo del login más compacto + íconos y splash de Solver

- **Origen:** Petición directa del usuario (2026-09-18): reducir el logo del login y ajustarlo a la pantalla; reemplazar el ícono del splash por el de Solver con fondo azul; y (3ª iteración) "el logo aún está muy grande" + "el splash corta la S".
- **Estado:** completada
- **Fecha inicio:** 2026-09-18

## Objetivo

Logo del login compacto y estable (ancho fijo), y branding Solver: splash + íconos de la app con el wordmark Solver sobre el azul de login (`#172f6c`), nombre de app "Solver" y splash sin recortes.

## Fuera de alcance

- Cambiar `android.package`/`ios.bundleIdentifier` (`com.cobraia.cobrador`).
- Un símbolo cuadrado independiente del wordmark: el asset provisto (`assets/logo-transparente.png`) es el wordmark horizontal "Solver" (697×218). Se usa tal cual.

## Diagnóstico (clave)

- **EAS Build archiva desde el commit; NO incluye cambios sin commitear.** Los metadatos lo confirman: build 1 → `40b445d` (original) y build 2 → `027aac2` (login 55%). El ajuste a 28% (commit `58570dc`) nunca llegó a un APK → el usuario seguía viendo el logo "grande". **Por eso ahora se commitea antes de construir.**
- **Corte de la "S" en el splash:** Android 12+ recorta el ícono del splash con una máscara circular. El wordmark **recortado** (697×218) se corta en los extremos; el **cuadrado con padding** `logo-transparente.png` (1024×1024, diagonal del wordmark 730 < 1024) cabe dentro de la máscara sin cortes.

## Bloques

- [x] Bloque 1: login con `logo-solver.png` (wordmark recortado), `width:150` **fijo** (no crece en tablets), `aspectRatio:697/218` (~150×47 px).
- [x] Bloque 2: assets del ícono Solver generados desde el wordmark (fondo `#172f6c`): `icon.png` 1024, `android-icon-foreground.png` 512, `android-icon-background.png` 512, `android-icon-monochrome.png` 432, `favicon.png` 48.
- [x] Bloque 3: `app.json` — `name:"Solver"`, splash `image:./assets/logo-transparente.png` (cuadrado con padding) `resizeMode:"contain"` + `imageWidth:250`, `adaptiveIcon.backgroundColor:"#172f6c"`.
- [x] Bloque 4: renombre de textos visibles "CobraIA"→"Solver" (`MenuLateral`, `SeleccionCarteraScreen` flotante, `ConfiguracionScreen` fallback + test; comentario en `api/client.ts`).
- [x] Bloque 5: eliminar `assets/logo-gestor.png` (sin uso); trackear `assets/logo-transparente.png`.

## Decisiones tomadas durante la implementación

- Cambio de asset/estilo: exento de TDD por no tener comportamiento de runtime testeable. `check.sh` en verde.
- Generación de assets sin dependencias nuevas: `pngjs` (recorte/composición) + `sips` (redimensionado).
- Login: ancho **fijo** (150) para que no escale con el tamaño de pantalla.
- Splash: **usar la imagen cuadrada con padding** (no el recorte) para evitar la máscara circular de Android 12+.
- Fondo: `#172f6c` (azul del login).

## Ambigüedades resueltas con el usuario

- Tamaño del logo login → **ancho fijo 150 px**.
- Splash → `logo-transparente.png` cuadrado, `imageWidth` **250**, `resizeMode contain`.
- Alcance → **splash y launcher**.
- Nombre → **"Solver"**.

## Resultado final

- Comandos ejecutados para verificar:
  - `npm run lint` → 0 errores (80 warnings preexistentes); `npm run typecheck` → OK.
  - `npm test -- --testTimeout=30000` → **59 suites / 429 tests en verde**.
  - `npx expo config --type public` → `name:'Solver'`, splash `logo-transparente.png` @250 sobre `#172f6c`, íconos adaptativos resueltos.
- Archivos: `app.json`, `src/screens/LoginScreen.tsx`, `src/screens/SeleccionCarteraScreen.tsx`, `src/screens/ConfiguracionScreen.tsx` (+test), `src/components/MenuLateral.tsx`, `src/api/client.ts`, `assets/logo-solver.png` (nuevo), `assets/logo-transparente.png` (nuevo), `icon.png`, `android-icon-*`, `favicon.png`; eliminado `assets/logo-gestor.png`.
- Build (EAS `preview`, APK internal): _(se completa tras el rebuild — commit previo obligatorio)_
- Pendientes/seguimiento: verificación visual en dispositivo; si se quiere un ícono cuadrado (símbolo) en vez del wordmark, aportar el asset.
