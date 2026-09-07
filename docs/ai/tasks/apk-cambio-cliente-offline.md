---
estado: completada
tags: [tarea]
---

# Tarea: apk-cambio-cliente-offline (editar cliente + encolado `cambio_cliente`)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 1, 2026-09-01). HU-47 (docs/APP_REQUIREMENTS.md:64) + backlog "cambio de cliente offline".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que el cobrador pueda editar datos básicos del cliente (nombre, apellido, negocio, WhatsApp) desde la APK y que el cambio se encuele como evento `cambio_cliente` (`{clienteId, input}`) para aplicarse al sincronizar. El backend ya soporta el evento en `TIPO_EVENTO_SYNC` y `ClienteService.actualizar` (aplica directo si el cobrador tiene `actualizar_cliente`, o crea propuesta).

## Fuera de alcance
- Edición de ubicaciones/coordenadas (lat/lng) desde la APK (campos disponibles en el DTO pero no en la UI por ahora).
- Endpoint online del cobrador para actualizar cliente (la vía es el evento offline sync, que funciona online y offline).
- Ver permisos del cobrador antes de encolar (el backend decide: aplica o propone).

## Bloques (checklist TDD)
- [x] Bloque 1: feature helper `src/features/cliente/cambio-cliente.ts` — `edicionDesdeTarjeta(tarjeta)`, `cambioClientePayload(clienteId, input)`, `dedupeKeyCambioCliente(clienteId)`, `camposCambiados(actual, original)`.
  - Test(s): `src/features/cliente/cambio-cliente.test.ts` (5).
- [x] Bloque 2: UI en `ClienteScreen` — botón "Editar datos" + formulario (nombre, negocio, WhatsApp) que encola `cambio_cliente` con `encolarSiNoExiste` (dedupe por cliente) y avisa "se sincronizará".
  - Test(s): `src/screens/ClienteScreen.test.tsx` (+3).
- [x] Bloque 3: `scripts/check.sh` verde (97 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- Se encola SIEMPRE (online u offline): es la vía que expone el backend para el cobrador (no hay endpoint online de `PATCH cliente` en `/cobrador`).
- Dedupe: `cambio_cliente-<clienteId>` (no acumular ediciones contradictorias mientras haya una pendiente).
- `camposCambiados` filtra lo que no cambió (el backend rechaza payload sin campos reales) y la edición se compara contra la tarjeta original.
- El formulario de edición se mantiene abierto con el mensaje de confirmación (el bloque genérico de pago/no-pago se excluyó del modo `editar`).

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (97 tests, 17 suites).
- Archivos modificados: `src/features/cliente/cambio-cliente.ts` (+test), `src/screens/ClienteScreen.tsx` (botón + formulario de edición), `src/screens/ClienteScreen.test.tsx` (+3), `docs/ai/tasks/apk-cambio-cliente-offline.md`, `docs/ai/tasks/backlog.md`.
- Pendientes/seguimiento: el cobrador necesita el permiso `actualizar_cliente` para que el cambio aplique directo (si no, el backend crea propuesta pendiente). Se puede validar end-to-end con el seed.