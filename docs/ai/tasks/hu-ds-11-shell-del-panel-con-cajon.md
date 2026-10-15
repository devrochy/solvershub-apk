---
estado: en-curso
tags: [diseno, navegacion, panel, tema, accesibilidad]
---

# HU-DS-11 · Shell del panel en la app con header y cajón lateral

- **Origen:** SPEC-29 de `solvershub-docs` (Diseño aprobado, D-32), HU-DS-11 reescrita con la decisión
  **D-34** del dueño (2026-10-14): el panel dentro de la app navega con **header + hamburguesa + cajón
  lateral** con la misma lista agrupada que el sidebar del panel web, y la app arranca en **tema
  oscuro** como el panel web. D-34 reemplaza a D-SPEC-29-5 (4 destinos + Más). PRs apk #156 (tema),
  #157 (`Drawer` al kit) y el de esta tarea. Base: `develop` con el kit (HU-DS-09) y el campo con el
  kit (HU-DS-10, #155).
- **Regla que manda:** D-34 para el panel en la app; D-SPEC-29-6 sigue para el campo (mismas vistas,
  flujo y rutas; solo arranca en oscuro). Sin dependencias nativas nuevas: todo sale por EAS Update
  con el runtime actual.
- **Estado:** completado en código. Faltan el smoke en el OPPO (campo en oscuro y panel con el
  cajón), las capturas claro/oscuro y la OTA gradual; y el PR de docs con D-34, HU-DS-11 reescrita y
  HU-DS-13 (Resumen móvil por rol, tras HU-DS-07).

## Qué se hizo

1. **Tema oscuro por defecto en toda la app** (#156): `ThemeProvider` arranca en `oscuro`; al hidratar
   respeta la preferencia guardada en `cobranza_tema` y no escribe nada. Nuevos roles
   `sobrePrimarioSuave` y `exito` en `ColoresTema`. Login, Invitaciones, Selección de negocio y
   Vincular dispositivo pasan a tokens y al relleno primario del kit en los botones (con
   `colores.primario` quedaban navy sobre navy en oscuro). Se borró `LoginScreen` (login legado
   huérfano). `colores-pendientes.json`: de 19/67 a 12/41 (todo lo que queda son pantallas del panel).
2. **`Drawer` en el kit** (#157): el cajón de campo (`Animated` + `Pressable`) sale de `MenuLateral`
   a `src/shared/ui/Drawer.tsx` (fondo que cierra, panel deslizante, área segura, «reducir
   movimiento», `cerrarConBack` opcional). `MenuLateral` lo usa sin cambiar ítems, testIDs ni sombra.
3. **`NavGroup`** (`src/shared/ui/NavGroup.tsx`): cabecera de grupo plegable de 48 dp con
   `accessibilityState.expanded`, chevron y candado para packs no habilitados.
4. **Datos del menú** (`src/navigation/menu-panel.ts`): `MENU_PANEL` con los grupos del sidebar web
   (Operación, Cobranza, Comercio, Calendario, Negocio, Configuración, Herramientas, Plataforma solo
   master, Desarrollo solo `__DEV__`) y cada sección con `modulo`, `pestana` interna real y `seccion`
   RBAC. Funciones puras: `gruposDeMenu`, `seccionesDeMenu`, `modulosVisibles`. Sin equivalente en la
   app (se omiten): Requisitos de Meta y Producción (viven en Conexiones › Meta), App de Meta,
   Embedded Signup, Pruebas.
5. **`HeaderPanel`**: hamburguesa (`panel-menu`), título del módulo (`panel-titulo`), nombre del
   negocio y toggle de tema (`panel-tema`, sol/luna como `theme-toggle.tsx` del panel). Reserva el
   área segura superior. Va en la raíz de cada módulo; en Operación y Cobranza admin reemplaza al
   header nativo de la raíz (`encabezadoRaiz` en sus navigators) y los detalles conservan el nativo
   con la flecha atrás.
6. **`CajonPanel`**: `Drawer` con los grupos (`NavGroup` + `ListItem`), packs plegados al arrancar,
   el grupo del destino activo siempre abierto, ítem activo resaltado; abajo la cuenta (negocio,
   correo, «Modo claro/oscuro», «Cerrar sesión», que cierra también la sesión de campo si existe).
   El botón atrás cierra el cajón.
7. **`PanelShell`** reescrito: `Tab.Navigator` sin barra (montaje perezoso, estado por módulo y el
   `navRef` del bus), un módulo por pantalla según permisos, `MenuPanelProvider`, `StatusBar` por
   tema y `EmptyState` «Sin secciones asignadas» cuando no hay módulos. `navegar({ modulo, pestana })`
   manda `pestanaInicial` con nonce; con stack propio, el `screen` anidado vuelve a la raíz.
8. **`usePestanaInicial`** (`@shared/pestana-inicial`): las 7 pantallas con pestañas (Operación,
   Cobranza admin, Comercio, Calendario, Negocio, Configuración, Herramientas) aceptan la prop
   `pestanaInicial` y se re-sincronizan con cada pedido nuevo (`n`), ignorando pestañas sin permiso.
9. **Bus de navegación** `{ tab, pestana? }` (compatible con los emisores de hoy). Búsqueda emite
   `DESTINO_POR_ENTIDAD` con pestaña y ya no hace `goBack()` (es un módulo del shell, no un stack).
10. **Se borra** `SeccionEnConstruccion` (inalcanzable) y desaparecen `MasNavigator`/`MasScreen` (la
    lista «Más» que no navegaba).
11. **Docs del repo:** ADR-APP-07 enmendado (D-34), ADR-APP-02 con el árbol real, `DESIGN.md`,
    `README.md`, `AGENTS.md`, la skill `ui-consistency` (ya no prescribe hex) y `backlog.md`.
12. **E2E:** `e2e/smoke-panel-dueno.yaml` con testIDs del header y del cajón, sin toques por posición
    ni deslizar la barra de Cobranza.

## Tests

- Nuevos: `Drawer.test.tsx` (3), `NavGroup.test.tsx` (2), `pestana-inicial.test.tsx` (3),
  `HeaderPanel.test.tsx` (3), `CajonPanel.test.tsx` (5), `menu-panel.test.ts` (7, reemplaza al
  anterior), `PanelShell.test.tsx` (9, reescrito), un caso «abre en la pestaña pedida» en las 7
  pantallas (+ «ignora pestaña sin permiso» en Cobranza admin), `BusquedaScreen.test.tsx`,
  `navegacion-evento.test.ts`, `theme-context.test.tsx` (3, reescrito).
- Gate del campo (D-SPEC-29-6): `MenuLateral.test.tsx` y `menu-campo.test.tsx` **sin tocar una
  aserción**.

## Resultado real

- `npm run lint` ✓ · `npm run typecheck` ✓ · `node scripts/check-module-boundaries.mjs`: OK.
- `npx jest`: **135 suites, 836 tests ✓** (base de `develop`: 130 suites, 805 tests).
- `src/core/api/schema.d.ts` sin tocar (`check.sh` se detiene en `api:types` por el desfase
  conocido frente al backend). Sin dependencias ni permisos nuevos.

## Pendientes (registrados)

- **Evidencia en el OPPO:** build local por Gradle + `adb install` (cupo de EAS agotado), `maestro
  test e2e/smoke-cobranza.yaml` (campo intacto, ahora en oscuro) y `maestro test
  e2e/smoke-panel-dueno.yaml`; capturas claro/oscuro del header, el cajón y una pantalla por módulo;
  verificar el contraste de las cifras del diario en oscuro (meta 7:1). Luego la OTA gradual
  10/50/100 (lleva también el #155 de DS-10).
- **Candado por pack** (`/admin/plugins`) a nivel shell, **resaltado de la pestaña real** y
  **pantallas del panel con el kit**: en `backlog.md`.
- **Resumen móvil por rol:** HU-DS-13 en docs, después de HU-DS-07.
- **TanStack Query** (ADR-APP-04 lo exige y no está instalado): se recomienda enmendar el ADR; lo
  decide el dueño con el PR de docs.
