---
estado: en progreso
tags: [tarea]
---

# Tarea: Modo oscuro (Fase 4)

- **Origen:** Petición directa del usuario (2026-09-19), Fase 4 del rediseño del APK.
- **Estado:** en progreso (infraestructura + toggle + shell; migración de pantallas pendiente)
- **Fecha inicio:** 2026-09-19

## Objetivo

Tema **claro/oscuro** con tokens propios, persistencia en el dispositivo y un toggle en el submenú de usuario; los colores de las pantallas se migran a los tokens del tema.

## Alcance

- **Infra:** `src/theme/theme.ts` (tokens `COLORES`) + `src/theme/theme-context.tsx` (`ThemeProvider`/`useTheme`, persistencia en AsyncStorage).
- **Toggle:** ítem **"Modo oscuro"/"Modo claro"** en el submenú de la tarjeta de usuario.
- **Migración:** los colores de las pantallas usan `colores` del tema en vez de literales.

## Bloques (TDD)

- [x] Bloque 1: `ThemeProvider` con `useTheme`, default claro y persistencia; toggle claro↔oscuro.
  - Test(s): `src/theme/theme-context.test.tsx`
- [x] Bloque 2: aplicar el tema al **shell**: `MenuLateral` (panel, ítems, tarjeta de usuario) y `HeaderPantalla` (banda), y el ítem de modo oscuro en el submenú.
  - Test(s): `src/components/MenuLateral.test.tsx` (sigue en verde)
- [ ] Bloque 3: migrar a tokens el resto de las pantallas/componentes (Login, Inicio/Seleccion, CarteraDetalle, TrayectoDiario, Clientes, Cliente, Perfil, Configuración, Notificaciones, overlays, modales).
  - **Pendiente** (trabajo mecánico: reemplazar literales `#f8fafc`/`#ffffff`/`#0f172a`/`#64748b`/`#e2e8f0`/`#172f6c` por `colores.*`).

## Decisiones

- Tokens mínimos: `fondo`, `tarjeta`, `texto`, `textoSuave`, `borde`, `primario`, `sobrePrimario`, `activoSuave`, `peligro`.
- La migración por pantalla se hace con estilos inline sobre los `StyleSheet` existentes (`[styles.x, { color: colores.texto }]`) para no reescribir cada `StyleSheet`.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint 0 errores, typecheck OK, **59 suites / 435 tests**.
- Archivos: `src/theme/theme.ts`, `src/theme/theme-context.tsx` (+ test), `App.tsx` (provider), `src/components/MenuLateral.tsx` (tema + toggle), `src/components/HeaderPantalla.tsx` (banda).
- Pendientes/seguimiento: **Bloque 3** (migrar el resto de pantallas). Hasta completarlo, el modo oscuro aplica al menú y al header; las pantallas conservan colores claros.
