---
estado: completada
tags: [tarea]
---

# Tarea: Subtítulo de ruta en el submenú y fix de "Inicio"

- **Origen:** Petición directa del usuario (2026-09-19) tras probar la app.
- **Estado:** completada
- **Fecha inicio:** 2026-09-19

## Objetivo

En el menú hamburguesa: (1) el submenú de "Clientes" muestra un encabezado no
interactivo con el nombre de la ruta activa (icono de cartera), y (2) "Inicio"
siempre muestra la lista de carteras con filtros cuando hay más de una, aunque
haya una cartera seleccionada (hoy pasaba a mostrar el detalle).

## Fuera de alcance

- El desplegable "Carteras" se mantiene (cambio rápido de ruta).
- `SeleccionCarteraScreen` / breadcrumbs no cambian.
- Iconografía distinta a MaterialIcons.

## Bloques (checklist TDD)

- [x] Bloque 1: un ítem con `subItems` y `subtituloSubmenu` muestra un encabezado no interactivo (icono + texto) al expandirse, y no lo muestra colapsado.
  - Test(s) que lo prueban: `src/components/MenuLateral.test.tsx`
- [x] Bloque 2: el ítem "Clientes" lleva el nombre de la cartera activa como `subtituloSubmenu`.
  - Test(s) que lo prueban: `src/navigation/CarteraFlujo.test.tsx`
- [x] Bloque 3: con más de una cartera, "Inicio" navega a la lista (`Main`); con una sola, "Inicio" muestra la información de esa cartera.
  - Test(s) que lo prueban: `src/navigation/CarteraFlujo.test.tsx`

## Decisiones tomadas durante la implementación

- El encabezado usa MaterialIcons `account-balance-wallet` (cartera/wallet).
- Se mantiene el desplegable "Carteras" (confirmado con el usuario).
- `navigation.navigate("Main")` es el patrón ya usado por `volver` y el breadcrumb para ir a la lista.

## Ambigüedades resueltas con el usuario

- Pregunta: ¿cuál submenú debe titularse? → Respuesta: los filtros de "Clientes".
- Pregunta: ¿estilo del título? → Respuesta: ítem no interactivo con el nombre.
- Pregunta: ¿mantener el desplegable "Carteras"? → Respuesta: mantenerlo; el bug era que "Inicio" dejaba de mostrar la lista al seleccionar una cartera.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint OK, typecheck OK, **59 suites / 447 tests**.
- Archivos modificados: `src/navigation/menu-lateral-context.tsx`, `src/components/MenuLateral.tsx`, `src/navigation/CarteraFlujo.tsx`, `src/components/MenuLateral.test.tsx`, `src/navigation/CarteraFlujo.test.tsx`.
- Validación en dispositivo (`CPH2603` vía `adb`, Expo Go):
  - "Clientes" desplegado muestra encabezado no interactivo `account-balance-wallet` + "test-Ruta Centro" sobre los filtros (`menu-submenu-encabezado`, `clickable=false`).
  - "Inicio" con >1 cartera navega a la lista (Main con filtros Activas/Inactivas) y deja de mostrarse activo.
- Pendientes/seguimiento (si algún punto quedó fuera): validar el caso de 1 sola cartera en dispositivo (cubierto por test unitario; la cuenta de prueba tiene 2 activas + 1 inactiva).
