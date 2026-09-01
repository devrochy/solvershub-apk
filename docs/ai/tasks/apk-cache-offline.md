# Tarea: apk-cache-offline (cache del snapshot del día, tarjeta y préstamos)

- **Origen:** Fase B del plan de la APK, Opción A aprobada por el usuario 2026-09-01. Hoy el modo avión no puede abrir la lista del día (la pide online) ni registrar pago (falta `prestamoId`/`cuotaId` del cache de préstamos).
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-01

## Objetivo
Que en modo avión se puedan: abrir la ruta (ver la lista del día cacheadada), ver la tarjeta del cliente y registrar un pago/gasto offline (necesita prestamos/cuotas cacheados).

## Fuera de alcance
- Trayectoria GPS offline.
- Evidencias de gasto offline (base64) — backlog.

## Bloques (checklist TDD)
- [x] Bloque 1: `cache.ts` (`src/offline/cache.ts`) — AsyncStorage: `guardarDia/leerDia`, `guardarCliente/leerCliente` (tarjeta + prestamos).
  - Test(s): `src/offline/cache.test.ts` (4)
- [x] Bloque 2: `DiaScreen` — guarda el snapshot al cargar online; en error de red lee el cache y muestra clientes + aviso "Datos sin conexión".
  - Test(s): `DiaScreen.test.tsx` (+3)
- [x] Bloque 3: `ClienteScreen` — cache de tarjeta + prestamos; en error de red lee el cache (permite pago offline con cuotaId cacheado).
  - Test(s): `ClienteScreen.test.tsx` (+2)
- [x] Bloque 4: `scripts/check.sh` verde (77 tests, 16 suites) + bundle web con la IP actual.

## Decisiones tomadas durante la implementación
- Cache por ruta/cliente en AsyncStorage (mismo almacén que la cola).
- En error de red (`esErrorDeRed`) se usa el cache; si no hay cache, error normal.

## Ambigüedades resueltas con el usuario
- Opción A: cache del día + tarjeta + préstamos (modo avión completo).

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (77 tests, 16 suites); bundle web 200 con `192.168.40.6:3000`.
- Archivos modificados: `src/offline/cache.ts` (+test), `src/screens/DiaScreen.tsx` (+3 tests), `src/screens/ClienteScreen.tsx` (+2 tests), `docs/ai/tasks/apk-cache-offline.md`.
- Pendientes/seguimiento: trayectoria GPS offline, evidencias de gasto offline, device key inválida sin feedback.