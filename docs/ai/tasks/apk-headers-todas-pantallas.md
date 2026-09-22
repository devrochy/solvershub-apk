---
estado: completada
tags: [tarea]
---

# Tarea: Estandarizar `HeaderApp` en todas las pantallas

- **Origen:** Petición directa del usuario (2026-09-22): "veo que en detalles del cliente no se respeta [el header]; validar que en todos los pages se invoque el componente header".
  Segunda iteración sobre el estándar de headers (el canon de tokens quedó en `apk-headers-estandar.md`, PR #36).
- **Estado:** completada (pendiente commit + PR).
- **Fecha inicio:** 2026-09-22

## Objetivo

Que **toda pantalla autenticada** invoque `HeaderApp` (hamburguesa + campana + título/subtítulo + acciones) en vez de
armar su propia banda, y dejar un test-guard que lo vigile.

## Auditoría previa

- Ya usaban `HeaderApp`: `SeleccionCarteraScreen`, `CarteraDetalleScreen`, `ClientesScreen`, `TrayectoDiarioScreen`,
  `PerfilScreen`, `ConfiguracionScreen`, `NotificacionesScreen`.
- No lo usaban: `ClienteScreen` (header propio `header-cliente` sin hamburguesa/campana), `PrestamoScreen` (sin header),
  `TrayectosLista` (usaba `HeaderPantalla` directo). `LoginScreen` es la excepción de diseño (previa a la sesión).

## Fuera de alcance

- Añadir botón atrás/cerrar: se mantiene la convención de la APK "navegación por menú + swipe", sin botón atrás.
- Cambios visuales al componente `HeaderApp`.

## Bloques (TDD)

- [x] Bloque 1: test-guard `src/screens/header-estandar.test.ts` (Red → Green):
      toda pantalla (salvo `LoginScreen`) contiene `<HeaderApp` y ninguna renderiza `<HeaderPantalla`.
- [x] Bloque 2: migrar `ClienteScreen` a `<HeaderApp titulo="Información del cliente" />` (quita `HeaderPantalla`/`estilosHeader`).
- [x] Bloque 3: migrar `PrestamoScreen` (SafeAreaView + `HeaderApp` con título "Estado de cuenta" y subtítulo `Préstamo #<id>`).
- [x] Bloque 4: migrar `TrayectosLista` a `HeaderApp` (título "Trayectos del día" + subtítulo con el resumen).

## Decisiones

- Se usa `HeaderApp` completo (hamburguesa + campana) también en overlays de detalle, por consistencia.
- El guard es un test de fuente (lee `src/screens/*.tsx`) para detectar regresiones sin montar cada pantalla.

## Resultado final

- Comandos: `bash scripts/check.sh` → lint 0 errores, typecheck OK, **64 suites / 475 tests**.
- Archivos modificados:
  - `src/screens/header-estandar.test.ts` — nuevo guard.
  - `src/screens/ClienteScreen.tsx` — `HeaderApp`; `src/screens/ClienteScreen.test.tsx` — test de header estándar.
  - `src/screens/PrestamoScreen.tsx` — SafeAreaView + `HeaderApp`.
  - `src/components/TrayectosLista.tsx` — `HeaderApp`; `src/components/TrayectosLista.test.tsx` — test de header estándar.
  - `docs/ai/tasks/apk-headers-todas-pantallas.md` — esta tarea.
- Pendientes/seguimiento: commit + PR a `develop` (rama `feature/apk-headers-todas-pantallas`).
