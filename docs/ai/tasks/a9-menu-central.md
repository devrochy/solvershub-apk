# Tarea: A9 — Menú inferior con "Día" central sobresaliente y MaterialIcons

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A9) + petición del menú con Día al centro sobresaliente.
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
Tab bar custom: "Día" en el centro y sobresaliente (estilo FAB), con iconos MaterialIcons (map/people/today) + texto, orden Rutas / Día / Clientes.

## Bloques (checklist TDD)
- [x] Bloque 1: instalar `@expo/vector-icons` + mock en jest.setup.
- [x] Bloque 2: `CustomTabBar` con botón central elevado y navegación.
- [x] Bloque 3: integrar en `App.tsx` (reorden: Rutas, Día, Clientes).
- [x] Verificación: tests del tab bar (2) + `scripts/check.sh` verde (167 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (167 tests).
- Archivos: `src/components/CustomTabBar.tsx`, `src/components/CustomTabBar.test.tsx`, `App.tsx`, `jest.setup.ts`, `package.json`, `docs/ai/tasks/a9-menu-central.md`.
- Pendientes: ninguno.