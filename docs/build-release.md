# Build y release de la app oficial (HU-APP-17)

## Entornos y canales

Cada perfil de `eas.json` compila contra una API y escucha un **canal** de EAS Update (OTA).

| Perfil | Tipo | API | Canal OTA | Quién lo usa |
|---|---|---|---|---|
| `development` | dev client | local/LAN (`SOLVERSHUB_CLEARTEXT=1`) | `development` | desarrollo con módulos nativos |
| `preview` | APK (instalación interna) | test.solvershub.site | `preview` | QA en dispositivos (adb/Maestro) |
| `preview-pin-negativo` | APK | test (pin ajeno) | `pin-negativo` | prueba negativa del pinning en cada release |
| `staging` | AAB (Play · Internal Testing) | test.solvershub.site | `staging` | pre-producción |
| `production` | AAB (Play · producción) | app.solvershub.site | `production` | producción |

`com.solvershub.apk` y el `projectId` de EAS (`3e8fed2f-…`) **nunca se renombran**.

## Versionado

- `appVersionSource: remote`: EAS lleva el `versionCode` y `staging`/`production` lo suben solos
  (`autoIncrement`). Play exige que sea único y creciente: no se edita a mano.
- `version` (`app.json`) es la versión visible (`1.0.0`). Se sube a mano en cada release y se anota
  en el `CHANGELOG.md`.
- `runtimeVersion` usa la política **fingerprint**: se deriva del código nativo (dependencias,
  plugins, `app.json`). Un OTA solo llega a los binarios con el mismo fingerprint.

## Comandos

```bash
npx eas-cli build --profile preview --platform android       # APK para adb/Maestro
npx eas-cli build --profile staging --platform android       # AAB para Internal Testing
npx eas-cli build --profile production --platform android    # AAB para producción
npx eas-cli submit --profile staging --platform android --latest     # → pista interna (borrador)
npx eas-cli submit --profile production --platform android --latest  # → producción (borrador)
scripts/publicar-ota.sh <canal> "mensaje"                    # OTA (ver abajo)
```

## OTA (EAS Update)

Un OTA reemplaza **solo el JS y los assets**. Se publica **siempre** con el script:

```bash
scripts/publicar-ota.sh production "Corrige el total del diario"
```

El script fija `EXPO_PUBLIC_API_URL` según el canal. `eas update` no usa el `env` de los perfiles
de build, así que sin el script el bundle tomaría `.env.local` (la API de la LAN) y la app quedaría
apuntando a otro lado. El script rechaza canales desconocidos y `development`.

La app busca el OTA al abrir y lo aplica en el **siguiente** arranque.

### ¿OTA o AAB nuevo?

| Cambio | Cómo se publica |
|---|---|
| Solo JS: pantallas, lógica, textos, estilos | **OTA** al canal del perfil |
| Nativo: dependencia con código nativo, permisos, plugins, `app.json`, SDK de Expo | **AAB nuevo**. El fingerprint cambia y un OTA no llegaría a los binarios viejos |
| Pinning (`plugins/solvershub-nsc`) | **AAB nuevo**: el `network_security_config` es nativo (`docs/seguridad.md`) |

Para comprobar si un cambio es nativo: `npx expo-updates fingerprint:generate --platform android`
antes y después; si el hash cambia, va AAB.

## Rollback

| Situación | Reversa |
|---|---|
| Un OTA salió mal | `npx eas-cli update:republish --group <id-del-OTA-anterior>` al mismo canal, o publicar el arreglo con el script. El grupo anterior se ve en `npx eas-cli update:list --branch <canal>` |
| Un AAB salió mal (cambio nativo) | Publicar un AAB nuevo con el commit anterior (`git checkout <tag>` + `eas build --profile production` + `eas submit`). Play no deja volver a un `versionCode` menor: siempre es una build nueva |
| Pinning roto en producción | OTA no alcanza: AAB con el pin corregido (runbook de rotación en `docs/seguridad.md`) |

## Firma

- El keystore lo **gestiona EAS** (no está en el repo; `.gitignore` cubre `*.jks`, `*.p8`, `*.p12` y `*.key`).
- **Respaldo (hacerlo una vez y guardarlo fuera del repo):** `npx eas-cli credentials` → Android →
  `production` → *Keystore* → *Download existing keystore*. Guardar el `.jks` y sus contraseñas en el
  gestor de secretos del equipo. Sin ese respaldo, perder la cuenta de EAS es perder la app en Play.
- Con **Play App Signing** (recomendado al crear la app en Play), el keystore de EAS es la *upload key*.
  Si se pierde, Google permite resetearla, pero lleva días.

## Reproducibilidad

- `package-lock.json` commiteado; `npm ci` en CI (`.npmrc` con `legacy-peer-deps`).
- SDK de Expo pineado (`expo ~57.x`), con las versiones de `expo-*` alineadas (`npx expo install --check`).
- Tipos de API commiteados (`npm run api:types` desde `origin/develop` del backend).
- `npm run check` en verde antes de cualquier build de release.

## Play Console: lo que tiene que hacer el dueño

1. Crear la cuenta de desarrollador de Google Play (pago único) y verificar la identidad.
2. Crear la app **SolversHub** con el paquete `com.solvershub.apk` y activar **Play App Signing**.
3. Completar la ficha mínima: política de privacidad, clasificación de contenido, público objetivo,
   seguridad de los datos (ubicación, fotos de evidencias y datos financieros de clientes) y acceso
   para revisión (credenciales demo).
4. **Primera subida manual:** Play exige que el primer AAB se suba desde la consola. Generarlo con
   `eas build --profile staging` y subirlo a *Prueba interna*.
5. Crear una **cuenta de servicio** de Google Cloud con acceso a la app en Play Console, y cargar su
   JSON en EAS: `npx eas-cli credentials` → Android → *Google Service Account* → *Play Store
   submissions*. Desde ahí `eas submit` publica solo.
6. Las notas de la versión de Play salen del `CHANGELOG.md`. `eas submit` no las envía: se pegan en
   la consola al promover el borrador.

## Checklist de release

1. `npm run check` en verde y CHANGELOG actualizado (sube `version` si es release visible).
2. Smoke en dispositivo con `preview`: `e2e/smoke-cobranza.yaml` y `e2e/smoke-panel-dueno.yaml`
   (`e2e/README.md`). Si cambió el pinning, también `preview-pin-negativo` (`docs/seguridad.md`).
3. ¿Cambio nativo? → `eas build --profile staging`, `eas submit --profile staging` y probar desde la
   pista interna. Después `production`.
   ¿Solo JS? → `scripts/publicar-ota.sh staging`, verificar y luego `production`.
4. Anotar en el CHANGELOG el commit, el build o el grupo de OTA publicado.

## Estado

- 2026-10-06: perfiles y guías creados.
- 2026-10-07/08: smoke Maestro de campo y del dueño en verde con builds `preview` en el OPPO
  (`e2e/README.md`), y pinning positivo y negativo verificado (`docs/seguridad.md`).
- 2026-10-08: EAS Update activado (canales por perfil, `runtimeVersion` por fingerprint y
  `scripts/publicar-ota.sh`); `staging` y `production` como AAB con `submit` a borrador.
- Pendiente: la cuenta de Play Console (pasos de arriba).
