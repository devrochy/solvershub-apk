---
estado: en progreso
tags: [tarea]
---

# Tarea: apk-ux-fase-a (pull-to-refresh y estados compartidos)

- **Origen:** Fase A del plan de la APK (A6) aprobado por el usuario 2026-09-01.
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-01

## Objetivo
- Pull-to-refresh en las listas de Rutas y Día (recargar con el gesto).
- Componente compartido `CargaError` para los estados de carga/error/reintentar de las 3 pantallas (reduce la duplicación).

## Fuera de alcance
- Indicador de conexión offline completo (Fase B).

## Bloques (checklist TDD)
- [x] Bloque 1: `CargaError` (`src/components/CargaError.tsx`) — spinner si cargando, error + "Reintentar" si hay error.
  - Test(s): `src/components/CargaError.test.tsx` (3)
- [x] Bloque 2: RefreshControl en `RutasScreen` y `DiaScreen`; uso de `CargaError` en Rutas/Dia/Cliente.
  - Test(s): check.sh + bundle web (refactor de estado; cubierto por typecheck/lint)
- [x] Bloque 3: `scripts/check.sh` verde (48 tests, 8 suites) + bundle web 200.

## Decisiones tomadas durante la implementación
- RefreshControl reutiliza el `cargar` existente (mismo fetch, sin duplicar lógica).
- Se eliminaron los bloques de carga/error duplicados de las 3 pantallas (CargaError compartido).

## Ambigüedades resueltas con el usuario
- Pregunta: ¿arrancar A2+A3? → "arranquemos como dices" (A6 al cierre de la fase).

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (lint + typecheck + 48 tests, 8 suites); bundle web 200.
- Archivos modificados: `src/components/CargaError.tsx` (+test, 3), `src/screens/RutasScreen.tsx` (RefreshControl + CargaError), `src/screens/DiaScreen.tsx` (idem), `src/screens/ClienteScreen.tsx` (CargaError), `docs/ai/tasks/apk-ux-fase-a.md`.
- Pendientes/seguimiento: Fase A cerrada (A2-A6). Siguiente: merge de PRs #1-#4; luego Fase B (offline-first) y Fase C (empaquetado/seguridad).