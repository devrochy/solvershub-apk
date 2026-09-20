---
estado: en progreso
tags: [tarea]
---

# Tarea: Tarjetas de cliente con acciones y color por estado

- **Origen:** Petición directa del usuario (2026-09-19).
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-19

## Objetivo

Refactorizar la tarjeta de cliente: avatar a la izquierda, dos botones de acción
(llamar y mensaje) a la derecha, y colorear la barra de acento **y** el borde de la
tarjeta según el estado del cliente con la semántica del filtro (al día = verde,
en mora = rojo, sin préstamos = gris).

## Fuera de alcance

- Los iconos a la izquierda (el usuario eligió avatar izquierda / botones derecha).
- Cambiar los filtros o el campo de búsqueda.

## Bloques (checklist TDD)

- [x] Bloque 1: existe `estadoCliente(cliente)` que devuelve `al_dia` / `en_mora` / `sin_prestamos` (semántica igual a `filtrarClientes`).
  - Test(s): `src/domain/filtro-clientes.test.ts`
- [x] Bloque 2: la tarjeta muestra avatar + datos y dos botones de acción (llamar → tel:, mensaje → WhatsApp).
  - Test(s): `src/screens/ClientesScreen.test.tsx`
- [x] Bloque 3: la barra de acento y el borde de la tarjeta usan el color del estado (al día verde, en mora rojo, sin préstamos gris).
  - Test(s): `src/screens/ClientesScreen.test.tsx`

## Decisiones tomadas durante la implementación

- Avatar a la izquierda; botones `call` y `chat` a la derecha (confirmado con el usuario).
- Color: barra de acento + borde de la tarjeta, con la semántica del filtro (al día=verde, en mora=rojo, sin préstamos=gris) — reemplaza al `colorRiesgo`.
- El mensaje abre WhatsApp con un saludo por defecto (`Hola <nombre>`) usando `enlaceWhatsApp()`.
- Llamar usa `Linking.openURL("tel:<telefono>")`.

## Ambigüedades resueltas con el usuario

- Iconos: el usuario eligió "avatar izquierda, botones derecha".
- Color: el usuario eligió "barra + borde".

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint OK, typecheck OK, **62 suites / 467 tests**.
- Archivos modificados: `src/domain/filtro-clientes.ts` (+ test), `src/screens/ClientesScreen.tsx` (+ test), `docs/ai/tasks/apk-clientes-tarjeta-acciones.md`.
- Validación en dispositivo (`CPH2603` vía `adb`, Expo Go): en test-Ruta Manizales, Laura/Andrés salen con barra y borde **verdes** (al día) y el resto en **rojo** (en mora); avatar a la izquierda y botones llamar/mensaje a la derecha.
- Pendientes/seguimiento (si algún punto quedó fuera): ninguno.
