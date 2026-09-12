---
estado: completada
tags: [tarea]
---

# apk-tabbar-ui

- **Rama:** `feature/apk-tabbar-ui` (desde `develop`)
- **Estado:** completada
- **Origen:** prueba de skills de UI (`building-native-ui` + `anti-ui-slop`) — opción C.

## Objetivo
Modernizar el `CustomTabBar` (tab bar con FAB central "Día") siguiendo HIG:
reemplazar shadow/elevation legacy por `boxShadow`, esquinas continuas
(`borderCurve`), y sombra sutil en la barra en vez de borde duro. Sin cambios de
comportamiento: testIDs, navegación e insets se preservan.

## Contrato de diseño
1. FAB central: `boxShadow` con tinte azul en vez de `shadowColor/…/elevation`;
   `borderCurve: "continuous"`.
2. Barra: sombra superior sutil (`boxShadow`) en vez de `borderTop`.

## Definición de Terminado
- Test nuevo que asegura `boxShadow` (y ausencia de shadow/elevation legacy) en
  el FAB (Red→Green).
- `scripts/check.sh` verde.

## Resultado real
- FAB central y barra usan `boxShadow` (sin shadow/elevation legacy); FAB con
  `borderCurve: "continuous"` y tinte azul.
- Test nuevo asegura boxShadow moderno (Red→Green); `check.sh` verde (pendiente
  de confirmar CI).
