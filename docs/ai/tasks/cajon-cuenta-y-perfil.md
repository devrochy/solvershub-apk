---
estado: completado
tags: [navegacion, panel, perfil, tema, diseno, gestos]
---

# Cajón del panel: cuenta fija, grupos plegados, logo y perfil

- **Origen:** pedido del dueño sobre el cajón del panel en la APK. Cierra el pendiente de
  HU-UX-14 para el bloque de usuario del `CajonPanel` y mejora la navegación del shell.
- **Base:** `develop` de `solvershub-apk` con el shell por pestañas, el `Drawer` del kit y el
  menú v2. Se mantiene el flujo de campo intacto.

## Qué se hizo

1. **Cajón con logo y grupos plegados.** `CajonPanel` usa el logo horizontal de SolversHub
   (`assets/logo-horizontal-{claro,oscuro}.png`, desde `solvershub-panel/brand`). Los grupos
   arrancan cerrados en cada apertura; el grupo del destino activo se abre y el cajón hace
   scroll hasta él con `onLayout` + `ScrollView.scrollTo`.
2. **Tarjeta de cuenta fija al pie.** Nuevo `CuentaPanel`: avatar, nombre y correo; al tocarla
   despliega Perfil, Tema oscuro (Switch) y Cerrar sesión. La tarjeta queda fuera del
   `ScrollView`, siempre visible. El logout conserva el cierre de la sesión de campo.
3. **Perfil como ruta del stack.** `PanelShell` pasa a un `@react-navigation/stack` con `Panel`
   (las pestañas) y `Perfil`. El cajón abre `Perfil` desde la tarjeta. El stack da
   `backBehavior="history"` en las pestañas y gesto horizontal con
   `react-native-gesture-handler`: el dedo sigue la transición y se conserva la pestaña previa.
4. **Pantalla de perfil completa.** Nuevo módulo `src/modules/perfil`:
   - datos: nombre, correo de solo lectura, teléfono (`CampoTelefono`), usuario, rol y negocio;
   - foto: galería, recorte, reducción a 512 px/JPEG y `POST/DELETE /admin/me/avatar`;
   - contraseña inline con validación (mínimo 8 y confirmación);
   - errores de la API y mensajes de éxito inline.
5. **Sesión y API.** `MeAdmin` se alinea con `MeResponse` del OpenAPI; `AdminSesion` guarda
   nombre, usuario, teléfono y avatar; el contexto expone `perfil`, `refrescarPerfil` y
   `aplicarPerfil` (callbacks estables con `sesionRef` para no entrar en bucle).
   Nuevo `@core/api/perfil-admin` con GET/PATCH/password/avatar.
6. **Header sin toggle de tema.** El tema se cambia solo desde la tarjeta del cajón (y desde el
   menú de campo). La barra de estado sigue al tema.
7. **Kit.** `CampoTelefono` sube de `modules/cobranza/components` a `shared/ui` (ya lo usan dos
   módulos) y se exporta desde el índice del kit.

## Dependencias nativas

- `react-native-gesture-handler` (2.32, SDK 57)
- `@react-native-masked-view/masked-view`
- `@react-navigation/stack`

Requiere **build nueva del APK**: el `runtimeVersion` por fingerprint cambia y el APK preview
actual no recibe estos módulos por OTA. `index.ts` importa gesture-handler al inicio y `App.tsx`
envuelve la app en `GestureHandlerRootView`. Jest carga
`react-native-gesture-handler/jestSetup.js` en `setupFiles`.

## Tests

- Nuevos: `CuentaPanel.test.tsx`, `PerfilAdminScreen.test.tsx`, `perfil-admin.test.ts`.
- Actualizados: `CajonPanel.test.tsx` (grupos plegados, tarjeta, submenú, Perfil),
  `PanelShell.test.tsx` (stack, historial, tema desde la tarjeta, ruta Perfil),
  `HeaderPanel.test.tsx` (sin toggle), `admin-session-context.test.tsx` (perfil,
  `refrescarPerfil`, `aplicarPerfil`), `CampoTelefono.test.tsx` (nueva ruta).
- `e2e/smoke-panel-dueno.yaml`: expande grupos antes de tocar entradas, cambia el tema desde
  `cajon-cuenta` y abre/cierra Perfil.

## Resultado real

- `npm run lint` ✓
- `npm run typecheck` ✓
- `npx jest --runInBand`: **150 suites, 973 tests ✓**
- `node scripts/check-module-boundaries.mjs`: OK
- `npm run check` no se ejecutó completo por el desfase conocido de `api:types`; los gates
  anteriores se corrieron por separado.

## Pendientes

- Generar el APK preview con las dependencias nativas e instalarlo en los equipos de prueba.
- Publicar la OTA al nuevo runtime.
- Prueba manual del gesto de volver siguiendo el dedo y de la foto de perfil en un Android real.
