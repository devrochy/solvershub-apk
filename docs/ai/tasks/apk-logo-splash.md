---
estado: completada
tags: [tarea]
---

# Tarea: logo del login + íconos y splash de Solver

- **Origen:** Petición directa del usuario (2026-09-18), iterando: (1) reducir el logo del login; (2) reemplazar el ícono del splash por el de Solver con fondo azul; (3) el logo seguía grande y el splash cortaba la "S"; (4) usar `logo-transparente.png` ajustado a la pantalla y el launcher con el estilo del splash.
- **Estado:** completada
- **Fecha inicio:** 2026-09-18

## Objetivo

Login con `logo-transparente.png` ajustado al ancho de la pantalla, y branding Solver consistente: splash + launcher con el wordmark sobre el azul de login (`#172f6c`), nombre de app "Solver".

## Fuera de alcance

- Cambiar `android.package`/`ios.bundleIdentifier` (`com.cobraia.cobrador`).
- Un símbolo cuadrado independiente del wordmark: `assets/logo-transparente.png` es el wordmark horizontal "Solver".

## Diagnóstico (clave)

- **EAS Build archiva desde el commit; NO incluye cambios sin commitear.** Los APK previos eran `40b445d` (original) y `027aac2` (login 55%). Por eso el ajuste nunca llegaba → **ahora se commitea antes de construir**.
- **Corte de la "S" en el splash:** Android 12+ recorta el ícono del splash con máscara circular. El wordmark **recortado** se corta; el **cuadrado con padding** `logo-transparente.png` (1024×1024; diagonal del wordmark 730 < 1024) cabe sin cortes.
- **Consistencia launcher/splash:** el splash compone el wordmark al **68%** del cuadrado; el launcher se regeneró con la misma composición.

## Bloques

- [x] Bloque 1: login con `logo-transparente.png` (cuadrado, `resizeMode:"contain"`), `width:"70%"`, `aspectRatio:1` → el wordmark queda centrado sobre el fondo azul (~163 px en teléfono de 390).
- [x] Bloque 2: launcher estilo splash, compuesto sobre `#172f6c`:
  - `icon.png` 1024 = azul + logo al 100% (wordmark 68%, igual que el splash).
  - `android-icon-foreground.png` 512 = logo 465 (wordmark ~317, dentro de la zona segura).
  - `android-icon-background.png` 512 = azul sólido.
  - `android-icon-monochrome.png` 432 = silueta blanca (logo 390).
  - `favicon.png` 48.
- [x] Bloque 3: `app.json` — `name:"Solver"`, splash `image:./assets/logo-transparente.png` @250 `resizeMode:"contain"`, `adaptiveIcon.backgroundColor:"#172f6c"`.
- [x] Bloque 4: renombre de textos visibles "CobraIA"→"Solver" (`MenuLateral`, `SeleccionCarteraScreen` flotante, `ConfiguracionScreen` + test; comentario en `api/client.ts`).
- [x] Bloque 5: eliminar assets sin uso (`logo-gestor.png` y `logo-solver.png`).

## Decisiones tomadas durante la implementación

- Cambio de asset/estilo: exento de TDD por no tener comportamiento de runtime testeable. `check.sh` en verde.
- Generación de assets sin dependencias nuevas: `pngjs` (composición) + `sips` (redimensionado).
- Login con el cuadrado completo de `logo-transparente.png` al 70% (pedido del usuario), aunque reserva una caja cuadrada con padding transparente.
- Launcher adaptativo con el wordmark dentro de la zona segura (~62%), azul por `backgroundColor`.

## Ambigüedades resueltas con el usuario

- Login → `logo-transparente.png`, `width:"70%"`, `resizeMode:"contain"`.
- Splash → `logo-transparente.png` cuadrado @250, `contain`, fondo `#172f6c`.
- Launcher → mismo estilo del splash (wordmark al 68% sobre azul).
- Nombre → **"Solver"**.

## Resultado final

- Comandos ejecutados para verificar:
  - `npm run lint` → 0 errores (80 warnings preexistentes); `npm run typecheck` → OK.
  - `npm test -- --testTimeout=30000` → **59 suites / 429 tests en verde**.
  - `npx expo config --type public` → `name:'Solver'`, splash `logo-transparente.png` @250, íconos `icon.png`/`android-icon-*`/`favicon.png`.
- Archivos: `app.json`, `src/screens/LoginScreen.tsx`, `src/screens/SeleccionCarteraScreen.tsx`, `src/screens/ConfiguracionScreen.tsx` (+test), `src/components/MenuLateral.tsx`, `src/api/client.ts`, `assets/logo-transparente.png`, `icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `favicon.png`; eliminados `assets/logo-gestor.png` y `assets/logo-solver.png`.
- Build (EAS `preview`, APK internal), commit `5b14213`:
  - Build: https://expo.dev/accounts/devrochy/projects/app-cobranza-apk/builds/8e32fb82-1c83-4c05-909f-af7b2da41e97
  - APK: https://expo.dev/artifacts/eas/OZ7KkTbFRWiSIMkRdr-KC-EiQWAVrT9pfpX-ueYiOQk.apk
- Pendientes/seguimiento: verificación visual en dispositivo; si se quiere un símbolo cuadrado en vez del wordmark, aportar el asset.
