---
estado: en progreso
tags: [tarea]
---

# Tarea: Lista de clientes — FAB, búsqueda y filtros con color

- **Origen:** Petición directa del usuario (2026-09-19) tras probar la app.
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-19

## Objetivo

Mejorar la vista de lista de clientes: quitar el botón "+ Cliente" del header y
reemplazarlo por un botón "+" flotante circular abajo-derecha; agregar un campo
de búsqueda; y dar colores semánticos a los filtros.

## Fuera de alcance

- Fix de datos de mora en el seed (se hace como tarea aparte en el repo backend).
- Colorear los filtros del menú hamburguesa (`CarteraFlujo`).

## Bloques (checklist TDD)

- [x] Bloque 1: existe `filtrarPorTexto(clientes, texto)` (nombre/apellido/negocio/teléfono/documento, insensible a mayúsculas).
  - Test(s): `src/domain/busqueda-clientes.test.ts`
- [x] Bloque 2: la lista usa un FAB circular "+" abajo-derecha y el header ya no tiene el botón "+ Cliente".
  - Test(s): `src/screens/ClientesScreen.test.tsx`
- [x] Bloque 3: el campo de búsqueda filtra la lista (combinado con el filtro de estado).
  - Test(s): `src/screens/ClientesScreen.test.tsx`
- [x] Bloque 4: cada filtro (Todos/Al día/En mora/Sin préstamos) tiene su color semántico.
  - Test(s): `src/screens/ClientesScreen.test.tsx`

## Decisiones tomadas durante la implementación

- El FAB conserva `testID="btn-nuevo-cliente"` para no romper los tests existentes.
- Búsqueda por nombre + apellido + negocio + teléfono + documento (confirmado con el usuario).
- Colores semánticos (confirmado): Todos=azul, Al día=verde, En mora=rojo, Sin préstamos=gris.
- Base de rama: `develop` (ClientesScreen no fue tocada por los PRs apilados #81/#82).

## Ambigüedades resueltas con el usuario

- Mora: es datos inconsistentes del seed del backend → tarea aparte.
- Búsqueda: incluir teléfono y documento.
- Colores: semánticos.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint OK, typecheck OK, **60 suites / 455 tests**.
- Archivos modificados: `src/screens/ClientesScreen.tsx` (+ test), `src/domain/busqueda-clientes.ts` (+ test, nuevo), `docs/ai/tasks/apk-clientes-fab-busqueda.md`.
- Pendientes/seguimiento (si algún punto quedó fuera): fix del seed de mora (tarea aparte en el backend); PR de sincronización de #81/#82 a develop; **validación visual en dispositivo pendiente** (el equipo se desconectó de USB durante la tarea).
