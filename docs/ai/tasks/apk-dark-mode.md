---
estado: completada
tags: [tarea]
---

# Tarea: Modo oscuro (Fase 4)

- **Origen:** Petición directa del usuario (2026-09-19), Fase 4 del rediseño del APK.
- **Estado:** completada
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
- [x] Bloque 3: migrar a tokens el resto de las pantallas/componentes (Login, Inicio/Seleccion, CarteraDetalle, TrayectoDiario, Clientes, Cliente, Prestamo, Perfil, Configuración, Notificaciones, y componentes: Breadcrumb, CargaError, CampoModal, ModalConFooter, EvidenciasModal, TrayectosLista, CampoTelefono, EvidenciaPicker, HeaderApp, Avatar, OverlayDetalle, TrayectosOverlayHost).
  - Test(s): `bash scripts/check.sh` (los tests siguen en verde; el tema por defecto es claro, así que las aserciones de color claro se mantienen).

## Decisiones

- Tokens: `fondo`, `tarjeta`, `texto`, `textoSuave`, `borde`, `primario`, `sobrePrimario`, **`acento`**, `activoSuave`, `peligro`. `acento` se usa para texto/íconos/enlaces que deben contrastar con el fondo (claro `#172f6c`, oscuro `#93c5fd`); `primario` para la banda del header/fondos de botón.
- Patrón por archivo: `const styles = useMemo(() => crearEstilos(colores), [colores]);` con `function crearEstilos(c: ColoresTema) { return StyleSheet.create({...}); }` (el JSX no cambia).
- Se conservan colores semánticos/de dominio (badges de color de riesgo, canvas de cuotas, WhatsApp verde, mapas, `rgba`).

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint 0 errores, typecheck OK, **59 suites / 435 tests**.
- Archivos:
  - `src/theme/theme.ts` (tokens, incl. `acento`), `src/theme/theme-context.tsx` (+ test), `App.tsx` (provider).
  - `src/components/MenuLateral.tsx` (tema + toggle "Modo oscuro/claro"), `src/components/HeaderPantalla.tsx` (banda), `src/components/Avatar.tsx`.
  - Pantallas y componentes migrados a tokens (patrón `crearEstilos`), ver Bloque 3.
- Pendientes/seguimiento: ninguno funcional. Quedan literales **semánticos** intencionales (badges, canvas, WhatsApp, pill blanca del header, mapas).
