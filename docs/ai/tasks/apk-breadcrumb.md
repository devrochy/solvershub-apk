---
estado: completada
tags: [tarea]
---

# Tarea: Breadcrumb `Inicio / Sección` (Fase 3)

- **Origen:** Petición directa del usuario (2026-09-19), Fase 3 del rediseño del APK: breadcrumb debajo del header de cada vista.
- **Estado:** completada
- **Fecha inicio:** 2026-09-19

## Objetivo

Mostrar un **breadcrumb `Inicio / <Sección>`** debajo del header en las vistas de nivel 2+ (Diario, Clientes, Perfil, Configuración, Notificaciones). La vista **Inicio** (detalle de cartera) no lleva breadcrumb.

## Fuera de alcance

- Modo oscuro (Fase 4).
- Los filtros de clientes en la vista ya existen (`ClientesScreen` muestra los chips Al día / En mora / Sin préstamos).

## Bloques (TDD)

- [x] Bloque 1: estandarizar el breadcrumb a `Inicio / Sección` en las secciones de cartera.
  - Diario: `Inicio / Diario`. Clientes: `Inicio / Clientes`. Se quita el breadcrumb de la cartera (es Inicio).
- [x] Bloque 2: agregar breadcrumb en las vistas de nivel 2+ del stack: Perfil, Configuración, Notificaciones (`Inicio / <Sección>`).
  - Test(s): `src/screens/ClientesScreen.test.tsx` (breadcrumb Inicio/Clientes).

## Decisiones

- El ítem "Inicio" del breadcrumb navega a `Main` (el Inicio: detalle si 1 cartera, lista si >1).
- Tipado de `useNavigation` con `NativeStackNavigationProp<RootStackParamList>` en las vistas donde se agregó el breadcrumb.

## Resultado final

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint 0 errores, typecheck OK, **58 suites / 434 tests**.
- Archivos modificados:
  - `src/screens/CarteraDetalleScreen.tsx` — sin breadcrumb (es Inicio).
  - `src/screens/TrayectoDiarioScreen.tsx` — `Inicio / Diario`.
  - `src/screens/ClientesScreen.tsx` — `Inicio / Clientes`.
  - `src/screens/PerfilScreen.tsx`, `ConfiguracionScreen.tsx`, `NotificacionesScreen.tsx` — breadcrumb `Inicio / <Sección>`.
  - `src/screens/ClientesScreen.test.tsx` — test de breadcrumb.
  - `docs/ai/tasks/apk-breadcrumb.md` — esta tarea.
- Pendientes/seguimiento: Fase 4 (modo oscuro).
