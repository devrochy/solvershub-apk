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

## Fuera de alcance

- Modo oscuro (Fase 4).
- Breadcrumb + filtros en la vista de clientes (Fase 3).

## Bloques (TDD)

- [x] Bloque 1: el menú soporta ítems **desplegables** (`subItems`) y una **tarjeta avatar+usuario** al fondo con submenú (Perfil/Configuración/Cerrar sesión).
  - Test(s): `src/components/MenuLateral.test.tsx`
- [x] Bloque 2: `CarteraFlujo` registra **Inicio**, **Carteras** (solo >1, submenú con la lista y selección), **Clientes** (submenú Al día/En mora/Sin préstamos), **Diario** (Clientes antes de Diario).
  - Test(s): `src/navigation/CarteraFlujo.test.tsx`
- [x] Bloque 3: `SeleccionCarteraScreen` (Inicio/lista) registra **Inicio** y **Carteras** (solo >1).
  - Test(s): `src/screens/SeleccionCarteraScreen.test.tsx`
- [x] Bloque 4 (Fase 2b): quitar el **botón atrás** de todas las vistas y habilitar **swipe izquierda→derecha** para volver.
  - `HeaderApp` ya no renderiza back; se quitaron los `onVolver` de TrayectoDiario/Clientes/Notificaciones/Perfil/Configuración.
  - Perfil/Configuración/Notificaciones se envuelven en `VentanaCerrarConSwipe` (`animarSalida={false}`) → `navigation.goBack()`.
  - Test(s): `src/components/HeaderApp.test.tsx`

## Decisiones

- Los ítems principales se registran vía `itemsExtra` (existente), extendido con `subItems`.
- "Modo oscuro" se agrega al submenú del usuario en la Fase 4 (con el tema); por ahora Perfil/Configuración/Cerrar sesión.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar:
  - `npx jest src/components/MenuLateral.test.tsx src/navigation/CarteraFlujo.test.tsx src/screens/SeleccionCarteraScreen.test.tsx` → 23 tests.
  - `bash scripts/check.sh` → lint 0 errores, typecheck OK, **58 suites / 433 tests** en verde.
- Archivos modificados:
  - `src/navigation/menu-lateral-context.tsx` — `MenuItem.subItems` (ítems desplegables); `onPress` opcional.
  - `src/components/MenuLateral.tsx` — ítems desplegables + **tarjeta avatar+usuario** al fondo con submenú (Perfil/Configuración/Cerrar sesión); se quitaron los globales (Carteras/Perfil/Configuración) y el logout suelto.
  - `src/session/cartera-activa-context.tsx` — helper compartido `aCarteraActiva`.
  - `src/navigation/CarteraFlujo.tsx` — ítems Inicio/Carteras(>1, submenú)/Clientes(submenú filtros)/Diario; carga `misCarteras`.
  - `src/screens/SeleccionCarteraScreen.tsx` — registra Inicio + Carteras(>1); usa el helper compartido.
  - `src/components/HeaderApp.tsx` — sin botón atrás (se quitó `onVolver`).
  - `src/screens/{TrayectoDiarioScreen,ClientesScreen,NotificacionesScreen,PerfilScreen,ConfiguracionScreen}.tsx` — sin `onVolver`; Perfil/Configuración/Notificaciones con swipe-back (`VentanaCerrarConSwipe`).
  - Tests: `MenuLateral.test.tsx`, `CarteraFlujo.test.tsx`, `HeaderApp.test.tsx`.
  - `docs/ai/tasks/apk-menu.md` — esta tarea.
- Pendientes/seguimiento: **Fase 3** (breadcrumb `Inicio / Sección` + filtros en la vista de clientes); **Fase 4** (modo oscuro, incluye el ítem "Modo oscuro" en el submenú de usuario). El swipe-back en las secciones de cartera (Diario/Clientes) no se añadió para no chocar con gestos internos (mapas/tablas); la navegación va por el menú.
