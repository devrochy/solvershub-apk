---
estado: completada
tags: [tarea]
---

# Tarea: P2 — Mapa "Cómo llegar" refresca la ubicación (APK)

- **Origen:** Petición directa del usuario (2026-09-12) — workstream **P2**; ítem del backlog "Mapa 'Cómo llegar' no refleja la nueva ubicación tras guardar". Consume las coordenadas de la tarjeta del backend (`app-cobranza`, PR del mismo slug).
- **Estado:** completada
- **Fecha inicio:** 2026-09-12

## Objetivo
Tras guardar la ubicación (PATCH actualizarCliente), el mapa y los botones de navegación usan las coordenadas frescas de la tarjeta, no las props del overlay (stale).

## Bloques (checklist TDD)
- [x] Bloque 1: `ClienteTarjetaPublic` (APK) incluye `latitud`/`longitud`/`latitudDomicilio`/`longitudDomicilio`.
  - Test(s): `src/screens/ClienteScreen.test.tsx`
- [x] Bloque 2: `ClienteScreen` prioriza las coords de la tarjeta (fallback a props) en el mapa, navegación y modales de edición.
  - Test(s): `src/screens/ClienteScreen.test.tsx`

## Decisiones tomadas durante la implementación
- `tarjeta.latitud ?? latitud` (y análogos): la tarjeta se refetch-ea con `cargar()` tras guardar, así que refleja la ubicación nueva.

## Ambigüedades resueltas con el usuario
- Bloque P2: mapa "Cómo llegar" stale.

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar: `bash scripts/check.sh` (50 suites, 361 tests) → verde.
- Archivos modificados:
  - `src/types/cobrador.ts` — coordenadas en `ClienteTarjetaPublic`.
  - `src/screens/ClienteScreen.tsx` (+ `.test.tsx`) — coords frescas.
  - `docs/ai/tasks/backlog.md` — ítem movido a historial.
- Pendientes/seguimiento: ninguno.