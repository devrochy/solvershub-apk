---
estado: completada
tags: [tarea]
---

# Tarea: apk-empaquetado (config EAS para build APK)

- **Origen:** Fase C del plan de la APK (empaquetado) aprobado por el usuario 2026-09-01.
- **Estado:** completada
- **Fecha inicio:** 2026-09-01
- **Fecha cierre:** 2026-09-01

## Objetivo
Dejar la APK configurada para un build real con EAS: identidad de app (paquete Android / bundle iOS), versión, scheme y perfiles de build (development/preview/production).

## Fuera de alcance
- El build en sí (`eas build`) requiere login con cuenta Expo (paso manual del usuario).
- Iconos/splash personalizados (se usan los assets del template por ahora).

## Bloques (checklist TDD)
- [x] Bloque 1: `app.json` — name "CobraIA Cobrador", `android.package`/`ios.bundleIdentifier` `com.cobraia.cobrador`, `versionCode`, `scheme`.
  - Test(s): `npx expo config` (identidad correcta)
- [x] Bloque 2: `eas.json` — perfiles development (client dev), preview (APK internal) y production (autoIncrement).
  - Test(s): JSON válido
- [x] Bloque 3: `scripts/check.sh` verde + commit/PR.
  - Test(s): CI `build-and-test` SUCCESS en el PR #9.

## Decisiones tomadas durante la implementación
- Paquete `com.cobraia.cobrador` (dominio + producto).
- `eas build --profile preview` produce un APK instalable (internal) para pruebas en el cel.
- `appVersionSource: "remote"` en `eas.json` (el versionCode/version lo gestiona EAS en la nube).

## Ambigüedades resueltas con el usuario
- Continuar con Fase C (empaquetado + seguridad).

## Resultado final
- Comandos ejecutados para verificar: CI `build-and-test` (lint + typecheck + tests) en verde en el PR #9; merge squash a `develop` (`082ee6e`).
- Archivos modificados: `app.json` (name "CobraIA Cobrador", package/bundle `com.cobraia.cobrador`, versionCode, scheme `cobranzacobrador`), `eas.json` (perfiles development/preview/production), `docs/ai/tasks/apk-empaquetado.md`.
- Pendientes/seguimiento: build real `eas build --profile preview` (requiere `eas login`, paso manual del usuario) y prueba de instalación del APK en dispositivo.