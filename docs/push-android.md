# Push en Android: puesta en marcha (HU-APP-05)

El código de push ya está: la app pide permiso, obtiene el token Expo y lo registra en
`POST /api/v1/me/push-token`. El backend envía desde el worker de Celery y el deep link
lleva a la pantalla correcta. Para que funcione en un APK faltan tres credenciales y una
variable, que no van en el repo:

| Pieza | Para qué | Dónde vive |
|---|---|---|
| `google-services.json` | Que la app obtenga el token del dispositivo (Firebase) | Variable de archivo de EAS `GOOGLE_SERVICES_JSON` |
| Clave de cuenta de servicio (FCM V1) | Que Expo pueda entregar los push a Android | Credenciales de EAS |
| `EXPO_PUSH_ENABLED=true` | Que el backend envíe de verdad (sin ella solo loguea `push_disabled`) | Entorno del **worker** en Coolify |

Sin `google-services.json`, `getExpoPushTokenAsync` lanza en Android y el dispositivo nunca
se registra. Desde este cambio la app lo deja en logcat (`[push] no se obtuvo el token
Expo`) en vez de tragarse el error.

## 1. Firebase: proyecto y app Android

1. En la [consola de Firebase](https://console.firebase.google.com), crea un proyecto o usa uno existente.
2. *Agregar app* → **Android** → nombre del paquete **`com.solvershub.apk`**. El SHA-1 no hace falta para push.
3. Descarga `google-services.json`. Está en el `.gitignore` y no se commitea.

## 2. EAS: subir el `google-services.json`

Desde la raíz del repo, con el archivo descargado:

```bash
npx eas-cli env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json \
  --visibility sensitive --environment preview --environment production --non-interactive
```

`app.config.js` lo toma de esa variable al compilar. Los perfiles `preview`, `staging` y
`preview-pin-negativo` usan el entorno `preview`; `production` usa `production`.

## 3. EAS: clave FCM V1 para enviar

1. Firebase → *Configuración del proyecto* → *Cuentas de servicio* → **Generar nueva clave privada**.
   Es un JSON con secreto: guárdalo fuera del repo.
2. `npx eas-cli credentials` → **Android** → perfil `preview` (y luego `production`) →
   *Google Service Account* → *Manage your Google Service Account Key for Push Notifications (FCM V1)* →
   *Set up* → *Upload a new service account key* → elige el JSON.

## 4. Backend de test: activar el envío

En Coolify, en el worker de test **`uqfcdd4a3cf5d4iqa0uosrp0`**, que es el que se despliega
con `develop`:

- `EXPO_PUSH_ENABLED=true`
- `EXPO_PUSH_ACCESS_TOKEN=<token>`, solo si activas *Enhanced push security* en el proyecto de Expo.

Redespliega el worker. Ojo: al 2026-10-08 también sigue arriba un worker viejo,
`wv6kycjeae0lmfj11dprkasq`, con la imagen del 2026-09-28. Si consume la misma cola, una tarea
de push que caiga en él se queda en `push_disabled` y además corre con código atrasado. Lo
mejor es detenerlo; si no, ponle la misma variable.

## 5. Build y verificación

1. `npx eas-cli build --profile preview --platform android`. Instálalo limpio (`adb uninstall` + `adb install`).
2. Entra como dueño (`dueno-a@demo.test`) y **acepta el permiso de notificaciones**. En OPPO,
   si se negó antes: *Ajustes → Apps → SolversHub → Notificaciones*. `adb shell pm grant` está bloqueado.
3. Comprueba que el token quedó registrado: una fila nueva en `push_tokens` del negocio.
4. Dispara un evento. Los destinatarios son los dueños: una escalación en el negocio, o actividad
   de campo del gestor (`gestor@demo.test`) que sincronice.
5. El push llega y, al tocarlo, abre la pantalla de destino (`cobranza.sync` → Diario).
