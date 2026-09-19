---
estado: completada
tags: [tarea]
---

# Tarea: logo del login más compacto + íconos y splash de Solver

- **Origen:** Petición directa del usuario (2026-09-18): "la APK quedó con el logo muy grande en el login; quiero reducirlo y ajustarlo a la pantalla con el formulario" y, en segunda iteración, "el splash muestra CobraIA Gestor y un icono; reemplazarlo por el de Solver, con fondo azul".
- **Estado:** completada
- **Fecha inicio:** 2026-09-18

## Objetivo

Logo del login compacto (tamaño percibido original, sin padding transparente) y branding Solver: splash + íconos de la app con el logo Solver sobre el azul de login (`#172f6c`), y nombre de app "Solver".

## Fuera de alcance

- Cambiar el `android.package`/`ios.bundleIdentifier` (`com.cobraia.cobrador`).
- Un símbolo cuadrado independiente del wordmark: el asset provisto (`assets/logo-transparente.png`) es el wordmark horizontal "Solver" (697×218). Se usa tal cual, centrado sobre azul.

## Diagnóstico

- `assets/logo-transparente.png` (provisto por el usuario) = wordmark horizontal "Solver": texto blanco + check azul/cian, 697×218, transparente.
- La primera iteración subió el ancho visible del logo a 55% (el asset original 1024×1024 con padding se veía a ~27%): de ahí que siguiera "grande".
- El splash/íconos usaban assets viejos (`logo-gestor.png`, `icon.png`/`android-icon-*` con fondo `#E6F4FE`).

## Bloques

- [x] Bloque 1: login con `logo-solver.png`, `width:"28%"`, `aspectRatio:697/218` (tamaño percibido original, sin padding).
- [x] Bloque 2: assets del ícono Solver generados desde el wordmark (fondo `#172f6c`):
  - `icon.png` 1024 (wordmark 780px), `android-icon-foreground.png` 512 (wordmark 300px, zona segura), `android-icon-background.png` 512 (azul), `android-icon-monochrome.png` 432 (silueta blanca), `favicon.png` 48.
- [x] Bloque 3: `app.json` — `name:"Solver"`, splash `image:./assets/logo-solver.png` + `imageWidth:200`, `adaptiveIcon.backgroundColor:"#172f6c"`.
- [x] Bloque 4: renombre de textos visibles "CobraIA"→"Solver" (`MenuLateral`, `SeleccionCarteraScreen` flotante, `ConfiguracionScreen` fallback + test; comentario en `api/client.ts`).
- [x] Bloque 5: eliminar `assets/logo-gestor.png` (sin uso).

## Decisiones tomadas durante la implementación

- Cambio de asset/estilo: exento de TDD por no tener comportamiento de runtime testeable. `check.sh` se mantiene en verde.
- Generación de assets sin dependencias nuevas: `pngjs` (recorte/composición) + `sips` (redimensionado).
- Fondo de íconos y splash: `#172f6c` (azul del login), pedido por el usuario.

## Ambigüedades resueltas con el usuario

- Tamaño del logo login → **~28%** (visible original).
- Ícono Solver → el usuario dejó `assets/logo-transparente.png` (wordmark) y pidió fondo azul del login.
- Alcance → **splash y launcher**.
- Nombre → **"Solver"**.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar:
  - `npm run lint` → 0 errores (80 warnings preexistentes); `npm run typecheck` → OK.
  - `npm test -- --testTimeout=30000` → **59 suites / 429 tests en verde** (el timeout por defecto de 5 s falla por carga de la máquina).
  - `npx expo config --type public` → `name:'Solver'`, splash `logo-solver.png` @200 sobre `#172f6c`, íconos adaptativos resueltos.
- Archivos modificados:
  - `app.json`, `src/screens/LoginScreen.tsx`, `src/screens/SeleccionCarteraScreen.tsx`, `src/screens/ConfiguracionScreen.tsx` (+test), `src/components/MenuLateral.tsx`, `src/api/client.ts`.
  - Assets: `assets/logo-solver.png` (nuevo), `icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `favicon.png`; eliminado `assets/logo-gestor.png`.
- Build (EAS `preview`, APK internal):
  - Build: https://expo.dev/accounts/devrochy/projects/app-cobranza-apk/builds/97ba31e6-2288-4739-9169-ba93bb49ed34
  - APK: https://expo.dev/artifacts/eas/pB8-V6YK9s7qMmeD-ekqDWwRKaY7UBe6slvoUWr8eu4.apk
- Pendientes/seguimiento: verificación visual en dispositivo; si se quiere un ícono cuadrado (símbolo) en vez del wordmark, aportar el asset.
