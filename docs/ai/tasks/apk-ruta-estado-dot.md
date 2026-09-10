---
estado: terminado
tags: [tarea]
---

# Tarea: apk-ruta-estado-dot

- **Origen:** petición del usuario (2026-09-10): en la lista de rutas, atenuar
  (pastel) el color del header de cada tarjeta y añadir a su izquierda un círculo
  del color pleno que titile (parpadee) para indicar el estado de la ruta.
- **Estado:** terminado.
- **Fecha inicio:** 2026-09-10

## Objetivo
- Header de la tarjeta de ruta en **pastel** (verde/rojo) en vez del color pleno.
- **Punto titilante** (parpadeo de opacidad en bucle) a la izquierda del header,
  con el **color pleno** del estado, tanto en rutas activas como inactivas.
- **Borde** de la tarjeta también atenuado a pastel.

## Decisiones del usuario
- Parpadeo on/off (no pulso suave).
- Borde también pastel.
- El punto titila en **ambos** estados (activa e inactiva), siempre.

## Bloques (checklist TDD)
- [x] Bloque 1: `ColorBadge` con prop opcional `animar` (parpadeo de opacidad en
      bucle con `Animated.loop`) + helper `bordeDeEstado` (pastel 200). Test:
      `src/components/ColorBadge.test.tsx` (2 → 4 tests).
- [x] Bloque 2: `SeleccionRutaScreen` — header pastel + punto titilante +
      borde pastel (`ruta-header-<id>`). Tests: `SeleccionRutaScreen.test.tsx`
      (asserts de header pastel verde/rojo y del punto).

## Resultado final
- `bash scripts/check.sh` → verde (lint + typecheck + tests).
- Archivos: `src/components/ColorBadge.tsx` (+test),
  `src/screens/SeleccionRutaScreen.tsx` (+test).
- Pendiente: validación visual en dispositivo (Expo Go).
