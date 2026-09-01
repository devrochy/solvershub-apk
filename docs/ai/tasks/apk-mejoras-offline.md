# Tarea: apk-mejoras-offline (pre-cache de tarjetas + dedupe de la cola)

- **Origen:** Prueba de la capa offline por el usuario 2026-09-01: (1) las tarjetas de clientes solo se cacheaban al abrirlos (en modo avión, clientes no visitados online no tenían datos ni botones); (2) se encolaron 3 pagos idénticos de la misma cuota (2 rechazados por el backend).
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-01

## Objetivo
- **Pre-cache**: al cargar la lista del día online, precargar y cachear en segundo plano la tarjeta + préstamos de cada cliente del día → todos quedan disponibles offline (con botones de pago).
- **Dedupe**: no encolar un pago de la misma cuota si ya hay uno pendiente en la cola (evita duplicados/errores).

## Fuera de alcance
- Trayectoria GPS offline, evidencias de gasto offline.

## Bloques (checklist TDD)
- [x] Bloque 1: `cola.ts` — `EventoOffline.dedupeKey` (local, no se envía al backend); `encolar(tipoEvento, payload, dedupeKey?)`; `existePendiente(tipoEvento, dedupeKey)`.
  - Test(s): `cola.test.ts` (+1, 5 total)
- [x] Bloque 2: `offline-context.tsx` — `encolarSiNoExiste` (devuelve `false` si ya existe pendiente) + `existePendiente`.
  - Test(s): `offline-context.test.tsx` (+1, 5 total)
- [x] Bloque 3: `ClienteScreen` — pago dedup `pago-${prestamoId}-${clienteId}-${cuotaId ?? "abono"}` (evita colisión `pago-undefined`), no_pago dedup `no_pago-${prestamoId}-${clienteId}`; avisos de pendiente.
  - Test(s): `ClienteScreen.test.tsx` (+3: pago dedup, abono dedup, no_pago dedup; 9 total)
- [x] Bloque 4: `DiaScreen` — tras cargar el día online, precachea tarjeta+préstamos de cada cliente (Promise.allSettled, en segundo plano).
  - Test(s): `DiaScreen.test.tsx` (+1, 6 total)
- [x] Bloque 5: `scripts/check.sh` verde (81 tests, 16 suites) + bundle web 200.

## Decisiones tomadas durante la implementación
- `dedupeKey` es un campo local de la cola que `offline-sync` NO envía al backend (solo eventoIdCliente/tipoEvento/payload).
- Pre-cache en segundo plano (no bloquea el render del día); errores se ignoran (allSettled).
- Verificación del caso "botones no visibles en online": el bundle contiene los botones y la API responde 200 → probable bundle viejo en Expo Go (reload); el pre-cache garantiza que offline también se vean.

## Ambigüedades resueltas con el usuario
- Hacer los cambios propuestos; nota: los botones de pago también parecían ausentes en online → verificado bundle/API; reload.

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (83 tests, 16 suites); bundle web 200.
- Archivos modificados: `src/offline/cola.ts` (+test), `src/offline/offline-context.tsx` (+test), `src/screens/ClienteScreen.tsx` (+3 tests), `src/screens/DiaScreen.tsx` (+test), `src/api/offline-sync.test.ts` (verifica que dedupeKey no se envía), `docs/ai/tasks/apk-mejoras-offline.md`.
- Revisión code-reviewer: rechazo con 3 bloqueantes resueltos — commit pendiente (ya commiteado en el PR), bug `pago-undefined` (dedupeKey ahora incluye préstamo/cliente y distingue abono), y cobertura de abono/no_pago.
- Pendientes/seguimiento: trayectoria GPS offline, evidencias de gasto offline, device key inválida sin feedback, pre-cache re-ejecutado en cada pull-to-refresh.