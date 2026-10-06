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
3. Release (AAB) + OTA (EAS Update) para builds existentes.

## Verificación (pendiente de build)

- Positivo: build `preview`/`development` conecta con la API en staging (pins OK).
- Negativo: build de prueba con pin inválido → la conexión se rechaza (mitigación MITM).
- Nota: Expo Go NO aplica NSC — la verificación exige build propia (EAS).

## Deuda

- iOS: pinning con TrustKit (o módulo local equivalente) al habilitar el release iOS.
- MASVS L2 (anti-tamper/root detection) si el roadmap lo exige.
