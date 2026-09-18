---
estado: en progreso
tags: [tarea]
---

# Tarea: apk-splash-login-menu

- **Origen:** Petición directa del usuario (2026-09-17).
- **Estado:** en progreso
- **Fecha inicio:** 2026-09-17

## Objetivo
1. Splash: logo transparente sobre fondo azul corporativo, sin marco, ~50% del ancho.
2. Login: logo transparente más grande (~40%, sin marco); formulario siempre visible (el teclado no lo tapa); ojo para mostrar/ocultar la contraseña.
3. Tras login: menú lateral hamburguesa que aparece/desaparece.

## Fuera de alcance
- Cambiar la identidad de app en stores (`bundleIdentifier`/`package`/`scheme`).
- Migrar la barra inferior existente a drawer de React Navigation (se usa drawer custom con Animated).

## Decisiones (acordadas con el usuario)
- Logo transparente: `assets/logo (1).png` (1024×1024, con alfa).
- Menú lateral: drawer custom con `Animated` (sin dependencias nuevas).
- Splash: `expo-splash-screen`, fondo `#172f6c`, `imageWidth` 200dp (~50%), `resizeMode: contain`.

## Bloques (checklist TDD)
- [x] Bloque B: Login — logo transparente 40% sin marco + ojo de contraseña + teclado no solapa.
  - **Hecho:** `assets/logo-gestor.png` (copia limpia del transparente); logo `width:"40%"` sin marco; `KeyboardAvoidingView` (padding/height) + `ScrollView`; `password-toggle` (`visibility`/`visibility-off`) alterna `secureTextEntry`.
  - Test(s): `src/screens/LoginScreen.test.tsx` (6 tests).
- [x] Bloque C: Menú lateral hamburguesa — drawer Animated + contexto + botón en headers.
  - **Hecho:** `src/navigation/menu-lateral-context.tsx`, `src/components/MenuLateral.tsx` (slide-in + backdrop), `src/components/BotonMenu.tsx`; provider montado en `MainTabsNavigator`; botón en headers de Carteras/Perfil/Configuración; ítems Carteras/Perfil/Configuración + Cerrar sesión.
  - Test(s): `src/components/MenuLateral.test.tsx` (3 tests).
- [x] Bloque A: Splash — `expo-splash-screen` + `app.json`.
  - **Hecho:** `expo install expo-splash-screen`; plugin `{ backgroundColor:"#172f6c", image:"./assets/logo-gestor.png", imageWidth:200, resizeMode:"contain" }`. Resuelto con `expo config`.
  - Test(s): n/a (config); verificado con `npx expo config --type public`.

## Resultado final
- Comandos ejecutados para verificar: `bash scripts/check.sh` → OK (59 suites / 429 tests; lint 0 errores, 80 warnings preexistentes; typecheck OK); `npx expo config --type public` resuelve el splash.
- Archivos nuevos: `src/navigation/menu-lateral-context.tsx`, `src/components/MenuLateral.tsx` (+test), `src/components/BotonMenu.tsx`, `assets/logo-gestor.png`, `docs/ai/tasks/apk-splash-login-menu.md`.
- Archivos modificados: `src/screens/LoginScreen.tsx` (+test), `src/navigation/MainTabsNavigator.tsx`, `src/screens/SeleccionCarteraScreen.tsx`, `src/screens/PerfilScreen.tsx`, `src/screens/ConfiguracionScreen.tsx`, `app.json`, `package.json`/`package-lock.json` (+`expo-splash-screen`).
- Pendientes/seguimiento: el splash personalizado solo se ve en build nativa/dev-build (en Expo Go se ignora); verificación visual en dispositivo/emulador pendiente.
