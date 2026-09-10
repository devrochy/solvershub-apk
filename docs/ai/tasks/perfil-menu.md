---
estado: completada
tags: [tarea]
---

# Tarea: perfil-menu — menú inferior (Perfil | Rutas | Configuración) + perfil

- **Origen:** Petición del usuario (menú inferior con perfil/rutas/configuración + editar perfil en la APK).
- **Estado:** completada
- **Fecha inicio:** 2026-09-10

## Objetivo
1. Nuevo menú inferior principal `Perfil | Rutas (centro) | Configuración`.
2. La lista de rutas pasa a ser la pestaña central; al elegir ruta se abre el flujo de ruta a pantalla completa.
3. Pantalla **Perfil** con datos del usuario y edición (nombre/apellido) vía modal ("Editar" en el header).
4. Pantalla **Configuración** (nombre + versión de la app).

## Fuera de alcance
- Teléfono/contraseña en el perfil (solo nombre/apellido).
- Logout (permanece en el header de la lista de rutas).

## Decisiones
- Navegación: `Stack: Login | Main (tabs) | Ruta (flujo full-screen)`. Se elimina el patrón "capa base + swipe" (`InicioCobrador`).
- Versión de la app vía `expo-constants`.
- Edición de perfil: modal (`ModalConFooter` + `CampoModal`), mismo flujo que otras vistas.
- `PATCH /perfil` es la dependencia backend (PR #106 de `app-cobranza`), ya consumida en la capa de datos.

## Bloques (checklist TDD)
- [x] Bloque 1: `PerfilScreen` muestra datos y edita vía modal.
  - Test(s): `src/screens/PerfilScreen.test.tsx` (4 tests)
- [x] Bloque 2: `ConfiguracionScreen` muestra app + versión.
  - Test(s): `src/screens/ConfiguracionScreen.test.tsx` (1 test)
- [x] Bloque 3: `CustomTabBarMain` (Perfil | Rutas central | Configuración).
  - Test(s): `src/components/CustomTabBarMain.test.tsx` (4 tests)
- [x] Bloque 4: `RutasScreen` abre el flujo de ruta; `RutaFlujo` monta tabs + overlays.
  - Test(s): `src/screens/RutasScreen.test.tsx`, `src/navigation/RutaFlujo.test.tsx`
- [x] Bloque 5: verificación final (`scripts/check.sh`).

## Resultado final
- Comandos: `scripts/check.sh` verde (50 suites, 359 tests; lint + typecheck OK).
- Nuevos: `src/screens/PerfilScreen.tsx`, `src/screens/ConfiguracionScreen.tsx`, `src/screens/RutasScreen.tsx`, `src/navigation/MainTabsNavigator.tsx`, `src/navigation/RutaFlujo.tsx`, `src/components/CustomTabBarMain.tsx` (+ tests).
- Modificados: `App.tsx` (registro Main/Ruta), `src/navigation/types.ts` (`MainTabParamList`, `Main`, `Ruta`), `src/screens/RutaDetalleScreen.tsx` (navega a `Main`), `package.json` (+`expo-constants`).
- Eliminado: `src/navigation/InicioCobrador.tsx` (+ test).
- Pendientes/seguimiento: revisión visual en dispositivo/emulador.
