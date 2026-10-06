# Smoke E2E de la app oficial (Maestro)

Flujos de regresión de cobranza (HU-APP-07). Se corren contra el **APK preview**
(build EAS `preview`) instalado en un emulador o dispositivo, con la API de test
(`EXPO_PUBLIC_API_URL` horneada en el build).

## Requisitos

1. Build: `eas build --profile preview` (o `eas build --profile development` con dev client).
2. `maestro` CLI (`curl -fsSL https://get.maestro.mobile.dev | bash`) y un emulador
   arrancado (`adb devices` con un dispositivo).
3. Credenciales demo en test: `gestor@demo.test` / `demo12345` (seed `seed_demo_login.py`).

## Corrida

```bash
maestro test e2e/smoke-cobranza.yaml
```

## Casos cubiertos

1. Login unificado → selector de negocio → "Cobranza Demo".
2. Campo: carteras → diario del día.
3. Registro de una visita de pago (cuota + método efectivo).
4. Modo avión → segundo pago queda en la cola → reconectar → sincronización
   (contador "N sin subir" llega a 0, sin duplicados).
5. Liquidación del día (flujo completo si el día tiene eventos).

## Estado

- **2026-10-06**: flujos commiteados; la corrida queda pendiente del build
  preview (EAS) y del entorno Maestro local (HU-APP-07).
