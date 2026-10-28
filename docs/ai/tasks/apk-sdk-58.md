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
- R8 (activo por defecto en release desde SDK 58) se apaga **solo** en `preview` mediante
  `SOLVERSHUB_DISABLE_R8=1` en `eas.json` y `app.config.js`; `staging`/`production` conservan
  el default para validarlo en su ciclo.
- Se migra al Strict TypeScript API (sin el opt-out de `customConditions`).

## Bloques (checklist)

- [x] Bloque 1: worktree limpio desde develop y `npm ci`.
- [x] Bloque 2: `npx expo install expo@^58.0.0 --fix` + alineación manual.
- [x] Bloque 3: migración Strict TS (refs y `List*Component` sin `null`).
- [x] Bloque 4: `expo-asset` y `expo-status-bar` como plugins; R8 scoped a preview.
- [x] Bloque 5: verificación local (lint, typecheck, 1208 tests, expo-doctor 20/20).
- [ ] Bloque 6: build `preview` en EAS, instalación y smoke en dispositivo.
- [ ] Bloque 7: docs + CHANGELOG + PR.

## Resultado final

- Versiones: `expo 58.0.21`, `react-native 0.88.0`, `react 19.3.0`, `jest-expo ~58.0.13`,
  `react-native-gesture-handler ~3.3.0`, `react-native-webview 14.0.1`,
  `react-native-view-shot 6.1.1`.
- `runtimeVersion` (fingerprint android): `51f01ec4b96508870b32f0edd5c0d0344e167150`.
- `expo-doctor`: 20/20.
- `npm test`: 188 suites, 1208 tests en verde.
- `scripts/check.sh` se detiene en fronteras de módulos por 5 imports preexistentes de
  `modules/datos-prueba` en `develop` (HU-QA-10); no los introduce esta tarea. CI no ejecuta
  ese script (corre lint, typecheck y tests, los tres en verde).

## Pendientes

- Validar el APK en dispositivo: login, base cifrada, evidencias, mapa, push y OTA.
- Decidir si `datos-prueba` pasa a `shared/ui` o se documenta como módulo transversal
  (ADR-APP-01) en una tarea aparte.
