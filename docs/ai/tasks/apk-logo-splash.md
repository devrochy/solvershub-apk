---
estado: completada
tags: [tarea]
---

# Tarea: logo del login + íconos y splash de Solver

- **Origen:** Petición directa del usuario (2026-09-18), iterando: reducir el logo del login; reemplazar el ícono del splash por el de Solver con fondo azul; el splash cortaba la "S"; usar `logo-transparente.png` ajustado a la pantalla y el launcher con el estilo del splash; y, tras instalar en un OPPO CPH2603, el logo seguía ocupando toda la pantalla.
- **Estado:** completada
- **Fecha inicio:** 2026-09-18

## Objetivo

Login con el wordmark Solver a un tamaño controlado (~30% del ancho de pantalla), y branding Solver consistente: splash + launcher con el wordmark sobre el azul de login (`#172f6c`), nombre de app "Solver".

## Fuera de alcance

- Cambiar `android.package`/`ios.bundleIdentifier` (`com.cobraia.cobrador`).
- Un símbolo cuadrado independiente del wordmark: `assets/logo-transparente.png` es el wordmark horizontal "Solver".

## Diagnóstico (clave)

1. **EAS Build archiva desde el commit; no incluye cambios sin commitear.** Los APK previos eran `40b445d` (original) y `027aac2` (login 55%). → **commitear antes de construir**.
2. **Corte de la "S" en el splash:** Android 12+ recorta el ícono con máscara circular; el cuadrado con padding `logo-transparente.png` (1024×1024; diagonal del wordmark 730 < 1024) cabe sin cortes.
3. **Bug real del login (medido en dispositivo):** con `width:"70%"` + `aspectRatio:1`, la `Image` **no aplicaba el tamaño** y se renderizaba a su tamaño intrínseco (1024 dp): el wordmark ocupaba el **100% del ancho** (y se cortaba en los bordes). Verificado con `adb exec-out screencap` + análisis de píxeles. → **solución: tamaño numérico explícito** (`useWindowDimensions`), que sí se aplica.
4. **"No se pudo conectar" en el login:** el `AndroidManifest.xml` del APK **no declara `usesCleartextTraffic` ni `networkSecurityConfig`**; con `targetSdk 36` Android **bloquea el HTTP sin cifrar** por defecto (el build `preview` es release; el manifest de debug no aplica). El backend HTTP local (`http://192.168.40.5:3000`) queda inalcanzable. → **solución: `expo-build-properties` con `android.usesCleartextTraffic: true`.**

## Bloques

- [x] Bloque 1: login — `logo-transparente.png` con tamaño **explícito** `logoTamano = Math.round(anchoPantalla * 0.44)` (wordmark ≈ 30% del ancho), `resizeMode:"contain"`; `form` con `width:"100%"`.
- [x] Bloque 2: launcher estilo splash, compuesto sobre `#172f6c`: `icon.png` 1024 (wordmark 68%), `android-icon-foreground.png` 512 (dentro de zona segura), `android-icon-background.png` 512 (azul), `android-icon-monochrome.png` 432 (silueta), `favicon.png` 48.
- [x] Bloque 3: `app.json` — `name:"Solver"`, splash `logo-transparente.png` @250 `contain` sobre `#172f6c`, `adaptiveIcon.backgroundColor:"#172f6c"`.
- [x] Bloque 4: renombre de textos visibles "CobraIA"→"Solver" (menú, selección de cartera, configuración + test, comentario en `api/client.ts`).
- [x] Bloque 5: eliminar `logo-gestor.png` y `logo-solver.png` (sin uso).
- [x] Bloque 6: permitir HTTP en el APK de pruebas — `expo-build-properties` con `android.usesCleartextTraffic: true` (necesario para conectar al backend local `http://192.168.40.5:3000`).

## Decisiones tomadas durante la implementación

- Tamaño del logo con **números explícitos** (no `%` + `aspectRatio`) por el bug observado en la New Architecture.
- Assets generados sin dependencias nuevas: `pngjs` (composición) + `sips` (redimensionado).
- No tocar `package`/`bundleIdentifier`.

## Ambigüedades resueltas con el usuario

- Login → `logo-transparente.png`, wordmark ~30% del ancho.
- Splash → `logo-transparente.png` cuadrado @250, `contain`, fondo `#172f6c`.
- Launcher → mismo estilo del splash (wordmark al 68% sobre azul).
- Nombre → **"Solver"**.

## Resultado final

- Verificación: `npm run lint` → 0 errores (80 warnings preexistentes); `npm run typecheck` → OK; `npm test -- --testTimeout=30000` → **59 suites / 429 tests**; `npx expo config` resuelve name/splash/íconos.
- Instalado en dispositivo OPPO CPH2603 (`1080×2412`, 408 dpi) por `adb install -r`. Medición del render: con el bug, el wordmark ocupaba 100% del ancho; con el fix se espera ~30%.
- Build (EAS `preview`, APK internal), commit `a01f590`:
  - Build: https://expo.dev/accounts/devrochy/projects/app-cobranza-apk/builds/ace55568-9423-492f-a5aa-c6be22d34fdf
  - APK: https://expo.dev/artifacts/eas/pGnnNxthPEewQei8nLvYAzAmkN-VpFoZvC47t5Qd8GY.apk
- Build con fix de conectividad (EAS `preview`), commit `17528f0`:
  - Build: https://expo.dev/accounts/devrochy/projects/app-cobranza-apk/builds/429371b1-0284-430f-a62a-01ecb465f75a
  - APK: https://expo.dev/artifacts/eas/u_QGfhTqbFg1ReiG5Cyu2vNuf8Z2CQNig-zuoyHQCIk.apk
  - Verificado en el APK: el `AndroidManifest.xml` ahora **sí** declara `usesCleartextTraffic` (antes ausente).
  - Verificado en dispositivo (OPPO CPH2603, misma WiFi, `wlan0 192.168.40.3`): la app **llega al backend** — al intentar login responde con `401` y la app muestra "Usuario o contraseña incorrectos" (antes: "No se pudo conectar"); sin errores de `cleartext` en `logcat`. Desde el teléfono, `GET http://192.168.40.5:3000/health` → **200**.
  - Credenciales de prueba del seed (nombres viejos en BD): gestor `test-cobrador-1` / `test-password`; propietario `test-socio-1`.
- Verificación en dispositivo (OPPO CPH2603), tras `adb install -r`:
  - **Login:** medido en pantalla → wordmark **323 px = 29.9%** del ancho (objetivo ~30%); formulario al 88.7%. Corrige el bug de render (antes ocupaba 100%).
  - **Launcher:** el ícono/etiqueta viejos estaban **cacheados** por ColorOS (mostraba "CobraIA" y un ícono no azul). Tras **forzar el launcher** (`am force-stop com.android.launcher`), se refrescó: etiqueta **"Solver"** e ícono azul con el wordmark (check cian verificado por píxeles).
- Pendientes/seguimiento: si el launcher no refresca solo en otro equipo, reinstalar/reiniciar el launcher; si se quiere un símbolo cuadrado en vez del wordmark, aportar el asset.
