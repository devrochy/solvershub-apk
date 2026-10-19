# DESIGN.md — App SolversHub

Reglas del sistema de diseño de la app (**v2**, SPEC-29). Toda pantalla nueva o migrada
debe cumplirlas. Es el mismo sistema del panel (`solvershub-panel/apps/panel-web/DESIGN.md`):
mismos tokens, mismos nombres y mismos estados, adaptados a una mano, al sol y a una
conexión intermitente. Decisiones: ADR-APP-07 (`docs/adr/`).

## Fuente de los tokens

`src/core/theme/tokens.ts` es **generado** desde `solvershub-panel/brand/tokens/tokens.json`
(DTCG v1.4) con `npm run tokens:sync`. No se edita a mano. Trae:

| Export | Para qué |
|---|---|
| `shTheme.{light,dark}` | Roles por tema: `bg`, `surface`, `text*`, `link`, `focus`, `statusSuccessFg/Bg/Border` (y `warning`, `danger`, `info`), `dataCat1…4`, `dataSingle`, `elev0…3` |
| `shType` | Escala tipográfica con la familia que ya trae el peso (`Montserrat_700Bold`, `Inter_400Regular`…) |
| `shSpace`, `shRadius`, `shDensity` | Espacios (base 4), radios y alturas de controles (`controlLg` = 48) |
| `shMotion` | Duraciones en ms y curvas `[x1, y1, x2, y2]` para `Easing.bezier` |

`COLORES` (`theme.ts`) son los roles históricos de la app sobre esos tokens; las pantallas
nuevas usan el kit.

## Kit de componentes

Todo lo reutilizable vive en `src/shared/ui` (HU-DS-09): `Button`, `IconButton`, `Field`,
`TextField`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Toast`, `Sheet`, `ListItem`/
`RecordRow`, `KpiTile`, `PageHeader`, `SyncStatus`, `Drawer` y `NavGroup`. El catálogo se ve
en builds de desarrollo desde el cajón del panel → «Desarrollo» → «Catálogo de UI». Antes de
crear un componente en un módulo,
revisa si ya existe en el kit; si se usa en 2 módulos o más, sube al kit.

## Color

- **Nunca un hex, `rgb()`/`rgba()` ni `shColor.*` fuera de `src/core/theme` y
  `src/shared/ui/tema.ts`.** Lo verifica `src/core/theme/colores-sueltos.test.ts` en el CI.
  La deuda que existía (44 archivos, 280 usos al 2026-10-11) está en
  `colores-pendientes.json`, que **solo puede bajar**: al migrar una pantalla, baja o borra
  su número.
- Texto e íconos de estado con `statusXFg`, nunca con `shColor.success/warning/danger`
  (como texto no cumplen AA en claro). Siempre con ícono o texto: el color nunca va solo.
- Identidades y series (canales, gráficos) con `dataCat1…4`, en orden fijo.

## Tipografía

`shType`: `hero` 28/34 · `h1` 22/28 · `block` 17/24 · `body` 16/24 · `dense` 14/20 ·
`label` 14/20 · `caption` 12/16. El cuerpo es de 16 (no 15 como en el panel) por
legibilidad bajo el sol. Nada de Roboto. Las cifras llevan `fontVariant: ["tabular-nums"]`.
Se respeta la fuente del sistema hasta 200 %; las cifras densas usan
`maxFontSizeMultiplier={1.6}`.

## Toque, gestos y seguridad de área

- Blancos táctiles de al menos 48 × 48 dp (`shDensity.controlLg`), con `hitSlop` si el
  ícono es más chico.
- La acción principal va abajo, en la zona del pulgar.
- Edge-to-edge: todo dentro de `SafeAreaView` o `useSafeAreaInsets`. Nada bajo la barra
  de estado.
- Back del sistema y cierre por gesto en overlays y sheets. Ninguna acción vive solo en
  una pulsación larga.

## Panel en la app (D-34)

Header con hamburguesa + cajón lateral (`src/navigation/HeaderPanel.tsx`, `CajonPanel.tsx`) con la
misma lista que el sidebar del panel web (menú v2, HU-UX-11), definida en `src/navigation/menu-panel.ts`:
grupos por tarea (Operación, Tu asistente, Negocio, Cuenta y Plataforma) con **una entrada por
tarea** y sus pestañas. Claves estables: el `id` de la entrada (`cajon-item-<id>`), `modulo`,
`pestana` y `seccion`; los labels son reemplazables. Una entrada se ve si el usuario puede ver al
menos una de sus pestañas, abre la primera permitida y, si es de un pack no habilitado, queda con
candado. Solo se mapean pantallas que existen en la app: una pestaña del panel web sin pantalla
aquí se omite. La pantalla muestra solo las pestañas de la entrada por la que se llegó (param
`entrada`, `usePestanasDeEntrada`): Equipo abre Configuración solo con Colaboradores y la barra se
esconde si queda una pestaña; las de otra pantalla (Configuración › Mensajes fallidos) se abren por
el bus de navegación. Una sección nueva se agrega como pestaña de su entrada y en la pantalla del
módulo con `usePestanasDeEntrada`. La Búsqueda se abre con la lupa del header, como en la topbar del panel. El tema arranca en oscuro en toda la app, como el panel web; el
toggle está en el header y en el cajón (y en el menú lateral del campo).

## Campo de cobranza (D-SPEC-29-6)

El flujo de campo **no cambia**: selección de cartera, Inicio, Clientes con sus filtros,
Diario, ficha del cliente como overlay con cierre por gesto, préstamo y menú lateral.
Migrar esas pantallas al kit (HU-DS-10) cambia componentes visuales, nunca rutas, pasos
ni lógica. Lo mismo vale para las pestañas de la cobranza admin.

## Motion

Duraciones de `shMotion` (100/150/200/250 ms). Con «Quitar animaciones» de Android
(`AccessibilityInfo.isReduceMotionEnabled`) todas las duraciones van a 0; el háptico se
mantiene. Solo se anima lo que cambia por una acción del usuario.

## Accesibilidad

- `accessibilityRole`, `accessibilityLabel` y `accessibilityState` en todo control.
  Íconos decorativos ocultos al lector.
- Errores con región viva; carga con `Skeleton` que conserva la forma.
- El estado de sincronización siempre visible en campo (`SyncStatus`).

## Gates

En el CI (`build-and-test`): `npm run lint` · `npm run typecheck` · `npm test`, que
incluye la guarda de colores sueltos, los tests de tokens (`tokens-v2.test.ts`) y los del
kit. En local, además: `node scripts/check-module-boundaries.mjs`.
