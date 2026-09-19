---
estado: completada
tags: [tarea]
---

# Tarea: Inicio (auto-entrar a la cartera cuando hay una sola)

- **Origen:** Petición directa del usuario (2026-09-19): la pantalla inicial tras el login debe ser "Inicio"; si el gestor tiene **una sola** cartera debe abrir directo la **información de la cartera**, y si tiene **más de una**, la **lista**. Además, quitar el texto flotante "Solver" de la esquina inferior derecha.
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-19

## Objetivo

Al entrar, con **una sola** cartera activa se fija como activa y se navega directo al detalle de la cartera; con **más de una**, se muestra la lista (comportamiento actual). Se elimina el "Solver" flotante.

## Fuera de alcance

- El rediseño del menú hamburguesa (Fase 2: Carteras/Clientes desplegables, tarjeta avatar+usuario, submenú, renombrar "Diario").
- Breadcrumb + filtros en la vista de clientes (Fase 3).
- Modo oscuro (Fase 4).

## Bloques (TDD)

- [x] Bloque 1: con **una sola** cartera, la pantalla la fija activa y llama `onCarteraSeleccionada` automáticamente (una vez).
  - Test(s): `src/screens/SeleccionCarteraScreen.test.tsx`
- [x] Bloque 2: con **varias** carteras, no auto-selecciona (la lista espera la elección del usuario).
  - Test(s): `src/screens/SeleccionCarteraScreen.test.tsx`
- [x] Bloque 3: eliminar el "Solver" flotante (`cobraia-flotante`) y sus estilos.

## Decisiones tomadas durante la implementación

- El auto-select se dispara una sola vez por carga (guard con `useRef`), para no re-navegar en refresh.
- Se conserva el nombre interno `SeleccionCarteraScreen` (la pantalla hace de "Inicio"); el renombre visual se aborda con el breadcrumb (Fase 3).
- El test de selección manual pasa a usar 2 carteras, para no colisionar con el auto-select.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar:
  - `npx jest src/screens/SeleccionCarteraScreen.test.tsx` → **14 tests** (3 nuevos).
  - `bash scripts/check.sh` → lint 0 errores, typecheck OK, **57 suites / 427 tests** en verde.
- Archivos modificados:
  - `src/screens/SeleccionCarteraScreen.tsx` — auto-entrar con 1 cartera (efecto con guard `useRef`, callback por ref) + helper `aCarteraActiva`; eliminado el "Solver" flotante y sus estilos.
  - `src/screens/SeleccionCarteraScreen.test.tsx` — casos de auto-select/no-auto-select y ausencia del flotante; la prueba de selección manual usa 2 carteras.
  - `docs/ai/tasks/apk-inicio.md` — esta tarea.
- Pendientes/seguimiento: el renombre visual a "Inicio" (título/route) se aborda con el breadcrumb (Fase 3); el menú hamburguesa (Fase 2), filtros+breadcrumb (Fase 3) y modo oscuro (Fase 4) quedan como tareas aparte.
