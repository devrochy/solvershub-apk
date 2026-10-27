# ADR-APP-07 — Kit de UI en `shared/ui`, panel con header + cajón lateral y campo de cobranza con sus vistas

- **Estado:** aceptado (enmendado el 2026-10-14, el 2026-10-19 y el 2026-10-27)
- **Fecha:** 2026-10-10
- **Contexto:** SPEC-29 (solvershub-docs), decisiones D-SPEC-29-5 y D-SPEC-29-6 (Diseño aprobado,
  D-32). HU-DS-09 (kit), HU-DS-10 (campo con el kit) y HU-DS-11 (shell del panel en la app).

> **Enmienda 2026-10-14 (D-34, solvershub-docs).** El dueño reemplazó D-SPEC-29-5: el panel dentro de
> la app ya no lleva 4 destinos + Más sino **header con hamburguesa y cajón lateral** con la misma
> lista agrupada que el sidebar del panel web (lo que ese panel hace por debajo de 768 px). Razones:
> paridad exacta con el panel, ~40 secciones que no caben en 4 destinos y cero dependencias nuevas
> (el cajón de campo ya era `Animated` + `Pressable`). Además, la app arranca en **tema oscuro**,
> como el panel web, campo incluido; D-SPEC-29-6 se mantiene para vistas y flujo del campo. La
> decisión 2 y la tabla de alternativas quedan reescritas abajo.

> **Enmienda 2026-10-19 (D-37, HU-UX-11).** El panel web pasa al menú v2 (SPEC-12): de ~40 entradas a
> 11, agrupadas por tarea, con las antiguas hermanas como pestañas. El cajón lo sigue: `menu-panel.ts`
> declara grupos → **entradas** → pestañas (cada pestaña con `modulo`, `pestana` y `seccion`). La
> entrada se ve con permiso en al menos una pestaña, abre la primera permitida y lleva el candado del
> pack. Los módulos de la app (`ModuloPanel`, `ORDEN_MODULOS`) **no cambian**: varias entradas pueden
> compartir módulo (Equipo y Configuración) y una entrada puede abarcar dos (Configuración → Mensajes
> fallidos vive en `herramientas`); el header toma el nombre de la entrada. «Herramientas» deja de
> ser un grupo del cajón y la Búsqueda pasa a la lupa del header.

> **Enmienda 2026-10-27 (cajón v2 y perfil propio).** El cajón arranca con los grupos plegados, abre
> y desplaza al grupo del destino activo, estrena el logo horizontal de SolversHub y deja fija al pie
> una tarjeta de cuenta (avatar, nombre y correo) con Perfil, Tema oscuro y Cerrar sesión. El toggle de
> tema sale del header. Perfil deja de ser un modal y pasa a ser una ruta real del panel: un
> `@react-navigation/stack` envuelve las pestañas (`Panel` → `Perfil`) para que el gesto de volver siga
> el dedo y conserve la pestaña anterior. Esto **rompe la regla de “sin dependencias nuevas”** para
> esta función: entran `react-native-gesture-handler` y `@react-native-masked-view/masked-view`
> (nativos) y `@react-navigation/stack` (JS). Cambia el `runtimeVersion` por fingerprint: **requiere
> una build nueva del APK**; el APK preview anterior no recibe esta función por OTA.

## Contexto

La app repite estilos en cada pantalla: 48 archivos con colores sueltos y 58 hojas de estilo
propias. Los componentes que podrían reutilizarse (`Avatar`, `ColorBadge`, `ModalConFooter`,
`CampoModal`, `BannerMensaje`) viven en `modules/cobranza/components`, así que ningún otro módulo
puede usarlos sin romper las fronteras de ADR-APP-01. El panel web tiene su kit en
`components/ui` y la marca ya entrega los tokens v1.4 a la app (`src/core/theme/tokens.ts`,
HU-DS-01): estados por tema, densidad, motion y escala tipográfica.

Además, el shell del panel en la app usa hoy hasta 8 pestañas (etiquetas truncadas, blancos chicos)
y el campo de cobranza es el diferencial del producto: los gestores lo usan en la calle con memoria
muscular.

## Decisión

1. **Kit en `src/shared/ui`** (capa de plataforma, sin dominio). Mismos nombres, variantes y estados
   que el kit del panel, en inglés y en `PascalCase.tsx`: `Button`, `IconButton`, `Field`,
   `TextField`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Toast` (+ `ToastProvider` y
   `useToast`), `Sheet`, `ListItem`/`RecordRow`, `KpiTile`, `PageHeader` y `SyncStatus`. Se exporta
   todo desde `@shared/ui`.
   - Todo sale de los tokens. Los componentes leen `useKit()` (`shared/ui/tema.ts`), que mapea el
     tema activo de `ThemeProvider` a `shTheme.light|dark` y a unos pocos rellenos derivados
     (primario, peligro, ripple, esqueleto, tono `accent`). Es el único archivo del kit que toca
     `shColor`. Un test (`kit.test.ts`) rechaza hex, `rgba()`, `shColor` fuera del mapeo, Roboto e
     imports de módulos.
   - Reglas de la app: blanco táctil de 48 × 48 dp (`shDensity.controlLg`) en todo control; tipografía
     `shType` (Montserrat e Inter); rol, nombre y estado accesibles; el color nunca va solo (un
     `Badge` de estado sin ícono no compila); `maxFontSizeMultiplier` 1,6 solo en cifras densas;
     presión con `Pressable` y `android_ripple` del tema; motion con `shMotion` y 0 ms con "reducir
     movimiento" (`shared/ui/motion.ts`).
   - Sin dependencias nuevas: `Sheet` usa `Modal` y `PanResponder` de React Native (sin
     gesture-handler ni reanimated) y los íconos son `@expo/vector-icons`.
   - Pantalla **Catálogo** (`shared/ui/catalogo/CatalogoScreen.tsx`) con cada componente, variante y
     estado en el tema activo. Solo existe en builds de desarrollo: el shell la registra en "Más"
     detrás de `__DEV__`.
2. **D-34 · Panel en la app con header + cajón lateral** (reemplaza a D-SPEC-29-5). `PanelShell`
   monta un `HeaderPanel` (hamburguesa, título del módulo, negocio, toggle de tema) en la raíz de
   cada módulo y un `CajonPanel` (`Drawer` del kit) con la lista de `src/navigation/menu-panel.ts`:
   los mismos grupos y entradas que `nav.ts` del panel web (menú v2 desde la enmienda del 2026-10-19),
   filtrados por `MeResponse.permissions`; cada entrada abre su módulo en la primera pestaña permitida
   (`pestanaInicial` con nonce, `@shared/pestana-inicial`). Por debajo sigue un `Tab.Navigator`
   sin barra (montaje perezoso, estado por módulo y el `navRef` del bus de navegación). Sin
   `@react-navigation/drawer`: el cajón es el `Drawer` del kit. Desde la enmienda del 2026-10-27, ese
   `Tab.Navigator` vive dentro de un `@react-navigation/stack` para la ruta Perfil y el gesto de
   volver; esa enmienda sí agrega dependencias nativas y exige build nueva.
3. **D-SPEC-29-6 · El campo de cobranza conserva sus vistas**: cajón lateral, selección de cartera,
   inicio de la cartera, clientes con filtros, diario, ficha del cliente como overlay, préstamo,
   perfil, configuración y notificaciones mantienen flujo, rutas y lógica. HU-DS-10 solo cambia los
   componentes visuales por los del kit. Aplica también a la cobranza admin de la app y sus
   pestañas por sección.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Subir los componentes de `modules/cobranza/components` tal cual a `shared` | Traen dominio y estilos propios (colores sueltos, `urlArchivo` del backend en `Avatar`); el kit nuevo los reemplaza en HU-DS-10 sin mover pantallas ahora |
| Una librería de UI (React Native Paper, Tamagui, gluestack) | Otra fuente de estilos frente a los tokens de la marca y dependencias nuevas; el panel no la usa, así que se pierde la paridad de nombres |
| `react-native-reanimated` + `gesture-handler` para `Sheet` y `Toast` | Dependencias nativas nuevas para dos animaciones cortas; `Animated` y `PanResponder` alcanzan |
| Panel con 4 destinos + Más (D-SPEC-29-5 A, elegida el 2026-10-10) | Reemplazada por D-34: ~40 secciones no caben en 4 destinos y el dueño quiere la misma lista del panel web |
| `@react-navigation/drawer` para el cajón del panel | Arrastra gesture-handler + reanimated: cambia el fingerprint y no sale por OTA; `Drawer` del kit (`Animated` + `Pressable`) alcanza |
| `@react-navigation/stack` + `react-native-gesture-handler` para Perfil | **Aceptada el 2026-10-27** (enmienda): el dueño pidió que el swipe siga el dedo, no solo que dispare el back. Se asume el coste de una build nueva y del fingerprint; el cajón y el campo siguen sin depender de estas librerías |
| Rediseñar el campo con pestañas abajo (D-SPEC-29-6 B) | Rompe la memoria muscular de los gestores y arriesga regresiones en el diferencial |

## Consecuencias

**Positivas:** pantallas nuevas sin estilos propios; panel y app se ven como un producto; los
blancos táctiles, la accesibilidad y el contraste se resuelven una vez; cambiar la marca toca solo
`tokens.json`.

**Negativas / lo que aceptamos pagar:** durante HU-DS-10 conviven los componentes de cobranza y los
del kit; el `Sheet` sale sin animación de salida (el `Modal` se desmonta al cerrar) y el gesto de
cierre se toma solo desde el asa y el encabezado; mantener la paridad de nombres con el panel es
disciplina, no un paquete compartido.

**Qué haría que revisáramos esto:** si un paquete compartido entre repos (tokens + contratos de
componentes) se vuelve viable, o si las animaciones del kit necesitan seguir al dedo en todo el
recorrido (entonces se evalúa reanimated con un ADR).

## Impacto en el código

- `src/shared/ui/*` (kit, `tema.ts`, `motion.ts`, `icono.tsx`, tests al lado) y
  `src/shared/ui/catalogo/CatalogoScreen.tsx`.
- `src/navigation/PanelShell.tsx`, `HeaderPanel.tsx`, `CajonPanel.tsx`, `CuentaPanel.tsx`,
  `marca-panel.ts`, `menu-panel.ts`, `menu-panel-context.tsx`; `src/shared/ui/Drawer.tsx`,
  `NavGroup.tsx` y `CampoTelefono.tsx`; `@shared/pestana-inicial`. El Catálogo de UI va en el grupo
  «Desarrollo» del cajón, solo con `__DEV__`.
- Perfil propio: `src/modules/perfil/` (pantalla e imagen), `src/core/api/perfil-admin.ts`,
  `src/core/session/{types,admin-session-context}.ts(x)` y las rutas `Panel`/`Perfil` de
  `PanelShell`.
- HU-DS-10 migra las pantallas de campo al kit (mismas vistas); HU-DS-11 arma el shell con cajón
  (D-34); HU-DS-12 puede subir `motion.ts` a `src/core/theme/`.
