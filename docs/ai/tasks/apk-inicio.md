---
estado: completada
tags: [tarea]
---

# Tarea: Inicio (auto-entrar a la cartera cuando hay una sola)

- **Origen:** Petición directa del usuario (2026-09-19): la pantalla inicial tras el login debe ser "Inicio"; si el gestor tiene **una sola** cartera debe abrir directo la **información de la cartera**, y si tiene **más de una**, la **lista**. Además, quitar el texto flotante "Solver" de la esquina inferior derecha.
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-19

## Objetivo

Al entrar, con **una sola** cartera se fija como activa y se navega directo al detalle de la cartera, **sin montar antes la lista** (evita el doble render); con **más de una**, se muestra la lista. La sección se llama **"Inicio"** y su header dice "Inicio". Se elimina el botón atrás del detalle (navegación por menú/swipe) y el "Solver" flotante.

## Fuera de alcance

- El rediseño del menú hamburguesa (Fase 2: Inicio/Carteras/Clientes/Diario, tarjeta avatar+usuario, submenú, renombrar "Trayecto diario" → "Diario").
- El no-atrás **global** + swipe en todas las vistas (Fase 2).
- Breadcrumb + filtros en la vista de clientes (Fase 3).
- Modo oscuro (Fase 4).

## Bloques (TDD)

- [x] Bloque 1: con **una sola** cartera, la pantalla la fija activa y llama `onCarteraSeleccionada` automáticamente (una vez).
  - Test(s): `src/screens/SeleccionCarteraScreen.test.tsx`
- [x] Bloque 2: con **varias** carteras, no auto-selecciona (la lista espera la elección del usuario).
  - Test(s): `src/screens/SeleccionCarteraScreen.test.tsx`
- [x] Bloque 3: eliminar el "Solver" flotante (`cobraia-flotante`) y sus estilos.
- [x] Bloque 4: con una sola cartera, **no montar la lista** (loader en el cuerpo, header visible) para evitar la doble carga; con varias, la lista.
- [x] Bloque 5: renombrar **"Cartera" → "Inicio"** (sección del menú en `CarteraFlujo` y `titulo` del header del detalle con el nombre de la cartera como subtítulo) y **quitar el botón atrás** del detalle.
  - Test(s): `src/screens/CarteraDetalleScreen.test.tsx`

## Decisiones tomadas durante la implementación

- El auto-select se dispara una sola vez por carga (guard con `useRef`), para no re-navegar en refresh.
- Se conserva el nombre interno `SeleccionCarteraScreen` (la pantalla hace de "Inicio"); el renombre visual se aborda con el breadcrumb (Fase 3).
- El test de selección manual pasa a usar 2 carteras, para no colisionar con el auto-select.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar:
  - `npx jest src/screens/SeleccionCarteraScreen.test.tsx` → **15 tests**; `src/screens/CarteraDetalleScreen.test.tsx` → 14.
  - `bash scripts/check.sh` → lint 0 errores, typecheck OK, **57 suites / 429 tests** en verde.
- Archivos modificados:
  - `src/screens/SeleccionCarteraScreen.tsx` — auto-entrar con 1 cartera (efecto con guard `useRef`, callback por ref) + helper `aCarteraActiva`; con 1 cartera **no monta la lista** (loader); eliminado el "Solver" flotante.
  - `src/screens/SeleccionCarteraScreen.test.tsx` — casos de auto-select/no-auto-select, no-doble-render y ausencia del flotante; pruebas de lista con 2 carteras.
  - `src/navigation/CarteraFlujo.tsx` — label de sección **"Inicio"**.
  - `src/screens/CarteraDetalleScreen.tsx` — header `titulo="Inicio"` (subtítulo = nombre de la cartera) y **sin botón atrás**.
  - `src/screens/CarteraDetalleScreen.test.tsx` — test de header "Inicio" sin botón atrás.
  - `docs/ai/tasks/apk-inicio.md` — esta tarea.
- Pendientes/seguimiento: Fase 2 (menú + no-atrás global + swipe), Fase 3 (breadcrumb+filtros), Fase 4 (modo oscuro).
