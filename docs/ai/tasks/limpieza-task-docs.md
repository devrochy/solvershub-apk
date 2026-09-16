---
estado: completada
tags: [tarea]
---

# Tarea: Limpieza de task docs (APK)

- **Origen:** Petición directa del usuario (2026-09-11) — pendiente #6, transversal a panel/backend/APK. Normaliza el campo `estado` de `docs/ai/tasks/` al vocabulario canónico del skill `task-decomposition` (`pendiente | en progreso | completada | bloqueada`) y reconcilia cada doc con el estado real en `develop`.
- **Estado:** completada
- **Fecha inicio:** 2026-09-11

## Objetivo
Dejar los task docs de la APK con `estado` canónico y correcto, "Resultado final"/"Verificación" completo, y el `backlog.md` depurado.

## Fuera de alcance
- Reescritura/comprimir docs largos.
- Panel y backend (PRs aparte del mismo ítem).

## Bloques (checklist TDD)
- [ ] Bloque 1: verificación caso por caso (slug ↔ PR mergeado + artefactos) de los 63 docs.
- [ ] Bloque 2: normalizar `estado` (vocabulario: `terminado`/`en_progreso` → canónico + faltantes).
- [ ] Bloque 3: completar "Resultado final" faltante.
- [ ] Bloque 4: depurar `backlog.md`.

## Decisiones tomadas durante la implementación
- Verificación por PR mergeado (`gh pr list`), resolviendo por título los que usan otro nombre de rama (p. ej. `apk-headers-estandar`→#36, `apk-financial-ux-navegacion`→#23, `apk-pr1-rediseno-detalle-cliente`→#24, `feat-dia-mora-compromiso`→#30, `fix-cuota-evidencias-ux`→#29).
- `apk-autovinculacion-dispositivo` se conserva `pendiente` (diferido post-MVP; checklist sin iniciar).

## Ambigüedades resueltas con el usuario
- Verificación caso por caso; 3 PRs docs-only; panel como piloto (PR #54).

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar: `scripts/check.sh` (50 suites, 359 tests) → verde.
- Estado final: **62 docs `completada`** + 1 `pendiente` (`apk-autovinculacion-dispositivo`, post-MVP) + 1 `en progreso` (esta tarea).
- Verificación caso por caso: 38 docs con PR mergeado por rama + resueltos por título (`apk-headers-estandar`#36, `apk-financial-ux-navegacion`#23, `apk-navegacion-ruta-rediseno`#25, `apk-pr1-rediseno-detalle-cliente`#24, `apk-pr2-rediseno-rutas-dia`#25, `apk-reveal-navegacion`#38, `apk-swipe-back-ruta`#37/#38, `apk-mejoras-detalle-nuevo-cliente`#26, `feat-dia-mora-compromiso`#30, `fix-cuota-evidencias-ux`#29).
- Cambios aplicados:
  - Normalización: `terminado`×9 y `en_progreso`→`en progreso` pasan a `completada`; frontmatter YAML añadido a 4 docs sin campo; body `- **Estado:**` alineado.
  - `apk-headers-estandar`: añadida sección "Resultado final" (PR #36).
  - `backlog.md`: 4 ítems resueltos movidos a "Resueltos (historial)".
- Pendientes/seguimiento: `apk-autovinculacion-dispositivo` (Opción 2b, post-MVP). Observación: el `check.sh` del APK mostró 6 tests flaky en una corrida y verde en la siguiente (preexistente, sin relación con este cambio docs-only).
