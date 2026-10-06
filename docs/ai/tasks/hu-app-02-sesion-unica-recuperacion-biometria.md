# HU-APP-02 · Sesión única, recuperación de contraseña y biometría (app)

## Resultado

Módulo nuevo `src/modules/auth/` (primer módulo bajo ADR-APP-01) + convergencia del login en
`App.tsx` con el flujo de campo existente intacto.

### Qué se agregó

- `api.ts`: cliente de la identidad admin (ADR-0094) — `apiLoginAdmin`, `apiMeAdmin`,
  `apiOlvidarContrasena`, `apiRestablecerContrasena` y `apiGestorToken` (exchange a tokens de
  campo). `ApiAuthError` con código del servidor. Raíz `/api/v1` vía `apiV1()` en `@core/config`
  (la `API_URL` sigue apuntando al pack de campo).
- `admin-session-context.tsx`: sesión admin (token opaco) persistida en SecureStore
  (`solvershub_admin_sesion`), con login (admin+me), hydrate y logout. Sin refresh: al expirar,
  la app vuelve al login (igual que el panel).
- `biometria.ts`: disponibilidad, habilitación persistida (`solvershub_biometria_habilitada`) y
  autenticación con `expo-local-authentication` (nueva dependencia SDK 57).
- Pantallas: `LoginUnificadoScreen` (una sola puerta: admin login → me → si hay UN negocio hace
  el exchange y aplica la sesión de campo; si hay 0 o varios, delega al flujo legado de
  invitaciones/selector de ADR-0081), `RecuperarContrasenaScreen` (solicitar código → aplicar →
  confirmar), `BloqueoBiometrico` + `useBloqueoBiometrico` (puerta opt-in sobre el contenido).
- `navigation.tsx` (`AuthStackParamList`), `index.ts` (API pública del módulo), `@core/secure-kv.ts`
  (almacén seguro genérico).

### Convergencia (App.tsx)

- `AdminSessionProvider` envuelve el árbol. Sin sesión admin → `AuthStack` (login unificado +
  recuperación). Con sesión admin y biometría habilitada → `BloqueoBiometrico` antes del
  contenido. Sin sesión de campo todavía → el login unificado resuelve (invitaciones/selector
  del flujo legado siguen renderizando igual).
- El exchange aplica los tokens con `aplicarSesionExterna()` (nuevo método del `SessionProvider`
  legacy que expone el `aplicarSesion` interno): **el flujo de campo no cambia nada aguas abajo**.
- `MenuLateral`: cerrar sesión limpia también la sesión admin.

## Verificación

- `npm run check` completo: fronteras OK (módulo auth dentro de reglas) · lint 0 errores ·
  typecheck 0 errores · **517/517 tests** (498 baseline + 19 nuevos del módulo y menú).

## Deuda registrada

- Usuario admin con varios negocios o solo invitaciones: se resuelve con el flujo legado
  (selector/invitaciones de campo) hasta HU-APP-03 (selector admin + shell por permisos).
- Panel-only (sin acceso de campo) muestra el 403 del exchange como error; el PanelShell llega
  en HU-APP-03.
- El aviso "sin conexión" no distingue red de servidor 5xx (mejora posterior con `esErrorDeRed`).
