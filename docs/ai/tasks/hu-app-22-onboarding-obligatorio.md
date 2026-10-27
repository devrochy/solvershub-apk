---
estado: completado en código (sin OTA ni prueba en el OPPO)
tags: [onboarding, primeros-pasos, agente, aviso, spec-41]
---

# Primeros pasos obligatorios (saltables) que dejan un agente listo para probar (HU-APP-22, SPEC-41)

- **Origen:** pedido del dueño — un asistente de primer uso que se abre solo, que se puede saltar
  dejando un aviso visible hasta terminarlo, y que configura un agente completo para probar.
  El mismo guion que el panel (HU-UX-21) y la misma API (HU-SH-10, HU-AOS-57/58).
- **Backend:** `GET /admin/onboarding` y `POST /admin/onboarding/{avanzar,omitir,reanudar,finalizar,dejar-listo}`,
  `connection_id` opcional en `/admin/playground`, `business_hours_mode` en Identidad. Los tipos de
  `schema.d.ts` salen del `openapi.json` de la rama `feat/hu-sh-10-onboarding-obligatorio` del backend.

## Qué se hizo

1. **Módulo `src/modules/onboarding`.** `logica.ts` (pasos, decisiones visuales y su traducción a lo
   que guarda la API; espejo de `lib/onboarding.ts` del panel), `api.ts` (recorrido, identidad,
   `dejar-listo`, chat de prueba), `contexto.tsx` (`OnboardingProvider`: lee el recorrido y el rol,
   abre el asistente solo al dueño cuando el servidor dice `abrir`).
2. **Asistente a pantalla completa** (`screens/RecorridoScreen.tsx`, `screens/Pasos.tsx`): seis pasos
   (negocio, voz, horario y reglas, conocimiento, crear, probar), todo por tarjetas y chips
   (`accessibilityRole` radio/checkbox, ≥ 48 dp), la tarjeta «Tu agente, armándose» en una `Sheet`
   plegable con la burbuja de voz, logo horizontal en la cabecera y grande en la pantalla final.
   Cada paso guarda en Identidad (lee, une y reenvía completo: `PUT` reemplaza todo) y avanza en el
   servidor; se retoma donde quedó. El tipo de negocio, qué vende y el nombre comercial se guardan en
   un borrador local (`secure-kv`) porque el servidor no los guarda.
3. **Crear y dejar listo:** `from-script` → `dejar-listo` con progreso visible; reintentable sin
   duplicar (si el agente ya existe solo se vuelve a llamar a `dejar-listo`). `canal_en_vivo` y
   «pendiente de revisión» tienen su mensaje.
4. **Probar:** chat contra la conexión de pruebas con frases sugeridas por tipo. Solo una respuesta
   del agente (no escalada) habilita «Terminar»; el servidor valida con `finalizar` (409 `faltan_pasos`).
5. **Aviso fijo** (`components/AvisoDeOnboarding.tsx`) bajo el header del panel mientras el estado sea
   `en_curso` u `omitido`; no se cierra, solo lo ve quien puede terminarlo (dueño o master).
6. **Cableado:** `PanelShell` envuelve con el proveedor y dibuja el asistente encima del shell sin
   desmontarlo (se conserva la navegación); `HeaderPanel` muestra el aviso. «Atrás» de Android vuelve un paso.
7. **Logo:** PNG horizontal y horizontal simple (claro/oscuro) a 640 px en `assets/marca/`;
   `LogoHorizontal` usa la simple bajo 240 dp (manual de marca §4).

## Verificación

- `tsc --noEmit`, `expo lint` y jest: 159 suites, 1055 tests en verde (18 nuevos: lógica, aviso, asistente).
- `check-module-boundaries` solo señala una violación que ya existía en `cobranza-admin`.
- `npm run check` falla en el paso de tipos de API hasta que el backend esté en `origin/develop`
  (`schema.d.ts` = openapi de `develop` + rutas del onboarding); se regenera al mergear el backend.
- Smoke Maestro: `e2e/smoke-onboarding.yaml` (sin ejecutar).

## Pendientes

- Publicar por OTA (preview) y smoke en el OPPO: requieren OK, y el backend y el panel van antes.
- Sin entrada propia en el cajón: se vuelve al asistente desde el aviso. Si hace falta, `menu-panel.ts`.
- «Qué sabe» enlaza al módulo (ventas, agenda, cobranza); no carga datos desde la app.
