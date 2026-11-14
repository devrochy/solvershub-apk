---
estado: completada en código (pendiente build nativo y prueba en dispositivo)
tags: [apk, splash, video, presentacion, expo-video, primer-inicio]
---

# Splash compacto y presentación en video de primer inicio

- **Origen:** pedido del usuario (2026-10-29): el splash tenía el logo demasiado grande;
  quería el logo/icono como el login y preguntó si se podía incluir un video de presentación.
  Decisiones: rama aparte, fondo `#0b1733`, retener el splash hasta estar listo, logo a 220 dp,
  video solo en el primer inicio sin sesión y sin entrada para repetirlo por ahora.
- **Ajuste tras probar en el OPPO:** el logo nativo de 220 dp se veía recortado por la máscara
  circular de Android 12 (medido: ~486×440 px = 190×172 dp, con los lados del wordmark cortados).
  El splash nativo queda **solo con el fondo navy** (imagen transparente) y el logo de 220 dp se
  pinta sin máscara en el póster JS del intro.
- **Estado:** implementado y verificado en código; build nativo y prueba en el OPPO en curso.

## Por qué no es un splash de video

`expo-splash-screen`/Android solo admiten una imagen estática (o un vector animado corto).
El video no puede ser el splash nativo. La secuencia implementada es:

**splash nativo (fondo navy) → póster JS con el logo a 220 dp → video con `expo-video` → login**

El póster JS tapa la carga del video mientras `expo-video` pinta el primer frame, así que no
aparece un frame negro o blanco y el logo no pasa por la máscara circular de Android 12.

## Decisiones

- **Logo:** el splash nativo **no** pinta el logo: Android 12 lo recorta con la máscara circular
  (en el OPPO, 220 dp se ven como ~190 dp de ancho, con los extremos del wordmark cortados). El
  splash nativo queda en navy liso y el logo de **220 dp** se pinta en el póster JS, sin máscara,
  antes del video (~553 px de ancho en el OPPO, frente a los ~486 px que dejaba la máscara).
  El póster se mantiene al menos 1.2 s (y hasta que el video pinte el primer frame) para que el
  logo se vea completo antes de la animación.
- **Fondo:** `#0b1733` (navy 900), el mismo del login en tema oscuro (D-34). La imagen del splash
  nativo es `assets/splash-vacio.png` (1×1 transparente, `imageWidth: 288`) para que el sistema
  no dibuje el icono de la app ni recorte nada; solo se ve el fondo.
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

- `app.json`: plugin `expo-video`; splash `backgroundColor: "#0b1733"`,
  `image: "./assets/splash-vacio.png"`, `imageWidth: 288` (sin logo nativo).
- `index.ts`: `preventAutoHideAsync()`.
- `App.tsx`: hold hasta fuentes + flag, gate del intro y overlay del video.
- `src/modules/presentacion/`
  - `presentacion.ts`: flag local y regla `debeMostrarPresentacion`.
  - `usePresentacion.ts`: lectura del flag + `AccessibilityInfo.isReduceMotionEnabled()`.
  - `screens/PresentacionScreen.tsx`: video, póster, “Saltar” y sonido.
  - `screens/PresentacionScreen.test.tsx`, `presentacion.test.ts`.
- `assets/splash-vacio.png` (1×1 transparente para el splash nativo).
- `assets/video/presentacion.mp4`.
- `jest.setup.ts`: mock de `expo-video` para los tests.
- `package.json` / `package-lock.json`: `expo-video`.

## Verificación

- `npx expo config --type public` resuelve `expo-video` y el splash con la imagen transparente,
  `imageWidth: 288` y fondo `#0b1733`.
- Prebuild: el drawable nativo queda transparente y `colors.xml` tiene
  `splashscreen_background = #0b1733`; el logo de 220 dp se pinta en el póster JS del intro.
- Prueba en el OPPO (debug): el video se reproduce con “Saltar”; el splash nativo de 220 dp se
  veía recortado por la máscara (~486×440 px), de ahí el cambio a fondo liso + póster JS.
- `npm run lint` → verde.
- `npm run typecheck` → verde.
- `npm test -- --runInBand` → **193 suites / 1277 tests en verde** (8 tests nuevos).
- `node scripts/check-module-boundaries.mjs` → solo las 5 violaciones preexistentes de
  `../../datos-prueba` en otros módulos; `src/modules/presentacion` no agrega ninguna.
- `npm run check` completo no se ejecutó porque el paso `api:types` está desfasado contra el
  backend (deuda conocida y ajena a esta tarea); se corrieron lint, typecheck y tests por separado.

## Pendientes

- Build `preview` y prueba final en el OPPO: primer inicio con datos limpios → fondo navy →
  póster con el logo 220 → video → login; segundo inicio sin video; “Saltar”; sonido;
  “reducir movimiento”; modo avión.
- Validar que el póster JS (220 dp) no tenga recortes y que el splash nativo se vea como navy
  liso, sin icono.
- “Ver presentación” para repetirlo desde Perfil/Configuración: queda para después.
- Si el video se quiere a pantalla completa, aportar una versión vertical o generar una
  composición 1080×1920 con fondo desenfocado.
