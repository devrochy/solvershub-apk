---
estado: completada
tags: [tarea]
---

# Tarea: apk-dia-en-vivo (re-fetch periódico de la lista del día)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 2, 2026-09-01). HU-56 (docs/APP_REQUIREMENTS.md:107): la lista del día "se va actualizando a medida que se notifican visitas".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que la lista de clientes del día se refresque automáticamente cada 30s (además del pull-to-refresh manual) para reflejar las visitas registradas sin intervención del cobrador.

## Fuera de alcance
- Push/notificaciones en tiempo real (requiere infraestructura; se usa polling corto).
- Actualización en vivo del detalle de un cliente abierto.

## Bloques (checklist TDD)
- [x] Bloque 1: `DiaScreen` — `setInterval` de 30s que llama `cargar()` (reusa la lógica existente de fetch/cache/offline).
  - Test(s): `src/screens/DiaScreen.test.tsx` (+1 con fake timers: recarga al pasar el intervalo).
- [x] Bloque 2: `scripts/check.sh` verde (120 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- Intervalo fijo de 30s (bajo costo, sin infraestructura de push).
- Reusa `cargar()` para no duplicar lógica: en error de red cae al cache y en 401 hace logout, igual que el flujo inicial.
- El intervalo se limpia al desmontar (no hay fugas).

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (120 tests, 19 suites).
- Archivos modificados: `src/screens/DiaScreen.tsx` (intervalo 30s), `src/screens/DiaScreen.test.tsx` (+1), `docs/ai/tasks/apk-dia-en-vivo.md`.
- Pendientes/seguimiento: notificaciones push (HU-52) quedan en backlog por infraestructura.