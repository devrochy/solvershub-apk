# HU-APP-05 · Notificaciones push (app)

## Resultado

Módulo `src/modules/notificaciones/` + registro del token contra el backend (ADR-0095) + deep
link v1 (actividad de campo → Diario).

### Qué se agregó

- `push.ts`: capa nativa aislada (mockeable) — canal Android (`solvershub-general`), permisos
  (granted/undetermined/denied), `getExpoPushTokenAsync({projectId})` con el projectId de EAS
  (`app.json` extra.eas), listener de notificación tocada.
- `api.ts`: `POST/DELETE /api/v1/me/push-token` con Bearer + `X-Tenant-Id`.
- `provider.tsx` (`PushProvider`): con sesión admin y permiso concedido registra el token; al
  cambiar de negocio da de baja el registro anterior; sin sesión (logout) da de baja el último;
  al tocar una notificación delega `data` al compositor.
- `App.tsx`: `PushProvider` dentro de `AdminSessionProvider`; deep link v1 — notificación de
  `cobranza.sync` navega al Diario (`campoNavRef` nuevo en `src/navigation/refs.ts`); projectId
  EAS desde `Constants`.
- 11 tests nuevos (permisos, token, registro/baja, cambio de negocio, tap).

## Fix Expo Go (2026-10-06)

- `push.ts` detecta Expo Go (`isRunningInExpoGo` de `expo`): **todas las utilidades son no-op**
  allí (canal, permisos, token, listener) para que el desarrollo con QR no falle — desde SDK 53
  Expo Go (Android) elimina el push remoto y `getExpoPushTokenAsync` **lanza**. El push real
  corre en dev client / preview / producción.
- `PushProvider` agrega `.catch` defensivo en `configurarCanal()`.
- Dependencias alineadas al SDK 57 con `expo install --fix` (expo-notifications ~57.0.22,
  expo-sqlite ~57.0.4, expo-secure-store ~57.0.4, expo-location ~57.0.20, expo-image-picker
  ~57.0.20, expo-sharing ~57.0.22, expo-crypto ~57.0.3, `@types/jest` 29.5.14, etc.).

## Deuda registrada

- **Expo Go ya no recibe push remoto (SDK 53+)**: la verificación E2E del push requiere un dev
  client (build `development` de EAS) o el APK preview. En Expo Go el registro queda desactivado
  por el guard (antes fallaba con el throw del SDK).
- Opt-out por switch dentro de la app llega con Configuración móvil (HU-APP-12); hoy la baja es
  por logout o permiso del SO.
- Deep links de notificaciones del panel (escalaciones, citas) se enrutan cuando existan sus
  pantallas (HU-APP-04/08/11).
- El envío desde el backend está en agent-core #243 (EXPO_PUSH_ENABLED=false en test → log-only).

## Verificación

- `npm run check`: fronteras OK · lint 0 errores · typecheck 0 errores · **547/547 tests**.
- Registro del token validado en el smoke de test (POST/DELETE `/me/push-token` → 204).
