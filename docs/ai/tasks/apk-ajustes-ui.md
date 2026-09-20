---
estado: completada
tags: [tarea]
---

# Tarea: Ajustes de header, menú, filtros y safe area

- **Origen:** Petición directa del usuario (2026-09-19) tras probar la app.
- **Estado:** completada
- **Fecha inicio:** 2026-09-19

## Objetivo

Ajustar el header (sin avatar, acciones en outline), el menú (colores de cartera, submenú de usuario hacia arriba, divisor bajo Inicio), la vista de Clientes (breadcrumb arriba + filtros como tabs) y respetar la barra de navegación del teléfono.

## Cambios

- **Header** (`HeaderApp`): orden `[☰] [título] [🔔] [acciones]`; se **quita el avatar**; las acciones pasan a **outline** (`estilosHeader.accionPill`: borde claro, fondo transparente, texto claro).
- **Menú** (`MenuLateral`):
  - En **Carteras**: **punto verde** (activa) / **rojo** (inactiva) por cartera (`MenuItem.color`).
  - El submenú de la **tarjeta de usuario** se abre **hacia arriba** (encima de la tarjeta).
  - **Divisor debajo de "Inicio"**.
- **Clientes** (`ClientesScreen`): **breadcrumb arriba** y **filtros como tabs** (`Todos / Al día / En mora / Sin préstamos`).
- **Safe area**: borde **inferior** en las `SafeAreaView` de todas las pantallas (`edges=[..., "bottom"]`).

## Resultado

- Verificación: `bash scripts/check.sh` → lint 0 errores, typecheck OK, **59 suites / 435 tests**.
- Archivos: `HeaderApp.tsx`, `HeaderPantalla.tsx`, `MenuLateral.tsx`, `menu-lateral-context.tsx`, `CarteraFlujo.tsx`, `ClientesScreen.tsx`, `SeleccionCarteraScreen.tsx`, `CarteraDetalleScreen.tsx`, `PerfilScreen.tsx`, y `edges` bottom en TrayectoDiario/Notificaciones/Cliente/Perfil/Configuracion/SeleccionCartera/CarteraDetalle/TrayectosLista.
- Build/instalación: APK local (EAS en la nube sin cuota).
