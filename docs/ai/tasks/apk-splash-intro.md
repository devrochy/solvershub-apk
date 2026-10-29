---
estado: completada en código (pendiente build nativo y prueba en dispositivo)
tags: [apk, splash, video, presentacion, expo-video, primer-inicio]
---

# Splash compacto y presentación en video de primer inicio

- **Origen:** pedido del usuario (2026-10-29): el splash tenía el logo demasiado grande;
  quería el logo/icono como el login y preguntó si se podía incluir un video de presentación.
  Decisiones: rama aparte, fondo `#0b1733`, retener el splash hasta estar listo, logo a 220 dp,
  video solo en el primer inicio sin sesión y sin entrada para repetirlo por ahora.
- **Estado:** implementado y verificado en código; falta el build nativo y la prueba en el OPPO.

## Por qué no es un splash de video

`expo-splash-screen`/Android solo admiten una imagen estática (o un vector animado corto).
El video no puede ser el splash nativo. La secuencia implementada es:

**splash nativo (logo estático) → intro JS a pantalla completa con `expo-video` → login**

El logo del splash nativo también hace de póster mientras `expo-video` pinta el primer frame,
así que la transición es continua y no aparece un frame negro o blanco.

## Decisiones

- **Tamaño del logo:** `imageWidth: 220` (antes 250). El lienzo Android 12 es de 288 dp; con
  220 dp el contenido queda en ~217 dp y el bloque completo cabe dentro de la máscara circular
  (semidiagonal ~139 dp < radio 144 dp). En el OPPO (408 dpi) son ~553 px de ancho, frente a
  ~637 px de antes y ~484 px del login.
- **Fondo:** `#0b1733` (navy 900), el mismo del login en tema oscuro (D-34).
- **Retención del splash:** se llama a `SplashScreen.preventAutoHideAsync()` al arrancar y se
  oculta recién cuando cargaron las fuentes (o fallaron) y se leyó el flag del intro.
- **Video:** aportado por el usuario (`/home/devrochy/Downloads/videopresentacion.mp4`).
  - 848×478, 10.0 s, H.264/AAC, 2.1 MB.
  - Se muestra con `contentFit="contain"` porque es horizontal: queda centrado con barras
    navy (`#080f22`) arriba y abajo. Si más adelante hay un video vertical, se cambia a `cover`.
  - Empieza silenciado y tiene un botón para activar el sonido.
  - Se puede saltar; termina solo con `playToEnd`, con un timeout de 15 s o si el video falla.
  - No se muestra con “reducir movimiento” activo, con sesión iniciada ni si ya se vio.
  - La decisión se fija una sola vez al hidratar la sesión: cerrar sesión en la misma
    ejecución no reabre el video. Si al arrancar había sesión, tampoco aparece.
  - Se marca como visto antes de persistir; si AsyncStorage falla, la próxima lectura asume
    visto para no retener la entrada.
- **Dependencia:** `expo-video ~57.0.5` (versión del SDK 57). Es un módulo nativo: el primer
  release con esta función **requiere build nuevo**; un OTA al APK actual no lo incluye porque
  cambia el fingerprint.

## Archivos

- `app.json`: plugin `expo-video`; splash `backgroundColor: "#0b1733"`, `imageWidth: 220`.
- `index.ts`: `preventAutoHideAsync()`.
- `App.tsx`: hold hasta fuentes + flag, gate del intro y overlay del video.
- `src/modules/presentacion/`
  - `presentacion.ts`: flag local y regla `debeMostrarPresentacion`.
  - `usePresentacion.ts`: lectura del flag + `AccessibilityInfo.isReduceMotionEnabled()`.
  - `screens/PresentacionScreen.tsx`: video, póster, “Saltar” y sonido.
  - `screens/PresentacionScreen.test.tsx`, `presentacion.test.ts`.
- `assets/video/presentacion.mp4`.
- `jest.setup.ts`: mock de `expo-video` para los tests.
- `package.json` / `package-lock.json`: `expo-video`.

## Verificación

- `npx expo config --type public` resuelve `expo-video` y el splash con `imageWidth: 220` y
  fondo `#0b1733`.
- `npx expo prebuild --platform android --no-install` genera
  `drawable-xxhdpi/splashscreen_logo.png` de 864×864 con contenido de 652×522 px = 217×174 dp;
  `colors.xml` tiene `splashscreen_background = #0b1733`.
- `npm run lint` → verde.
- `npm run typecheck` → verde.
- `npm test -- --runInBand` → **193 suites / 1277 tests en verde** (8 tests nuevos).
- `node scripts/check-module-boundaries.mjs` → solo las 5 violaciones preexistentes de
  `../../datos-prueba` en otros módulos; `src/modules/presentacion` no agrega ninguna.
- `npm run check` completo no se ejecutó porque el paso `api:types` está desfasado contra el
  backend (deuda conocida y ajena a esta tarea); se corrieron lint, typecheck y tests por separado.

## Pendientes

- Build `preview` y prueba en el OPPO: primer inicio con datos limpios → splash → video → login;
  segundo inicio sin video; “Saltar”; sonido; “reducir movimiento”; modo avión; medir el logo del
  splash (~553 px de ancho).
- Decidir si se mantiene el logo en el splash (hoy queda como puente/póster). Si se prefiere sin
  logo, se quita `image` del plugin y el póster del intro.
- “Ver presentación” para repetirlo desde Perfil/Configuración: queda para después.
- Si el video se quiere a pantalla completa, aportar una versión vertical o generar una
  composición 1080×1920 con fondo desenfocado.
