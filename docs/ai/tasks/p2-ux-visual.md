---
estado: completada
tags: [tarea]
---

# Tarea: P2 — Pulido visual de la APK

- **Origen:** Petición directa del usuario (2026-09-12) — workstream **P2 UX**; ítems del backlog: "Doble lenguaje visual del estado del cliente" y "Contraste de enlaces cian por debajo de WCAG AA".
- **Estado:** completada
- **Fecha inicio:** 2026-09-12

## Objetivo
Unificar el lenguaje visual del estado del cliente y subir el contraste de los enlaces cian a WCAG AA.

## Bloques (checklist TDD)
- [x] Bloque 1: `ClientesScreen` usa tarjeta blanca + barra de acento semántica (como `DiaScreen`), en vez de fondo pastel completo.
  - Test(s): `src/screens/ClientesScreen.test.tsx`
- [x] Bloque 2: `#0891b2` → `#0e7490` (cyan-700) en todo `src/` (contraste ~4.9:1).
  - Test(s): `src/components/ColorBadge.test.tsx` (+ screens)

## Decisiones tomadas durante la implementación
- `ClienteScreen` (detalle) conserva su header con color de clasificación: es un contexto distinto (detalle, no tarjeta de lista); el `ColorBadge` de esa pantalla indica el estatus del préstamo, no el del cliente. No se migra.
- El acento usa `colorDeEstado(colorRiesgo)` (sólido), consistente con `DiaScreen`.

## Ambigüedades resueltas con el usuario
- Bloque P2 elegido: pulido visual de la APK (1 PR, solo APK).

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar: `bash scripts/check.sh` (50 suites, 360 tests) → verde.
- Archivos modificados:
  - `src/screens/ClientesScreen.tsx` (+ `.test.tsx`) — tarjeta blanca + acento.
  - `src/screens/ClienteScreen.tsx`, `DiaScreen.tsx`, `RutaDetalleScreen.tsx`, `SeleccionRutaScreen.tsx`, `src/components/TrayectosLista.tsx` — color cian a `#0e7490`.
  - `docs/ai/tasks/backlog.md` — ítems movidos a historial.
- Pendientes/seguimiento: ninguno.