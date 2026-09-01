# Tarea: apk-bootstrap (repo app-cobranza-apk — base Expo + sesión + login + pantallas core)

- **Origen:** Plan del APK del cobrador aprobado por el usuario 2026-08-31 (Expo + TypeScript; modo en línea primero; offline al final). Backend APK listo en PR #77 (cobrador-apk-api).
- **Estado:** en progreso
- **Fecha inicio:** 2026-08-31

## Objetivo
Crear el repo `app-cobranza-apk` (Expo/React Native + TypeScript) con la base: config (`EXPO_PUBLIC_API_URL`), cliente HTTP tipado (Bearer + refresh-on-401), sesión JWT (jose) en `expo-secure-store`, login del cobrador, guard de navegación y pantallas core (mis-rutas, día, cliente con visita pago/no-pago, gasto). Jest + RNTL.

## Fuera de alcance (próximas tareas)
- Offline-first (cola local + sync) y `aplicar-offline-dominio` (backend) — diferidos a cuando se pruebe en línea.
- Evidencias de gasto con cámara (expo-image-picker) y trayectoria GPS real (expo-location) — iteraciones siguientes.

## Bloques (checklist TDD)
- [x] Bloque 1: Bootstrap — scaffold Expo SDK 57 + TS, navegación (react-navigation native-stack), jest-expo + RNTL, ESLint (expo lint), `scripts/check.sh`, CI (build+test+gitleaks), `.env.example`, `AGENTS.md`.
- [x] Bloque 2: `ApiClient` (Bearer, refresh-on-401 con reintento, `ApiError`) + `jwt.ts` (decode/expiry) + token-store (secure-store, incluye perfil) + `cobradorApi`/`apiLogin`.
  - Test(s): `src/api/client.test.ts` (6), `src/api/cobrador.test.ts` (8).
- [x] Bloque 3: `SessionProvider` (restaura sesión, login/logout) + `LoginScreen` + guard de rutas en `App.tsx`.
  - Test(s): `src/screens/LoginScreen.test.tsx` (3).
- [x] Bloque 4: Pantallas core — `RutasScreen` (mis-rutas), `DiaScreen` (clientes del día + gasto simple), `ClienteScreen` (tarjeta + visita pago/no-pago con catálogos).
  - Test(s): `src/screens/RutasScreen.test.tsx` (2).

## Decisiones tomadas durante la implementación
- RNTL v14: `render`/`fireEvent` son **async** (hay que `await`).
- `jose` es ESM → agregado al `transformIgnorePatterns` de jest.
- TS 6 depreca `baseUrl` → alias `@/*` solo con `paths`.
- Patrón fetch-on-mount marca `react-hooks/set-state-in-effect` (falso positivo para async) → `eslint-disable` puntual documentado.
- Backend: se agregó `GET /cobrador/rutas/:id/clientes/:clienteId/prestamos` y `id` en `CuotaPublic` (la APK necesita `cuotaId` para pagar una cuota). Va en PR #77.

## Ambigüedades resueltas con el usuario
- Pregunta: ¿orden? → "Seguir con el APK y dejar el proceso offline al final para probar".

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (lint + typecheck + 19 tests, 4 suites). CI del repo (build-and-test: install/lint/typecheck/test/gitleaks) en verde.
- Archivos modificados: scaffold completo + `src/` (config, types, api, session, screens, components, domain) + `App.tsx` + infra (AGENTS.md, scripts/check.sh, CI, jest, eslint, .env.example) + `docs/ai/tasks/apk-bootstrap.md`.
- Estado repo: `devrochy/app-cobranza-apk` (privado) creado, `develop` en `f09dcc6` pusheado, CI verde.
- Pendientes/seguimiento: mergear PR #78 (backend, endpoint de préstamos del cobrador). Next: evidencias con cámara (expo-image-picker) + trayectoria GPS (expo-location); offline-first (cola local + sync) y `aplicar-offline-dominio` (backend) al final.