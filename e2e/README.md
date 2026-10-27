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
maestro test e2e/smoke-cobranza.yaml     # campo (gestor)
maestro test e2e/smoke-panel-dueno.yaml  # panel (dueño)
maestro test e2e/smoke-asistente-agentes.yaml  # asistente de agentes (dueño; no crea nada)
```

Cada flujo arranca sin sesión: entre corridas, `adb uninstall com.solvershub.apk` +
`adb install <apk>` (`install -r` conserva la sesión y `pm clear` está bloqueado en
OPPO). El dispositivo sigue aprobado porque el ANDROID_ID no cambia con la misma
clave de firma.

## Casos cubiertos

1. Login unificado → selector de negocio → "Cobranza Demo".
2. Campo: carteras → diario del día.
3. Registro de una visita de pago (cuota + método efectivo).
4. Modo avión → segundo pago queda en la cola → reconectar → sincronización
   (contador "N sin subir" llega a 0, sin duplicados).
5. Liquidación del día (flujo completo si el día tiene eventos).

### Panel del dueño (`smoke-panel-dueno.yaml`)

1. Login del dueño (`dueno-a@demo.test`) → selector de negocio → "Cobranza Demo".
2. Cobranza → pestaña Gestores (modal con permisos finos, sin guardar) → pestaña Propietario.
3. Ventas → Resumen con KPIs.
4. Agenda → pestaña Horario (guarda los valores sin cambios → "Horario guardado.") → pestaña Google Calendar.
5. Configuración → General → guarda Identidad sin cambios ("Identidad guardada.").
6. Conexiones → Meta → Producción → corre las comprobaciones.
7. El toggle de tema del header alterna y vuelve.

Desde HU-DS-11 (D-34) el panel en la app navega con el header (`panel-menu`,
`panel-buscar`, `panel-tema`) y el cajón lateral. Con el menú v2 (HU-UX-11) el
cajón tiene grupos por tarea `cajon-grupo-<id>` (`operacion`, `asistente`,
`negocio`, `cuenta`, `plataforma`) y una fila por entrada `cajon-item-<id>`
(`resumen`, `conversaciones`, `clientes`, `agentes`, `conexiones`, `agenda`,
`ventas`, `cobranza`, `consumo`, `equipo`, `configuracion`, `negocios`). Cada
entrada abre su primera pestaña permitida y la pantalla muestra solo las
pestañas de esa entrada (Equipo → Colaboradores, sin barra; Configuración →
General, Habilidades, Push y `config-fallos`, que abre Mensajes fallidos); las
demás se tocan dentro de la pantalla (en Cobranza hay que deslizar
`cobranza-pestanas`).

## Estado

Verificado en dispositivo real (OPPO CPH2603) el 2026-10-07:

- Build `preview` (EAS) instalado por `adb install`, con
  `EXPO_PUBLIC_API_URL=https://test.solvershub.site/api/pack/pack_cobranza`
  (definido en `eas.json`, perfil preview).
- Smoke completo en verde: login unificado → negocio → cartera → diario →
  liquidación → generar trayecto → cliente cercano.
- **Certificate pinning (positivo)**: el smoke corre sobre HTTPS contra
  `test.solvershub.site`, así que todo el flujo pasa por el pin de la CA
  (LE YE2 / ISRG Root X2); si el pin no coincidiera, el login fallaría con
  error TLS.
- **Certificate pinning (negativo)**: para probar el rechazo, editar el
  plugin `solvershub-nsc` con un pin de otra CA, reconstruir y verificar que
  el login falla con error de certificado (no con 401/403).

APK preview v5 (EAS `04fbf0ed-3d3e-4479-ba14-f30d88f71533`, fix de área segura
#134), mismo dispositivo, 2026-10-07: `smoke-cobranza.yaml` y
`smoke-panel-dueno.yaml` completos en verde.

## Semilla requerida

El smoke asume el tenant demo sembrado (`seed_demo_login.py`):

- `gestor@demo.test` con membresía de campo en "Cobranza Demo".
- Dispositivo del equipo de prueba vinculado y **aprobado** por el dueño
  (`dueno-a@demo.test`, `POST /pack/cobranza/devices/{id}/status`).
- Cartera "Cobranza Demo" asignada al gestor
  (`PUT /portfolios/{id}` con `gestor_id`).
- Permisos del gestor (`PUT /collectors/{id}/permissions`) incluyendo
  `generar_reporte`, y config de cartera `generar_reportes_apk: true`
  (`PUT /portfolios/{id}/config`).
