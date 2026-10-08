# Seguridad de la app oficial (HU-APP-16)

Checklist OWASP MASVS v2 · nivel L1 aplicado a la app (evidencia de implementación).

## Plataforma

| Control | Estado | Dónde |
|---|---|---|
| Red: HTTPS con validación de certificados | ✅ | fetch nativo + **certificate pinning** (`plugins/solvershub-nsc` → `network_security_config.xml`, pins de CA: LE YE2 + ISRG Root X2) |
| Sin tráfico claro en producción | ✅ | `base-config cleartextTrafficPermitted=false` (NSC manda sobre el manifest); desarrollo usa `SOLVERSHUB_CLEARTEXT=1` solo en perfiles dev |
| Almacenamiento local cifrado | ✅ | expo-sqlite + SQLCipher (`PRAGMA key`, clave maestra en SecureStore) — ADR-APP-05 |
| Tokens de sesión en almacén seguro | ✅ | `expo-secure-store` (Keystore/Keychain); web solo en memoria |
| Sin secretos en el bundle | ✅ | solo `EXPO_PUBLIC_*` (URLs); gitleaks en CI |
| Biometría de desbloqueo (opt-in) | ✅ | `expo-local-authentication` (HU-APP-02) |
| Auditoría de acciones críticas | ✅ | local en SQLite + subida idempotente a `/api/v1/audit/mobile-events` (HU-APP-16) |
| Verificación de integridad / anti-tamper | ⏳ deuda (L2) | documentado, fuera de L1 |

## Runbook de rotación de pins

1. Obtener el SPKI del intermedio vigente:
   `echo | openssl s_client -connect test.solvershub.site:443 -showcerts | awk '/BEGIN CERTIFICATE/{n++} n==2' | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64`
2. Actualizar `PIN_INTERMEDIO` en `plugins/solvershub-nsc/index.js` (y la fecha de expiración) ANTES del vencimiento del pin-set.
   Para probar un pin nuevo sin tocar código: `SOLVERSHUB_PINS` en el `env` del perfil de EAS (SPKI SHA-256 en base64, separados por coma).
3. Release nueva (AAB/APK). El `network_security_config` es nativo: **un OTA (EAS Update) no lo cambia**; los dispositivos con el pin viejo necesitan instalar la build nueva antes de que el certificado deje de coincidir.

## Verificación en dispositivo (OPPO CPH2603, 2026-10-08)

Contra `https://test.solvershub.site`, con las mismas credenciales (`gestor@demo.test`) y la misma red:

| Prueba | Build | Pins en el APK (`res/*.xml` compilado) | Resultado |
|---|---|---|---|
| Negativa | `preview-pin-negativo` (EAS `c9b35466`) | solo `AAAA…A=` (ajeno) | Login rechazado: "Sin conexión con el servidor" (fallo de red/TLS, no 401/403); no llega al selector de negocio |
| Control positivo | `preview` (EAS `e005ae24`) | LE YE2 + ISRG Root X2 | Login OK → "Elige tu negocio" |

Pins vigentes comprobados con `openssl` (cadena de `test.` y `app.solvershub.site`): YE2 = `s/tdAOmU…`, ISRG Root X2 = `diGVwiVY…`.

Cómo repetirla en cada release: `eas build --profile preview-pin-negativo --platform android`, instalar limpio, intentar el login (debe fallar) y reinstalar el `preview` normal (debe entrar). Expo Go NO aplica NSC: la verificación exige build propia (EAS).

## Deuda

- iOS: pinning con TrustKit (o módulo local equivalente) al habilitar el release iOS.
- MASVS L2 (anti-tamper/root detection) si el roadmap lo exige.
