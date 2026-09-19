---
estado: completada
tags: [tarea]
---

# Tarea: logo del login más compacto + ajuste de splash

- **Origen:** Petición directa del usuario (2026-09-18): "la APK quedó con el logo muy grande en el login; quiero reducirlo y ajustarlo a la pantalla con el formulario".
- **Estado:** completada
- **Fecha inicio:** 2026-09-18

## Objetivo

Que el logo del login se vea como una bandera compacta alineada con el formulario (sin el recuadro cuadrado con márgenes transparentes) y que el splash use el asset recortado con un ancho menor.

## Fuera de alcance

- Rediseñar el login o el splash (colores, tipografía, disposición).
- Cambiar el asset de marca (solo se recorta el padding transparente).
- Incluir el trabajo en vuelo de `feature/apk-header-menu-notificaciones`.

## Diagnóstico

- `assets/logo-gestor.png` es 1024×1024 pero el logo real (píxeles opacos) es 697×218 (~3.2:1) centrado con márgenes transparentes (top 377, bottom 430, left 164, right 164).
- `LoginScreen.tsx` forzaba `width:"40%"` + `aspectRatio:1` (cuadrado), reservando un recuadro cuadrado grande antes del formulario.
- El splash (`app.json`) usaba el mismo asset con `imageWidth:200`.

## Bloques

- [x] Bloque 1: recortar `assets/logo-gestor.png` al bbox del logo (con padding) preservando RGBA.
  - Verificación: dimensiones ~729×250 (bbox 697×218 + 16px de padding).
- [x] Bloque 2: `LoginScreen.tsx` `styles.logo` → `width:"55%"`, `aspectRatio:729/250`, `marginBottom:16`.
  - Test(s): `src/screens/LoginScreen.test.tsx` (existencia del logo; sin cambios).
- [x] Bloque 3: `app.json` splash `imageWidth:200 → 160`.
  - Verificación: `npx expo config --type public` resuelve el plugin.

## Decisiones tomadas durante la implementación

- Cambio de asset/estilo: exento de TDD por no tener comportamiento de runtime testeable (skill `tdd-workflow`). Se mantiene `scripts/check.sh` en verde.
- No se añaden los archivos de marca sueltos (`logo (1).png`, `*.jpeg`) al repo.

## Ambigüedades resueltas con el usuario

- Ancho del logo → **55%**.
- Splash → **recortar asset y bajar `imageWidth` a 160**.
- Build → **EAS cloud** (`--profile preview`, APK internal).
- Rama → **nueva desde develop**.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar:
  - `bash scripts/check.sh`: lint + typecheck OK; tests con el timeout por defecto (5 s) dieron 5 fallos por **timeout de la máquina** (backend+panel+Metro+colima corriendo); re-ejecutando `npm test -- --testTimeout=30000` → **59 suites / 429 tests en verde**.
  - `npx expo config --type public`: plugin `expo-splash-screen` resuelve `imageWidth:160` + `./assets/logo-gestor.png`.
- Archivos modificados: `assets/logo-gestor.png` (recortado 1024×1024 → 729×250), `src/screens/LoginScreen.tsx` (estilo logo), `app.json` (splash imageWidth), `docs/ai/tasks/apk-logo-splash.md`.
- Build: EAS `preview` (APK internal). `EXPO_PUBLIC_API_URL` de preview actualizado a `http://192.168.40.5:3000` (IP LAN actual; antes apuntaba a `.2`, muerta).
  - Build: https://expo.dev/accounts/devrochy/projects/app-cobranza-apk/builds/fb0d3bf0-1f53-47bd-bd9b-59bd1abf3271
  - APK directo: https://expo.dev/artifacts/eas/AL2jGI7hT9mD8y1sA1RC_sqjkCjbrfXgPi6AWOL63R0.apk
- Pendientes/seguimiento: verificación visual del splash/logo al instalar el APK en dispositivo.
