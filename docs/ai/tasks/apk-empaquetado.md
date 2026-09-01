# Tarea: apk-empaquetado (config EAS para build APK)

- **Origen:** Fase C del plan de la APK (empaquetado) aprobado por el usuario 2026-09-01.
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-01

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
- [ ] Bloque 3: `scripts/check.sh` verde + commit/PR.

## Decisiones tomadas durante la implementación
- Paquete `com.cobraia.cobrador` (dominio + producto).
- `eas build --profile preview` produce un APK instalable (internal) para pruebas en el cel.

## Ambigüedades resueltas con el usuario
- Continuar con Fase C (empaquetado + seguridad).

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar: ...
- Archivos modificados: ...
- Pendientes/seguimiento: ...