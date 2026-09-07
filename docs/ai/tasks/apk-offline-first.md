---
estado: en progreso
tags: [tarea]
---

# Tarea: apk-offline-first (capa offline de la APK)

- **Origen:** Fase B del plan de la APK (offline-first) aprobado por el usuario 2026-09-01. Backend `aplicar-offline-dominio` ya mergeado (#80). Mecanismo A (Sync API + processor), device key vía `.env.local`.
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-01

## Objetivo
Que la APK opere sin conexión: las operaciones de campo (visita pago/no-pago, gasto) se encolan localmente con `evento_id_cliente` (UUID) y se sincronizan automáticamente al reconectar vía `POST /sync-offline/eventos` (device key). Badge "N sin subir".

## Fuera de alcance (siguiente iteración)
- Trayectoria GPS offline (el catálogo backend no tiene `trayectoria` — requiere agregarlo).
- Cache del snapshot del día (la app offline muestra datos cacheados del último día cargado; pendiente).
- Cambio de cliente offline.

## Bloques (checklist TDD)
- [x] Bloque 1: `cola.ts` (`src/offline/cola.ts`) — AsyncStorage + `eventoIdCliente` (expo-crypto randomUUID): `encolar/listarCola/contarCola/removerDeCola/limpiarCola`.
  - Test(s): `src/offline/cola.test.ts` (4)
- [x] Bloque 2: `offline-sync.ts` (`src/api/offline-sync.ts`) — envía el lote a `POST /sync-offline/eventos` con header `x-device-key`; devuelve los `eventoIdCliente` confirmados.
  - Test(s): `src/api/offline-sync.test.ts` (4)
- [x] Bloque 3: `offline-context.tsx` — netinfo (isOnline), `sinSubir`, `encolar`, `sincronizar()` (flush); auto-sync al reconectar. Envuelve la app en `App.tsx`.
  - Test(s): `src/offline/offline-context.test.tsx` (4)
- [x] Bloque 4: wiring — ClienteScreen (visita pago/no-pago encola en error de red), DiaScreen (gasto offline), badge "N sin subir" en RutasScreen.
  - Test(s): `ClienteScreen.test.tsx` (+1), `RutasScreen.test.tsx` (+1), `DiaScreen.test.tsx` (nuevo, 2: encola en red / no encola en ApiError), `client.test.ts` (+2 esErrorDeRed), jest.setup mocks AsyncStorage/netinfo.

## Decisiones tomadas durante la implementación
- Error de red = cualquier error que NO sea `ApiError`.
- Device key en `EXPO_PUBLIC_DEVICE_KEY` (.env.local; se obtiene con `POST /devices`).
- Los eventos confirmados (ack `sincronizado`/`duplicado`) se remueven de la cola.
- Prueba end-to-end real: evento `visita` (pago) por device key → ack `sincronizado` → cuota `pagada`.

## Ambigüedades resueltas con el usuario
- Mecanismo A; evidencias base64; provisioning por device key.

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (68 tests, 15 suites); bundle web 200; flujo offline real verificado (cuota aplicada vía sync).
- Archivos modificados: `src/offline/cola.ts` (+test), `src/api/offline-sync.ts` (+test), `src/offline/offline-context.tsx` (+test), `src/api/client.ts` (+`esErrorDeRed` y test), `src/config.ts` (+`DEVICE_API_KEY`), `src/screens/ClienteScreen.tsx`/`DiaScreen.tsx`/`RutasScreen.tsx` (+tests), `App.tsx` (OfflineProvider), `jest.setup.ts`, `.env.example`, `docs/ai/tasks/apk-offline-first.md`, `docs/ai/tasks/backlog.md`.
- Revisión code-reviewer APROBADA tras agregar `DiaScreen.test.tsx` (bloqueante) y test directo de `esErrorDeRed`. Notas no bloqueantes en backlog (evidencias offline, device key inválida).
- Pendientes/seguimiento: trayectoria GPS offline, cache del snapshot del día, cambio de cliente offline.