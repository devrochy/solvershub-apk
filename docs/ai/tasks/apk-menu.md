---
estado: completada
tags: [tarea]
---

# Tarea: Menú hamburguesa (Fase 2)

- **Origen:** Petición directa del usuario (2026-09-19), Fase 2 del rediseño de navegación del APK.
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-19

## Objetivo

Convertir el menú hamburguesa en la navegación principal: ítems **Inicio / Carteras (solo >1) / Clientes / Diario** con **submenús desplegables** bajo el principal, y una **tarjeta avatar+usuario** al fondo que abre un submenú (**Perfil / Configuración / Cerrar sesión**). Quitar **Perfil** del principal.

## Fuera de alcance (Fase 2b, PR aparte)

- Quitar el botón atrás en todas las vistas + swipe izquierda→derecha.
- Modo oscuro (Fase 4).

## Bloques (TDD)

- [x] Bloque 1: el menú soporta ítems **desplegables** (`subItems`) y una **tarjeta avatar+usuario** al fondo con submenú (Perfil/Configuración/Cerrar sesión).
  - Test(s): `src/components/MenuLateral.test.tsx`
- [x] Bloque 2: `CarteraFlujo` registra **Inicio**, **Carteras** (solo >1, submenú con la lista y selección), **Clientes** (submenú Al día/En mora/Sin préstamos), **Diario** (Clientes antes de Diario).
  - Test(s): `src/navigation/CarteraFlujo.test.tsx`
- [x] Bloque 3: `SeleccionCarteraScreen` (Inicio/lista) registra **Inicio** y **Carteras** (solo >1).
  - Test(s): `src/screens/SeleccionCarteraScreen.test.tsx`

## Decisiones

- Los ítems principales se registran vía `itemsExtra` (existente), extendido con `subItems`.
- "Modo oscuro" se agrega al submenú del usuario en la Fase 4 (con el tema); por ahora Perfil/Configuración/Cerrar sesión.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar:
  - `npx jest src/components/MenuLateral.test.tsx src/navigation/CarteraFlujo.test.tsx src/screens/SeleccionCarteraScreen.test.tsx` → 23 tests.
  - `bash scripts/check.sh` → lint 0 errores, typecheck OK, **57 suites / 432 tests** en verde.
- Archivos modificados:
  - `src/navigation/menu-lateral-context.tsx` — `MenuItem.subItems` (ítems desplegables); `onPress` opcional.
  - `src/components/MenuLateral.tsx` — ítems desplegables + **tarjeta avatar+usuario** al fondo con submenú (Perfil/Configuración/Cerrar sesión); se quitaron los globales (Carteras/Perfil/Configuración) y el logout suelto.
  - `src/session/cartera-activa-context.tsx` — helper compartido `aCarteraActiva`.
  - `src/navigation/CarteraFlujo.tsx` — ítems Inicio/Carteras(>1, submenú)/Clientes(submenú filtros)/Diario; carga `misCarteras`.
  - `src/screens/SeleccionCarteraScreen.tsx` — registra Inicio + Carteras(>1); usa el helper compartido.
  - Tests: `MenuLateral.test.tsx`, `CarteraFlujo.test.tsx`.
  - `docs/ai/tasks/apk-menu.md` — esta tarea.
- Pendientes/seguimiento: **Fase 2b** (no-atrás global + swipe en todas las vistas, navegación solo por menú); **Fase 3** (breadcrumb + filtros en la vista de clientes); **Fase 4** (modo oscuro, incluye el ítem "Modo oscuro" en el submenú de usuario).
