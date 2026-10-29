---
estado: en curso
tags: [tarea]
---

# Tarea: migrar la app a Expo SDK 58 y compilar APK preview

- **Origen:** petición del usuario 2026-10-28 ("compilar mi apk para la versión SDK Expo Go 58.0").
- **Estado:** en curso
- **Fecha inicio:** 2026-10-28
- **Rama:** `feature/sdk-58` (desde `origin/develop` en `cef1084`).

## Objetivo

Subir la app de Expo SDK 57 a SDK 58 (React Native 0.88, React 19.3) y publicar un APK
`preview` instalable contra `test.solvershub.site`, conservando SQLCipher, pinning, push y
EAS Update.

## Decisiones

- Build en la nube con EAS (`--profile preview`); no se toca iOS ni Play.
- R8 queda con el default de SDK 58. Se intentó apagarlo solo en `preview` con
  `SOLVERSHUB_DISABLE_R8`, pero un config condicionado por entorno cambia el fingerprint y el
  `runtimeVersion` del APK deja de coincidir con el que calcula el OTA; se descartó.
  Si una librería con reflexión falla, se usa `android.extraProguardRules`.
- Se migra al Strict TypeScript API (sin el opt-out de `customConditions`).

## Bloques (checklist)

- [x] Bloque 1: worktree limpio desde develop y `npm ci`.
- [x] Bloque 2: `npx expo install expo@^58.0.0 --fix` + alineación manual.
- [x] Bloque 3: migración Strict TS (refs y `List*Component` sin `null`).
- [x] Bloque 4: `expo-asset` y `expo-status-bar` como plugins; R8 con el default del SDK.
- [x] Bloque 5: verificación local (lint, typecheck, 1208 tests, expo-doctor 20/20).
- [x] Bloque 6: APK `preview` con `eas build --local` (EAS nube sin cupo hasta 2026-11-01);
      instalado en el CPH2603 y arranca sin FATAL.
- [ ] Bloque 7: smoke completo (bloqueado: el dispositivo quedó `unauthorized` y hay que
      aceptar "Permitir depuración USB" en el teléfono) + PR.

## Resultado final

- Versiones: `expo 58.0.21`, `react-native 0.88.0`, `react 19.3.0`, `jest-expo ~58.0.13`,
  `react-native-gesture-handler ~3.3.0`, `react-native-webview 14.0.1`,
  `react-native-view-shot 6.1.1`.
- `runtimeVersion` (fingerprint android): `51f01ec4b96508870b32f0edd5c0d0344e167150`.
  `fingerprint.config.js` suma `**/eas-environment-secrets/**` para que `eas build --local`
  (que copia el proyecto a un temporal) calcule el mismo hash que el build y el OTA.
- `npm test`: 188 suites, 1208 tests en verde.
- APK: `solvershub-sdk58-preview.apk` (113 MB), `com.solvershub.apk`, `versionCode 1`,
  `versionName 1.0.0`, `compileSdk 37`, `targetSdk 36`, `minSdk 24`, firmado con el keystore de
  EAS (SHA-1 `a335319afd60959fa3bbee4d172bda0e05c71c12`). `assets/fingerprint` =
  `51f01ec4…`; update embebido `e8f583a4-16db-4a46-ba1d-4b332ef3b90a`.
- Arranque en dispositivo (Android 16, CPH2603): `Running "main"`, sin `FATAL EXCEPTION`.
- `scripts/check.sh` se detiene en fronteras de módulos por 5 imports preexistentes de
  `modules/datos-prueba` en `develop` (HU-QA-10); no los introduce esta tarea. CI no ejecuta
  ese script (corre lint, typecheck y tests, los tres en verde).

## Pendientes

- Smoke en dispositivo: login, base cifrada, evidencias, mapa, push y OTA (requiere aprobar la
  depuración USB; el dispositivo quedó `unauthorized`).
- Decidir si `datos-prueba` pasa a `shared/ui` o se documenta como módulo transversal
  (ADR-APP-01) en una tarea aparte.
