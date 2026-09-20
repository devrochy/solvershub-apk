---
estado: completada
tags: [tarea]
---

# Tarea: Menú lateral moderno y tarjeta de perfil

- **Origen:** Petición directa del usuario (2026-09-19) tras probar la app.
- **Estado:** completada
- **Fecha inicio:** 2026-09-19

## Objetivo

Modernizar el menú hamburguesa: la tarjeta de perfil no debe quedar bajo la barra
de navegación del teléfono, el submenú de usuario debe verse como una tarjeta
diferenciada (fondo/borde, compacta) y la tarjeta de perfil debe usar el azul
primario del tema.

## Fuera de alcance

- Rediseñar los ítems contextuales por pantalla (colores de cartera, filtros).
- Badge de rol en la tarjeta de perfil (queda como posible seguimiento).
- Cambios de tema (paleta `ColoresTema`).

## Bloques (checklist TDD)

- [x] Bloque 1: `Avatar` acepta props opcionales de color (`fondo`, `colorIcono`, `bordeColor`) para verse bien sobre azul, preservando el look actual por defecto.
  - Test(s) que lo prueban: `src/components/Avatar.test.tsx`
- [x] Bloque 2: la tarjeta de perfil usa el color primario del tema y respeta el safe-area inferior (no queda bajo los botones del celular).
  - Test(s) que lo prueban: `src/components/MenuLateral.test.tsx`
- [x] Bloque 3: el submenú de usuario (Perfil/Configuración/Modo/Cerrar sesión) se renderiza como una tarjeta diferenciada (fondo + borde) y compacta.
  - Test(s) que lo prueban: `src/components/MenuLateral.test.tsx`
- [x] Bloque 4: el panel se ve moderno (radios continuos, sombra, borde derecho, marca con acento) y el ítem activo usa pill con barra de acento.
  - Test(s) que lo prueban: `src/components/MenuLateral.test.tsx`

## Decisiones tomadas durante la implementación

- El submenú de usuario se interpreta como "el menú que aparece" (confirmado con el usuario).
- La tarjeta de perfil usa `colores.primario` en ambos temas (confirmado con el usuario).
- Se usa `boxShadow` y `borderCurve: "continuous"` (convención ya presente en el repo).

## Ambigüedades resueltas con el usuario

- Pregunta: ¿A qué te refieres con "el menú que aparece tiene mucho espacio y no se diferencia del menú hamburguesa"? → Respuesta: el submenú de usuario (Perfil/Configuración/Modo/Cerrar sesión).
- Pregunta: ¿Cómo manejar la tarjeta azul en modo oscuro? → Respuesta: azul primario siempre.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint OK, typecheck OK, **59 suites / 442 tests** (el primer intento tuvo un flaky de timeout en `CarteraDetalleScreen`, pasó al reintentar y en aislamiento).
- Archivos modificados: `src/components/MenuLateral.tsx`, `src/components/Avatar.tsx`, `src/components/MenuLateral.test.tsx`, `src/components/Avatar.test.tsx`, `jest.setup.ts` (el mock de iconos ahora reenvía `color` como estilo).
- Pendientes/seguimiento (si algún punto quedó fuera): badge de rol en la tarjeta de perfil; inspección visual en dispositivo/Expo Go.
