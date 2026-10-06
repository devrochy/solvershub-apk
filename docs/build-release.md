# Build y release de la app oficial (HU-APP-17)

## Entornos

| Perfil | Tipo | API | Quién lo usa |
|---|---|---|---|
| `development` | dev client (EAS) | `EXPO_PUBLIC_API_URL` local/LAN (`SOLVERSHUB_CLEARTEXT=1`) | desarrollo con módulos nativos (SQLCipher, pinning) |
| `preview` | APK instalable | test.solvershub.site | QA en dispositivos (adb/Maestro) |
| `staging` | AAB (Internal Testing) | test.solvershub.site | pre-producción |
| `production` | AAB (Play) | app.solvershub.site | producción |

## Comandos

```bash
eas build --profile preview        # APK instalable por adb
eas build --profile staging        # AAB de staging
eas build --profile production     # AAB de producción
eas submit --profile production    # Play Console (requiere cuenta del dueño)
```

## Firma

- Keystore **gestionado por EAS** (no está en el repo; `.gitignore` cubre `*.jks/*.p8/*.p12/*.key`).
- `com.solvershub.apk` y el `projectId` de EAS (`3e8fed2f-…`) **nunca se renombran**.
- Respaldar/rotar credenciales: `eas credentials` (documentar el backup fuera del repo).

## Reproducibilidad

- `package-lock.json` commiteado; `npm ci` en CI (`.npmrc` con `legacy-peer-deps`).
- SDK Expo pineado (`expo ~57.x`), versiones de `expo-*` alineadas (`npx expo install --check`).
- Tipos de API commiteados y verificados en CI (`npm run api:types` + diff-check).

## Rollback

| Tipo de cambio | Reversa |
|---|---|
| Solo JS (pantallas, lógica) | **OTA**: `eas update` al canal anterior (no requiere revisión de Play) |
| Nativo (permisos, SQLCipher, pinning, SDK) | Re-publicar el AAB anterior (runbook: `eas build` con el commit anterior) |
| Pinning roto | OTA no alcanza (nativo): AAB con pin corregido; el runbook de rotación está en `docs/seguridad.md` |

## Smoke E2E

`e2e/smoke-cobranza.yaml` (Maestro): login → selector → diario → visita de pago → modo avión →
sync → liquidación. Correr contra el APK `preview` instalado por adb.

## Estado

- 2026-10-06: perfiles y guías creados; smoke Maestro pendiente de la primera corrida con el
  build `preview`. Play Console queda pendiente de la cuenta del dueño.
