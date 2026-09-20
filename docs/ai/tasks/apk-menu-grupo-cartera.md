---
estado: completada
tags: [tarea]
---

# Tarea: Grupo de cartera en el menú (Clientes + Diario)

- **Origen:** Petición directa del usuario (2026-09-19) tras probar la app.
- **Estado:** completada
- **Fecha inicio:** 2026-09-19

## Objetivo

En el menú hamburguesa, el nombre de la cartera activa debe ser un encabezado que
**agrupe y encierre** las secciones que pertenecen a esa cartera (**Clientes** y
**Diario**) en una tarjeta con borde y título, en vez de aparecer solo dentro del
submenú de Clientes.

## Fuera de alcance

- Cambiar la lógica de "Inicio" (ya corregida).
- El desplegable "Carteras" (se mantiene).
- Iconografía distinta a MaterialIcons.

## Bloques (checklist TDD)

- [x] Bloque 1: `MenuItem` admite `grupo`; un grupo se renderiza como tarjeta con borde y título no interactivo, con sus hijos siempre visibles.
  - Test(s) que lo prueban: `src/components/MenuLateral.test.tsx`
- [x] Bloque 2: `CarteraFlujo` agrupa Clientes y Diario en un grupo titulado con el nombre de la cartera activa (se retira `subtituloSubmenu`).
  - Test(s) que lo prueban: `src/navigation/CarteraFlujo.test.tsx`

## Decisiones tomadas durante la implementación

- El grupo es un `MenuItem` con `grupo: true` y `subItems` (sus hijos). El título usa `account-balance-wallet`.
- Se elimina `subtituloSubmenu` (quedó reemplazado por el grupo).

## Ambigüedades resueltas con el usuario

- Pregunta: ¿qué ítems van dentro del grupo? → Respuesta: Clientes y Diario.
- Pregunta: ¿estilo? → Respuesta: tarjeta con borde y título.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint OK, typecheck OK, **59 suites / 447 tests**.
- Archivos modificados: `src/navigation/menu-lateral-context.tsx` (se retira `subtituloSubmenu`, se agrega `grupo`), `src/components/MenuLateral.tsx`, `src/navigation/CarteraFlujo.tsx`, `src/components/MenuLateral.test.tsx`, `src/navigation/CarteraFlujo.test.tsx`.
- Validación en dispositivo (`CPH2603` vía `adb`, Expo Go): el grupo `menu-grupo-cartera` (clickable=false) encierra "Clientes" y "Diario" en una tarjeta con borde y el título "test-Ruta Manizales" (icono de cartera); "Inicio" y "Carteras" quedan fuera. Los filtros se despliegan dentro del grupo.
- Pendientes/seguimiento (si algún punto quedó fuera): ninguno.
