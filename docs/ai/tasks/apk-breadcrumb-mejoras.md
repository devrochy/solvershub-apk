---
estado: completada
tags: [tarea]
---

# Tarea: Mejoras del breadcrumb (visual + consistencia + accesibilidad)

- **Origen:** Petición directa del usuario (2026-09-22) sobre el breadcrumb de `apk-breadcrumb.md` (Fase 3).
- **Estado:** completada (pendiente commit + PR).
- **Fecha inicio:** 2026-09-22

## Objetivo

Pulir el breadcrumb existente en tres ejes:

1. **Visual**: banda fina bajo el header con ícono de casa en "Inicio", sección actual en
   tipografía fuerte, sin subrayado, chevron tenue y truncado de etiquetas largas.
2. **Consistencia / refactor**: API declarativa `<Breadcrumb seccion="Clientes" />` que antepone
   "Inicio" y centraliza la navegación a `Main`, eliminando el `items` repetido en cada pantalla.
3. **Accesibilidad**: `accessibilityRole="link"` + label "Ir a Inicio", target táctil de 44pt y
   separadores ocultos al lector de pantalla.

## Fuera de alcance

- Breadcrumb en vistas nivel 3+ (Cliente, Préstamo): no se pidió profundidad de navegación.
- Cambios de navegación (rutas/stack).

## Bloques (TDD)

- [x] Bloque 1: test del componente en la nueva API (`src/components/Breadcrumb.test.tsx`):
      render Inicio/Sección, navegación a `Main`, normalización de acentos en testID, a11y y
      sección actual no enlazable. (Red → Green).
- [x] Bloque 2: reescribir `Breadcrumb.tsx` (API `seccion`, estilo de banda + ícono, a11y).
- [x] Bloque 3: migrar las 5 pantallas a `<Breadcrumb seccion="…" />` y limpiar imports/variables
      `navigation` que quedaron sin uso en `ClientesScreen` y `TrayectoDiarioScreen`.

## Decisiones

- Se elimina `BreadcrumbItem[]` y el prop `items`; `Breadcrumb` usa `useNavigation` internamente.
- `slugSeccion()` normaliza la etiqueta (sin acentos) para el `testID` (p. ej. `breadcrumb-configuracion`).
- Fondo de la banda = `colores.tarjeta` (contrasta con el `fondo` del contenido y con el header navy);
  borde inferior de `StyleSheet.hairlineWidth`.

## Resultado final

- Comandos: `bash scripts/check.sh` → lint 0 errores, typecheck OK, **63 suites / 472 tests**.
- Archivos modificados:
  - `src/components/Breadcrumb.tsx` — nueva API + estilo + a11y.
  - `src/components/Breadcrumb.test.tsx` — nuevo (5 tests).
  - `src/screens/ClientesScreen.tsx`, `TrayectoDiarioScreen.tsx`, `PerfilScreen.tsx`,
    `ConfiguracionScreen.tsx`, `NotificacionesScreen.tsx` — migración a `seccion`.
  - `docs/ai/tasks/apk-breadcrumb-mejoras.md` — esta tarea.
- Pendientes/seguimiento: commit + PR a `develop` (rama `feature/apk-breadcrumb-mejoras`).
