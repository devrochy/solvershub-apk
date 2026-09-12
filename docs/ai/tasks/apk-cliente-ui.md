---
estado: completada
tags: [tarea]
---

# apk-cliente-ui

- **Rama:** `feature/apk-cliente-ui` (desde `develop`)
- **Estado:** completada
- **Origen:** prueba de skills de UI (`building-native-ui` + `anti-ui-slop`) — opción B.

## Objetivo
Modernizar las tarjetas de `ClienteScreen` (cédula/pasaporte y detalle de
préstamo) siguiendo HIG: reemplazar shadow/elevation legacy por `boxShadow` y
esquinas continuas (`borderCurve`). Sin cambios de comportamiento: testIDs y
flujos se preservan.

## Contrato de diseño
1. `tarjeta` (cédula) y `detallePrestamo`: `boxShadow` sutil en vez de
   `shadowColor/…/elevation`; `borderCurve: "continuous"`.

## Definición de Terminado
- Test nuevo que asegura `boxShadow` (y ausencia de shadow/elevation legacy) en
  la tarjeta cédula (Red→Green).
- `scripts/check.sh` verde.

## Resultado real
- `tarjeta` (cédula) y `detallePrestamo` usan `boxShadow` (sin shadow/elevation
  legacy) y `borderCurve: "continuous"`.
- Test nuevo asegura boxShadow moderno en la cédula (Red→Green); `check.sh`
  verde (299 tests).
