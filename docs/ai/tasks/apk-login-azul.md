---
estado: terminado
tags: [tarea]
---

# Tarea: apk-login-azul

- **Origen:** petición del usuario (2026-09-10): rediseñar el fondo de la
  pantalla de login con el azul principal y ajustar los botones/controles para
  que sean acordes.
- **Estado:** terminado.
- **Fecha inicio:** 2026-09-10

## Objetivo
Fondo del login en azul principal (`#172f6c`) con los controles adaptados para
buen contraste sobre azul: inputs blancos, roles invertidos (activo blanco con
texto navy) y botón "Entrar" en blanco hueso (`#f7f4ec`) con texto navy.

## Decisiones del usuario
- Logo: se mantiene directamente sobre el azul (sin tarjeta).
- Botón "Entrar": blanco hueso (`#f7f4ec`) con texto navy.
- Inputs: fondo blanco sólido.

## Bloques (checklist TDD)
- [x] Bloque 1: `LoginScreen` con fondo `#172f6c`, inputs blancos (borde
      `#dbeafe`, texto `#334155`, placeholder `#94a3b8`), roles blanco/navy,
      error `#fecaca` y botón blanco hueso con texto navy.
- [x] Bloque 2: `App.tsx` — `StatusBar` siempre `"light"` (login y headers azules).
- [x] Bloque 3: logo en un recuadro (`logoMarco`) con sombra
      (`boxShadow: "0 8px 24px rgba(0,0,0,0.35)"`), esquinas redondeadas
      (`borderRadius: 24` + `borderCurve: "continuous"`) y `overflow: "hidden"`.

## Resultado final
- `bash scripts/check.sh` → verde (lint + typecheck + tests).
- Archivos: `src/screens/LoginScreen.tsx`, `App.tsx`.
- Pendiente: validación visual en dispositivo (Expo Go).
