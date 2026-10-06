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

## Deuda registrada

- **Expo Go ya no recibe push remoto (SDK 53+)**: la verificación E2E del push requiere un dev
  client (build `development` de EAS) o el APK preview. En Expo Go se prueba solo el registro del
  token (permiso + POST, que ya pasó el smoke contra test).
- Opt-out por switch dentro de la app llega con Configuración móvil (HU-APP-12); hoy la baja es
  por logout o permiso del SO.
- Deep links de notificaciones del panel (escalaciones, citas) se enrutan cuando existan sus
  pantallas (HU-APP-04/08/11).
- El envío desde el backend está en agent-core #243 (EXPO_PUSH_ENABLED=false en test → log-only).

## Verificación

- `npm run check`: fronteras OK · lint 0 errores · typecheck 0 errores · **547/547 tests**.
- Registro del token validado en el smoke de test (POST/DELETE `/me/push-token` → 204).
